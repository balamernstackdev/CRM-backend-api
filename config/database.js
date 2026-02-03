const knex = require('knex');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    client: config.db.client,
    connection: config.db.connection,
    useNullAsDefault: true,
    pool: {
        min: 2,
        max: 10
    }
};

const db = knex(dbConfig);

// Initialize schema if tables are missing (especially for SQLite on first run)
async function initializeSchema() {
    try {
        // Simple check for employees table
        const hasTable = await db.schema.hasTable('employees');

        if (!hasTable && config.db.client === 'better-sqlite3') {
            console.log('⚠️  Database tables missing. Initializing schema...');
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            let schema = fs.readFileSync(schemaPath, 'utf8');

            // Basic SQL splitter for SQLite (stripping comments and splitting by ;)
            schema = schema.replace(/--.*$/gm, '');
            const statements = schema.split(';').filter(s => s.trim());

            for (const statement of statements) {
                await db.raw(statement);
            }
            console.log('✅ Schema initialized successfully');
        }
    } catch (error) {
        console.error('❌ Schema initialization failed:', error.message);
    }
}

// Test connection and initialize
db.raw('SELECT 1')
    .then(async () => {
        console.log(`✅ Database connected (${config.db.client})`);
        await initializeSchema();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });

module.exports = db;
