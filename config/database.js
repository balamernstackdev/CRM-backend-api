const knex = require('knex');
const config = require('./config');

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

// Test connection
db.raw('SELECT 1')
    .then(() => {
        console.log(`✅ Database connected (${config.db.client})`);
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });

module.exports = db;
