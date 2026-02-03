const config = require('./config/config');

module.exports = {
    development: {
        client: config.db.client,
        connection: config.db.connection,
        useNullAsDefault: true,
        migrations: {
            directory: './database/migrations'
        },
        seeds: {
            directory: './database/seeds'
        }
    },

    production: {
        client: config.db.client,
        connection: config.db.connection,
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './database/migrations'
        },
        seeds: {
            directory: './database/seeds'
        }
    },

    test: {
        client: 'better-sqlite3',
        connection: {
            filename: './database/test_crm.db'
        },
        useNullAsDefault: true,
        migrations: {
            directory: './database/migrations'
        },
        seeds: {
            directory: './database/seeds'
        }
    }
};
