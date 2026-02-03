const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const config = require('../config/config');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const employee = await db('employees').where('email', email).first();

        if (!employee) {
            console.log(`Login failure: User not found (${email})`);
            return res.status(401).json({ success: false, message: 'Invalid credentials - User not found' });
        }

        if (employee.status !== 'Active') {
            return res.status(403).json({ success: false, message: 'Account is inactive' });
        }

        const isPasswordValid = await bcrypt.compare(password, employee.password_hash);

        if (!isPasswordValid) {
            console.log(`Login failure: Incorrect password for ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials - Password mismatch' });
        }

        const accessToken = jwt.sign(
            {
                employeeId: employee.employee_id,
                email: employee.email,
                role: employee.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiry }
        );

        const newRefreshToken = jwt.sign(
            { employeeId: employee.employee_id },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiry }
        );

        console.log('--- Auth Debug ---');
        console.log('Employee ID:', employee.employee_id);
        console.log('Email:', employee.email);
        console.log('Refresh Secret Length:', config.jwt.refreshSecret ? config.jwt.refreshSecret.length : 'MISSING');
        console.log('Token Generated:', newRefreshToken ? 'YES (length ' + newRefreshToken.length + ')' : 'NO (NULL)');
        console.log('------------------');

        await db('employees')
            .where('employee_id', employee.employee_id)
            .update({ last_login: new Date().toISOString() });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                user: {
                    employeeId: employee.employee_id,
                    name: employee.name,
                    email: employee.email,
                    role: employee.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh token required' });
        }

        console.log('Refresh token attempt with:', refreshToken ? (refreshToken.substring(0, 10) + '...') : 'NULL');
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
        console.log('Decoded refresh token:', decoded);

        const employee = await db('employees').where('employee_id', decoded.employeeId).first();

        if (!employee || employee.status !== 'Active') {
            return res.status(403).json({ success: false, message: 'Invalid or inactive account' });
        }

        const newAccessToken = jwt.sign(
            {
                employeeId: employee.employee_id,
                email: employee.email,
                role: employee.role
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiry }
        );

        res.json({
            success: true,
            data: { accessToken: newAccessToken }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
};

const getMe = async (req, res) => {
    try {
        const employee = await db('employees')
            .select('employee_id', 'name', 'email', 'mobile', 'role', 'status', 'created_date', 'last_login')
            .where('employee_id', req.user.employeeId)
            .first();

        if (!employee) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: employee });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user data' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const employee = await db('employees').where('employee_id', req.user.employeeId).first();

        const isCurrentValid = await bcrypt.compare(currentPassword, employee.password_hash);

        if (!isCurrentValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await db('employees')
            .where('employee_id', req.user.employeeId)
            .update({ password_hash: newPasswordHash });

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};

module.exports = {
    login,
    refreshToken,
    getMe,
    changePassword
};
