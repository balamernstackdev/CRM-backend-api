const dotenv = require('dotenv');
const path = require('path');

// Load appropriate .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        client: process.env.DB_CLIENT || 'better-sqlite3', // 'pg' or 'mysql2' for remote
        connection: (process.env.DB_CLIENT || 'better-sqlite3') === 'better-sqlite3'
            ? { filename: process.env.DB_PATH || './database/crm_database.db' }
            : {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                port: process.env.DB_PORT,
                ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
            }
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiry: process.env.JWT_EXPIRY || '15m',
        refreshSecret: process.env.REFRESH_TOKEN_SECRET,
        refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    rateLimit: {
        max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
        windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000
    },
    logLevel: process.env.LOG_LEVEL || 'info'
};
