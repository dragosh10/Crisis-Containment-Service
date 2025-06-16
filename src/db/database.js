const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'cri_users',
    password: '1234', // înlocuiește cu parola ta
    port: 5432,
});

module.exports = pool;
