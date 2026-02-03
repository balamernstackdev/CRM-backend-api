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

        if (!hasTable) {
            console.log('⚠️  Database tables missing. Initializing schema...');
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            let schema = fs.readFileSync(schemaPath, 'utf8');

            // Strip comments
            schema = schema.replace(/--.*$/gm, '');

            // Robust splitter that respects triggers (BEGIN...END blocks)
            // We split by semicolon followed by newline/eoa, which usually separates top-level statements
            const statements = schema.split(/;\s*$/m).filter(s => s.trim());

            for (const statement of statements) {
                try {
                    await db.raw(statement);
                } catch (sErr) {
                    console.warn(`Soft warning on schema statement: ${sErr.message}`);
                }
            }
            console.log('✅ Schema initialization attempted');
        }

        // 2. Auto-seed default Admin if table is empty
        const employeeCountRes = await db('employees').count('* as count').first();
        // Convert to Number as some clients (like pg) return count as a string
        const count = parseInt(employeeCountRes.count || employeeCountRes['count(*)'] || 0);

        if (count === 0) {
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
        } else {
            console.log(`ℹ️  Found ${count} employees in database.`);
        }
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
    }
}

// Export db and init status
const initPromise = db.raw('SELECT 1')
    .then(async () => {
        console.log(`✅ Database connected (${config.db.client})`);
        await initializeDatabase();
        return true;
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
        throw err;
    });

module.exports = {
    db,
    initPromise
};
