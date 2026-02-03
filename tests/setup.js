const { execSync } = require('child_process');
const path = require('path');
const db = require('../config/database');

// Initialize Schema immediately when this file is loaded
if (process.env.NODE_ENV === 'test') {
    try {
        console.log('Running Migrations for Test DB...');
        // Run knex migration (synchronously to ensure tables exist before tests start)
        execSync('npx knex migrate:latest --env test', {
            cwd: path.resolve(__dirname, '..'), // backend root
            stdio: 'inherit'
        });
        console.log('✅ Migrations Clean.');
    } catch (error) {
        console.error('❌ Failed to run test migrations:', error);
        throw error;
    }
}

afterAll(() => {
    // Close DB connection if needed
    if (db.open) {
        db.close();
    }
});


