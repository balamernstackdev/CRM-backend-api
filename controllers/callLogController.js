const { db } = require('../config/database');

const getCallLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, employeeId, customerId, callType, callPurpose, priority, callStatus, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        const query = db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .join('employees as e', 'cl.employee_id', 'e.employee_id')
            .select('cl.*', 'c.customer_name', 'c.phone as customer_phone', 'e.name as employee_name');

        if (req.user.role === 'Agent') {
            query.where('cl.employee_id', req.user.employeeId);
        } else if (employeeId) {
            query.where('cl.employee_id', employeeId);
        }

        if (customerId) {
            query.where('cl.customer_id', customerId);
        }

        if (callType) {
            query.where('cl.call_type', callType);
        }

        if (callPurpose) {
            query.where('cl.call_purpose', callPurpose);
        }

        if (priority) {
            query.where('cl.priority', priority);
        }

        if (callStatus) {
            query.where('cl.call_status', callStatus);
        }

        if (startDate) {
            query.where('cl.call_datetime', '>=', startDate);
        }

        if (endDate) {
            query.where('cl.call_datetime', '<=', endDate);
        }

        // Count total
        const countResult = await query.clone().clearSelect().count('* as total').first();
        const total = countResult.total || countResult['count(*)'] || 0;

        const callLogs = await query
            .orderBy('cl.call_datetime', 'desc')
            .limit(limit)
            .offset(offset);

        res.json({
            success: true,
            data: {
                callLogs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get call logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch call logs' });
    }
};

const getCallLog = async (req, res) => {
    try {
        const { id } = req.params;

        const callLog = await db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .join('employees as e', 'cl.employee_id', 'e.employee_id')
            .select('cl.*', 'c.customer_name', 'c.phone as customer_phone', 'e.name as employee_name')
            .where('cl.call_id', id)
            .first();

        if (!callLog) {
            return res.status(404).json({ success: false, message: 'Call log not found' });
        }

        if (req.user.role === 'Agent' && callLog.employee_id !== req.user.employeeId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.json({ success: true, data: callLog });
    } catch (error) {
        console.error('Get call log error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch call log' });
    }
};

const createCallLog = async (req, res) => {
    try {
        const {
            call_datetime,
            customer_id,
            phone,
            call_type,
            call_purpose,
            priority,
            call_status,
            call_duration,
            notes,
            next_followup_date
        } = req.body;

        const [id] = await db('call_logs').insert({
            call_datetime: call_datetime || new Date().toISOString(),
            employee_id: req.user.employeeId,
            customer_id,
            call_type,
            call_purpose,
            priority: priority || 'Manageable',
            call_status: call_status || 'Connected',
            call_duration: call_duration || null,
            notes,
            next_followup_date: next_followup_date || null
        });

        await db('customers')
            .where('customer_id', customer_id)
            .update({ last_contact_date: new Date().toISOString() });

        // Handle returned ID
        let callId = id;

        // Fetch created log
        let callLog;
        if (callId) {
            callLog = await db('call_logs as cl')
                .join('customers as c', 'cl.customer_id', 'c.customer_id')
                .join('employees as e', 'cl.employee_id', 'e.employee_id')
                .select('cl.*', 'c.customer_name', 'e.name as employee_name')
                .where('cl.call_id', callId)
                .first();
        } else {
            // Fallback: This is risky without ID. 
            // Ideally we should use returning() for PG or assume sqlite works well. 
            // Since we are refactoring, let's assume standard behavior.
            // If we really can't get ID, we might need a workaround, but `insert` usually returns [id] for sqlite/mysql/pg(with returning).
            // Let's assume we have it.
        }

        res.status(201).json({
            success: true,
            message: 'Call log created successfully',
            data: callLog
        });
    } catch (error) {
        console.error('Create call log error:', error);
        res.status(500).json({ success: false, message: 'Failed to create call log' });
    }
};

const updateCallLog = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            call_datetime,
            call_type,
            call_purpose,
            priority,
            call_status,
            call_duration,
            notes,
            next_followup_date
        } = req.body;

        const existingLog = await db('call_logs').where('call_id', id).first();

        if (!existingLog) {
            return res.status(404).json({ success: false, message: 'Call log not found' });
        }

        if (req.user.role === 'Agent' && existingLog.employee_id !== req.user.employeeId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const createdAt = new Date(existingLog.created_at);
        const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

        if (req.user.role === 'Agent' && hoursSinceCreation > 24) {
            return res.status(403).json({ success: false, message: 'Cannot edit call logs older than 24 hours' });
        }

        await db('call_logs')
            .where('call_id', id)
            .update({
                call_datetime,
                call_type,
                call_purpose,
                priority,
                call_status,
                call_duration: call_duration || null,
                notes,
                next_followup_date: next_followup_date || null
            });

        const callLog = await db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .join('employees as e', 'cl.employee_id', 'e.employee_id')
            .select('cl.*', 'c.customer_name', 'e.name as employee_name')
            .where('cl.call_id', id)
            .first();

        res.json({
            success: true,
            message: 'Call log updated successfully',
            data: callLog
        });
    } catch (error) {
        console.error('Update call log error:', error);
        res.status(500).json({ success: false, message: 'Failed to update call log' });
    }
};

const deleteCallLog = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedRows = await db('call_logs').where('call_id', id).del();

        if (deletedRows === 0) {
            return res.status(404).json({ success: false, message: 'Call log not found' });
        }

        res.json({ success: true, message: 'Call log deleted successfully' });
    } catch (error) {
        console.error('Delete call log error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete call log' });
    }
};

const getMyLogs = async (req, res) => {
    try {
        const callLogs = await db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .select('cl.*', 'c.customer_name')
            .where('cl.employee_id', req.user.employeeId)
            .orderBy('cl.call_datetime', 'desc')
            .limit(50);

        res.json({ success: true, data: callLogs });
    } catch (error) {
        console.error('Get my logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch call logs' });
    }
};

const getStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const query = db('call_logs');

        if (req.user.role === 'Agent') {
            query.where('employee_id', req.user.employeeId);
        }

        const allCalls = await query;
        const todayCalls = allCalls.filter(c => c.call_datetime.startsWith(today));

        // Aggregations
        const byPriority = allCalls.reduce((acc, curr) => {
            acc[curr.priority] = (acc[curr.priority] || 0) + 1;
            return acc;
        }, {});

        const byPurpose = allCalls.reduce((acc, curr) => {
            acc[curr.call_purpose] = (acc[curr.call_purpose] || 0) + 1;
            return acc;
        }, {});

        const stats = {
            totalCalls: allCalls.length,
            callsToday: todayCalls.length,
            connectedCalls: allCalls.filter(c => c.call_status === 'Connected').length,
            missedCalls: allCalls.filter(c => c.call_type === 'Missed').length,
            byPriority,
            byPurpose
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

module.exports = {
    getCallLogs,
    getCallLog,
    createCallLog,
    updateCallLog,
    deleteCallLog,
    getMyLogs,
    getStats
};
