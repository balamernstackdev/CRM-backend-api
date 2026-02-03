const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, modifyLimiter } = require('./middleware/rate-limiter');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const employeeRoutes = require('./routes/employees');
const callLogRoutes = require('./routes/callLogs');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'CRM API is running' });
});

// Stricter rate limiting for authentication
app.use('/api/auth', authLimiter, authRoutes);

// Apply to all routes
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/call-logs', callLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.use(errorHandler);

// Export app for testing
module.exports = app;

// Only start server if run directly (not required by tests)
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`\n🚀 Server running on port ${config.port}`);
        console.log(`📊 Environment: ${config.nodeEnv}`);
        console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
        console.log(`🛡️  Rate limiting enabled\n`);
    });
}


