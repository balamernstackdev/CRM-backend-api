const config = require('./config/config');
const knex = require('knex');

console.log('--- Config Debug ---');
console.log('DB Client:', config.db.client);
console.log('DB Connection:', JSON.stringify(config.db.connection, null, 2));

try {
    const dbConfig = {
        client: config.db.client,
        connection: config.db.connection,
        useNullAsDefault: true
    };

    const db = knex(dbConfig);
    console.log('--- Attempting Connection ---');
    db.raw('SELECT 1')
        .then(() => {
            console.log('✅ Connection Successful!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Connection Failed:', err);
            process.exit(1);
        });

} catch (e) {
    console.error('❌ Initialization Error:', e);
}
