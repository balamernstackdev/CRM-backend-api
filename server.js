const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const { db, initPromise } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, modifyLimiter } = require('./middleware/rate-limiter');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const employeeRoutes = require('./routes/employees');
const callLogRoutes = require('./routes/callLogs');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');

const app = express();

// Trust proxy for Render/Vercel (needed for accurate rate limiting)
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = config.frontendUrl ? config.frontendUrl.split(',') : [];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

app.get('/api/health', async (req, res) => {
    try {
        await db.raw('SELECT 1');
        const employeeCount = await db('employees').count('* as count').first();
        res.json({
            success: true,
            message: 'CRM API is running',
            db: {
                status: 'connected',
                client: config.db.client,
                initialized: employeeCount.count > 0,
                employeeCount: employeeCount.count
            },
            auth: {
                jwtSecretConfigured: !!config.jwt.secret && config.jwt.secret !== 'fallback_jwt_secret_key_123',
                refreshSecretConfigured: !!config.jwt.refreshSecret && config.jwt.refreshSecret !== 'fallback_refresh_token_secret_key_456'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'CRM API health check failed', error: err.message });
    }
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
    initPromise.then(() => {
        app.listen(config.port, () => {
            console.log(`\n🚀 Server running on port ${config.port}`);
            console.log(`📊 Environment: ${config.nodeEnv}`);
            console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
            console.log(`🛡️  Rate limiting enabled\n`);
        });
    }).catch(err => {
        console.error('💀 Failed to initialize database, server not started:', err.message);
        process.exit(1);
    });
}
