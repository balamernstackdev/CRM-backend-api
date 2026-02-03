const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config/config');

console.log('DEBUG: Starting Schema Validation');

try {
    const dbPath = path.resolve(__dirname, '..', config.dbPath);
    console.log('DB Path:', dbPath);
    const db = new Database(dbPath);

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log('Reading schema from:', schemaPath);
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema...');
    db.exec(schema);
    console.log('✅ Schema Executed Successfully!');

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables Created:', tables);

} catch (error) {
    console.error('❌ Schema Execution Failed:', error);
}
