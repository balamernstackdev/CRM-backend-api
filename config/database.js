const knex = require('knex');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

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

// Initialize schema and seed default data if missing
async function initializeDatabase() {
    try {
        // 1. Initialize Schema if missing
        const hasTable = await db.schema.hasTable('employees');

        if (!hasTable && config.db.client === 'better-sqlite3') {
            console.log('⚠️  Database tables missing. Initializing schema...');
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            let schema = fs.readFileSync(schemaPath, 'utf8');

            schema = schema.replace(/--.*$/gm, '');
            const statements = schema.split(';').filter(s => s.trim());

            for (const statement of statements) {
                await db.raw(statement);
            }
            console.log('✅ Schema initialized successfully');
        }

        // 2. Auto-seed default Admin if table is empty
        const employeeCount = await db('employees').count('* as count').first();
        if (employeeCount.count === 0) {
            console.log('🌱 Database empty. Seeding default Admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db('employees').insert({
                name: 'Admin',
                email: 'admin@company.com',
                mobile: '9999999999',
                password_hash: hashedPassword,
                role: 'Admin',
                status: 'Active'
            });
            console.log('✅ Default Admin created: admin@company.com / admin123');
        }
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
}

// Test connection and initialize
db.raw('SELECT 1')
    .then(async () => {
        console.log(`✅ Database connected (${config.db.client})`);
        await initializeDatabase();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });

module.exports = db;
