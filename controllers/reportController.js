const db = require('../config/database');

const getEmployeePerformance = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;

        const query = db('call_logs');

        if (employeeId) {
            query.where('employee_id', employeeId);
        }

        if (startDate) {
            query.where('call_datetime', '>=', startDate);
        }

        if (endDate) {
            query.where('call_datetime', '<=', endDate);
        }

        const calls = await query;

        const stats = {
            totalCalls: calls.length,
            connectedCalls: calls.filter(c => c.call_status === 'Connected').length,
            notAnsweredCalls: calls.filter(c => c.call_status === 'Not Answered').length,
            missedCalls: calls.filter(c => c.call_type === 'Missed').length,
            byPurpose: {}
        };

        calls.forEach(call => {
            stats.byPurpose[call.call_purpose] = (stats.byPurpose[call.call_purpose] || 0) + 1;
        });

        stats.connectedPercentage = stats.totalCalls > 0
            ? ((stats.connectedCalls / stats.totalCalls) * 100).toFixed(2)
            : 0;

        stats.missedPercentage = stats.totalCalls > 0
            ? ((stats.missedCalls / stats.totalCalls) * 100).toFixed(2)
            : 0;

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Get employee performance error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

const getPurposeSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const query = db('call_logs')
            .select('call_purpose')
            .count('* as count');

        if (startDate) {
            query.where('call_datetime', '>=', startDate);
        }

        if (endDate) {
            query.where('call_datetime', '<=', endDate);
        }

        query.groupBy('call_purpose');

        const summary = await query;
        const total = summary.reduce((sum, item) => sum + (parseInt(item.count) || 0), 0);

        const data = summary.map(item => ({
            purpose: item.call_purpose,
            count: item.count,
            percentage: total > 0 ? ((item.count / total) * 100).toFixed(2) : 0
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('Get purpose summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

const getCallTrends = async (req, res) => {
    try {
        const { period = 'daily', startDate, endDate } = req.query;

        const query = db('call_logs');

        if (startDate) {
            query.where('call_datetime', '>=', startDate);
        }

        if (endDate) {
            query.where('call_datetime', '<=', endDate);
        }

        const calls = await query;

        // Perform aggregation in JS to avoid cross-db date incompatibility
        const grouped = {};

        calls.forEach(call => {
            const dateObj = new Date(call.call_datetime);
            let key;

            if (isNaN(dateObj.getTime())) return; // skip invalid dates

            if (period === 'monthly') {
                key = dateObj.toISOString().slice(0, 7); // YYYY-MM
            } else if (period === 'weekly') {
                // ISO Week calculation or just simple Week start
                // Simple approach: get Monday of the week
                const d = new Date(dateObj);
                const day = d.getDay(),
                    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(d.setDate(diff));
                key = monday.toISOString().slice(0, 10); // Week of YYYY-MM-DD
            } else {
                // daily
                key = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
            }

            grouped[key] = (grouped[key] || 0) + 1;
        });

        const trends = Object.keys(grouped).sort().map(key => ({
            period: key,
            count: grouped[key]
        }));

        res.json({ success: true, data: trends });
    } catch (error) {
        console.error('Get call trends error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

const getMissedCalls = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const query = db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .join('employees as e', 'cl.employee_id', 'e.employee_id')
            .select('cl.*', 'c.customer_name', 'c.phone', 'e.name as employee_name')
            .where('cl.call_type', 'Missed');

        if (startDate) {
            query.where('cl.call_datetime', '>=', startDate);
        }

        if (endDate) {
            query.where('cl.call_datetime', '<=', endDate);
        }

        query.orderBy('cl.call_datetime', 'desc');

        const missedCalls = await query;

        const unaddressed = missedCalls.filter(call => {
            const hoursSince = (Date.now() - new Date(call.call_datetime).getTime()) / (1000 * 60 * 60);
            return hoursSince > 48;
        });

        res.json({ success: true, data: { missedCalls, unaddressed } });
    } catch (error) {
        console.error('Get missed calls error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

const getPendingFollowups = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const weekStr = weekFromNow.toISOString().split('T')[0];

        const baseQuery = () => db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .join('employees as e', 'cl.employee_id', 'e.employee_id')
            .select('cl.*', 'c.customer_name', 'c.phone', 'e.name as employee_name')
            .orderBy('cl.next_followup_date', 'asc')
            .orderBy('cl.call_datetime', 'desc');

        const overdue = await baseQuery()
            .where('cl.next_followup_date', '<', today)
            .whereNotNull('cl.next_followup_date');

        const todayFollowups = await baseQuery()
            .where('cl.next_followup_date', '=', today);

        const tomorrowFollowups = await baseQuery()
            .where('cl.next_followup_date', '=', tomorrowStr);

        const thisWeek = await baseQuery()
            .where('cl.next_followup_date', '>', tomorrowStr)
            .where('cl.next_followup_date', '<=', weekStr);

        res.json({
            success: true,
            data: {
                overdue,
                today: todayFollowups,
                tomorrow: tomorrowFollowups,
                thisWeek
            }
        });
    } catch (error) {
        console.error('Get pending followups error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

const getCustomerEngagement = async (req, res) => {
    try {
        const thisMonth = new Date().toISOString().slice(0, 7);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

        // Top Contacted
        // Need to match partial date string for month - use JS filter or like query
        // "2023-10%"
        const topContacted = await db('call_logs as cl')
            .join('customers as c', 'cl.customer_id', 'c.customer_id')
            .select('c.customer_name', 'c.phone', 'c.portfolio')
            .count('* as call_count')
            .where('cl.call_datetime', 'like', `${thisMonth}%`)
            .groupBy('c.customer_id', 'c.customer_name', 'c.phone', 'c.portfolio')
            .orderBy('call_count', 'desc')
            .limit(20);

        // Inactive Customers
        const inactiveCustomers = await db('customers as c')
            .select('c.customer_id', 'c.customer_name', 'c.phone', 'c.portfolio', 'c.last_contact_date')
            .where('c.status', 'Active')
            .andWhere(builder => {
                builder.where('c.last_contact_date', '<', thirtyDaysAgoStr)
                    .orWhereNull('c.last_contact_date');
            })
            .orderBy('c.last_contact_date', 'desc');

        const statusDistribution = await db('customers')
            .select('status')
            .count('* as count')
            .groupBy('status');

        // Avg Calls Per Customer
        // Subquery: select count(*) from call_logs group by customer_id
        const subquery = db('call_logs')
            .select('customer_id')
            .count('* as call_count')
            .groupBy('customer_id')
            .as('counts');

        const avgCallsPerCustomerResult = await db.from(subquery).avg('call_count as avg').first();
        const avgCallsPerCustomer = avgCallsPerCustomerResult.avg ? parseFloat(avgCallsPerCustomerResult.avg).toFixed(2) : 0;

        res.json({
            success: true,
            data: {
                topContacted,
                inactiveCustomers,
                statusDistribution,
                avgCallsPerCustomer
            }
        });
    } catch (error) {
        console.error('Get customer engagement error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

module.exports = {
    getEmployeePerformance,
    getPurposeSummary,
    getCallTrends,
    getMissedCalls,
    getPendingFollowups,
    getCustomerEngagement
};
