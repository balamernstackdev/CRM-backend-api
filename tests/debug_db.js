const path = require('path');
const config = require('../config/config');

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Config DB Path:', config.dbPath);

const absPath = path.resolve(__dirname, '..', config.dbPath);
console.log('Absolute DB Path:', absPath);

try {
    const Database = require('better-sqlite3');
    const db = new Database(absPath);
    console.log('✅ Connection Successful!');
    console.log('Tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
} catch (error) {
    console.error('❌ Connection Failed:', error);
}
