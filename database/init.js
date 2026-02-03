const db = require('../config/database');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

try {
    db.exec(schema);
    console.log('✅ Database schema initialized successfully');
} catch (error) {
    console.error('❌ Error initializing schema:', error.message);
    throw error;
}

module.exports = db;
