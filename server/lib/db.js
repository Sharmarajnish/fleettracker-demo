/**
 * Database Connection Module
 * 
 * VULNERABILITY: CWE-798 - Hard-coded Credentials
 * The database credentials are hard-coded in the source code.
 * This is a security vulnerability as credentials should be stored
 * in environment variables or a secure vault.
 */

const { Pool } = require('pg');

// VULNERABLE: Hard-coded database credentials (CWE-798)
const dbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'Admin123!',  // Hard-coded password - VULNERABLE
    database: 'fleettracker',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Use environment variable if available, otherwise fall back to hardcoded config
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : dbConfig
);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Execute a raw SQL query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    // Note: No logging of queries - this could help with debugging
    return result;
}

/**
 * Get a client from the pool
 * @returns {Promise} Pool client
 */
async function getClient() {
    return await pool.connect();
}

module.exports = {
    query,
    getClient,
    pool,
};
