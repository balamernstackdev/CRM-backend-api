const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

const getEmployees = async (req, res) => {
    try {
        const employees = await db('employees')
            .select('employee_id', 'name', 'mobile', 'email', 'role', 'status', 'created_at', 'last_login')
            .orderBy('created_at', 'desc');

        res.json({ success: true, data: employees });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employees' });
    }
};

const getEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await db('employees')
            .select('employee_id', 'name', 'mobile', 'email', 'role', 'status', 'created_at', 'last_login')
            .where('employee_id', id)
            .first();

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, data: employee });
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employee' });
    }
};

const createEmployee = async (req, res) => {
    try {
        const { name, mobile, email, password, role = 'Agent', status = 'Active' } = req.body;

        // Validate password is provided
        if (!password || password.trim().length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password is required and must be at least 6 characters'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [id] = await db('employees').insert({
            name,
            mobile,
            email,
            password_hash: passwordHash,
            role,
            status
        });

        // Handle id return depending on DB
        let employeeId = id;

        // If we didn't get an ID easily (some drivers), we might need to query by unique email
        let employee;
        if (employeeId) {
            employee = await db('employees')
                .select('employee_id', 'name', 'mobile', 'email', 'role', 'status', 'created_at')
                .where('employee_id', employeeId)
                .first();
        } else {
            employee = await db('employees')
                .select('employee_id', 'name', 'mobile', 'email', 'role', 'status', 'created_at')
                .where('email', email)
                .first();
        }

        res.status(201).json({
            success: true,
            message: 'Employee created successfully',
            data: employee
        });
    } catch (error) {
        console.error('Create employee error:', error);
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to create employee' });
    }
};

const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, mobile, email, role, status } = req.body;

        // Prevent admin from demoting themselves or deactivating their own account
        if (parseInt(id) === req.user.employeeId) {
            if (role && role !== 'Admin') {
                return res.status(400).json({ success: false, message: 'Cannot change your own role' });
            }
            if (status === 'Inactive') {
                return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
            }
        }

        const updatedRows = await db('employees')
            .where('employee_id', id)
            .update({
                name,
                mobile,
                email,
                role,
                status
            });

        if (updatedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        const employee = await db('employees')
            .select('employee_id', 'name', 'mobile', 'email', 'role', 'status', 'created_at', 'last_login')
            .where('employee_id', id)
            .first();

        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: employee
        });
    } catch (error) {
        console.error('Update employee error:', error);
        if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Failed to update employee' });
    }
};

const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (parseInt(id) === req.user.employeeId) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        // Check for related call logs
        const callLogCountResult = await db('call_logs').where('employee_id', id).count('* as count').first();
        const callLogCount = callLogCountResult.count || callLogCountResult['count(*)'] || 0;

        if (callLogCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete employee with ${callLogCount} call log(s). Set status to Inactive instead.`
            });
        }

        const deletedRows = await db('employees').where('employee_id', id).del();

        if (deletedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete employee' });
    }
};

const getPerformance = async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        const query = db('call_logs').where('employee_id', id);

        if (startDate) {
            query.where('call_datetime', '>=', startDate);
        }

        if (endDate) {
            query.where('call_datetime', '<=', endDate);
        }

        const calls = await query;

        const stats = {
            totalCalls: calls.length,
            byType: {
                incoming: calls.filter(c => c.call_type === 'Incoming').length,
                outgoing: calls.filter(c => c.call_type === 'Outgoing').length,
                incomingMissed: calls.filter(c => c.call_type === 'Incoming (Missed Call)').length,
                outgoingBusy: calls.filter(c => c.call_type === 'Outgoing (Busy)').length,
                outgoingUnreachable: calls.filter(c => c.call_type === 'Outgoing (Not Reachable)').length
            },
            byPriority: {
                emergency: calls.filter(c => c.priority === 'Emergency').length,
                important: calls.filter(c => c.priority === 'Important').length,
                manageable: calls.filter(c => c.priority === 'Manageable').length,
                appointments: calls.filter(c => c.priority === 'Appointments').length
            },
            byPurpose: {}
        };

        calls.forEach(call => {
            stats.byPurpose[call.call_purpose] = (stats.byPurpose[call.call_purpose] || 0) + 1;
        });

        // Calculate connected percentage (Incoming + Outgoing successful)
        const connectedCalls = stats.byType.incoming + stats.byType.outgoing;
        stats.connectedPercentage = stats.totalCalls > 0
            ? ((connectedCalls / stats.totalCalls) * 100).toFixed(2)
            : 0;

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch performance data' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword = 'temp123' } = req.body;

        const passwordHash = await bcrypt.hash(newPassword, 10);

        const updatedRows = await db('employees')
            .where('employee_id', id)
            .update({ password_hash: passwordHash });

        if (updatedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};

module.exports = {
    getEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getPerformance,
    resetPassword
};
