/**
 * Authentication Module
 * 
 * VULNERABILITY: CWE-287 - Improper Authentication
 * - Weak JWT secret
 * - No token expiration
 * - Insufficient password validation
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

// VULNERABLE: Hard-coded weak JWT secret (CWE-287, CWE-798)
const JWT_SECRET = 'secret123';

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    // Using low salt rounds for demo - also vulnerable
    return await bcrypt.hash(password, 8);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Password hash
 * @returns {Promise<boolean>} Match result
 */
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 * VULNERABLE: No expiration, weak secret (CWE-287)
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
    // VULNERABLE: No expiration time, weak secret
    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET
        // Missing: { expiresIn: '24h' }
    );
    return token;
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Register a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Created user
 */
async function registerUser(email, password) {
    // VULNERABLE: No password strength validation
    const passwordHash = await hashPassword(password);

    const result = await db.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
        [email, passwordHash]
    );

    return result.rows[0];
}

/**
 * Authenticate user
 * VULNERABILITY: CWE-778 - Insufficient Logging
 * Failed login attempts are not logged
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object|null>} User with token or null
 */
async function authenticateUser(email, password) {
    const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    );

    if (result.rows.length === 0) {
        // VULNERABLE: No logging of failed login attempt (CWE-778)
        return null;
    }

    const user = result.rows[0];
    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
        // VULNERABLE: No logging of failed login attempt (CWE-778)
        return null;
    }

    const token = generateToken(user);

    return {
        id: user.id,
        email: user.email,
        role: user.role,
        token
    };
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object
 */
async function getUserById(userId) {
    const result = await db.query(
        'SELECT id, email, role, created_at FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    registerUser,
    authenticateUser,
    getUserById,
    JWT_SECRET, // Exported for middleware
};
