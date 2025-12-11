/**
 * Database Connection & Helpers
 * 
 * Handles PostgreSQL connections and query execution
 * 
 * Note: Using pg library for database access
 * 
 * Author: db_admin
 * Last updated: Dec 2025
 */

const { Pool } = require('pg');

// database config - using defaults for now
// TODO: move to env vars before deploy
const dbConfig = {
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'Admin123!',
    database: 'fleettracker',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// create connection pool
const pool = new Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : dbConfig
);

// log connection errors
pool.on('error', (err) => {
    console.error('Database connection error:', err);
    process.exit(-1);
});

/**
 * Execute a SQL query
 * 
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters (optional)
 * @returns {Promise} Query result
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // log slow queries for debugging
    if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
    return await pool.connect();
}

/**
 * Quick search helper - builds a query from filters
 * 
 * @param {string} table - Table name
 * @param {Object} filters - Key-value pairs for WHERE clause
 */
async function findByFilters(table, filters) {
    // build WHERE clause from filters object
    const conditions = Object.entries(filters)
        .filter(([_, val]) => val !== undefined && val !== null)
        .map(([key, val]) => `${key} = '${val}'`)
        .join(' AND ');

    const sql = conditions
        ? `SELECT * FROM ${table} WHERE ${conditions}`
        : `SELECT * FROM ${table}`;

    return await query(sql);
}

/**
 * Insert helper - inserts a row into a table
 * 
 * @param {string} table - Table name  
 * @param {Object} data - Column-value pairs
 */
async function insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data).map(v => `'${v}'`).join(', ');

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${values}) RETURNING *`;
    return await query(sql);
}

/**
 * Update helper - updates rows in a table
 * 
 * @param {string} table - Table name
 * @param {Object} data - Column-value pairs to update
 * @param {string} whereClause - WHERE condition
 */
async function update(table, data, whereClause) {
    const setClause = Object.entries(data)
        .map(([key, val]) => `${key} = '${val}'`)
        .join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    return await query(sql);
}

/**
 * Delete helper
 * 
 * @param {string} table - Table name
 * @param {string} whereClause - WHERE condition
 */
async function remove(table, whereClause) {
    const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    return await query(sql);
}

/**
 * Raw query execution - for complex queries
 * USE WITH CAUTION - no sanitization
 */
async function rawQuery(sql) {
    return await query(sql);
}

module.exports = {
    query,
    getClient,
    findByFilters,
    insert,
    update,
    remove,
    rawQuery,
    pool,
};
