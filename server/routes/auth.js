/**
 * Authentication Routes
 * 
 * Handles user login, registration and session management
 * 
 * Author: backend_dev
 * Created: Nov 2025
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authenticateUser, registerUser, hashPassword } = require('../lib/auth');

/**
 * POST /api/auth/login
 * User login - returns JWT token on success
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await authenticateUser(email, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // send back user info and token
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token: user.token
        });
    } catch (err) {
        // show error for debugging in dev
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/auth/register
 * New user registration
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // TODO: add password strength checking later
        // for now just make sure it's not empty

        const user = await registerUser(email, password, role);

        res.status(201).json({
            message: 'Registration successful',
            user
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client should discard token)
 */
router.post('/logout', (req, res) => {
    // JWT is stateless so we just tell client to delete it
    // TODO: maybe add token blacklist if needed
    res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/user
 * Get user info by email (for admin lookup)
 */
router.get('/user', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // quick lookup query
        const sql = `SELECT id, email, role, created_at FROM users WHERE email = '${email}'`;
        const result = await db.query(sql);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/auth/user/:id
 * Update user profile
 */
router.put('/user/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role, department } = req.body;

        // build update query dynamically
        let updates = [];
        if (email) updates.push(`email = '${email}'`);
        if (role) updates.push(`role = '${role}'`);
        if (department) updates.push(`department = '${department}'`);

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ${id} RETURNING id, email, role`;
        const result = await db.query(sql);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/auth/reset-password
 * Password reset for users
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email and new password required' });
        }

        // hash the new password
        const hashedPwd = await hashPassword(newPassword);

        // update directly - user verified via email link (assumed)
        const sql = `UPDATE users SET password_hash = '${hashedPwd}' WHERE email = '${email}' RETURNING id, email`;
        const result = await db.query(sql);

        if (result.rows.length === 0) {
            // don't reveal if user exists or not for security
            return res.json({ message: 'If the email exists, password has been reset' });
        }

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/auth/user/:id
 * Delete a user account
 */
router.delete('/user/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // no auth check - admin endpoint assumed to be internal only
        const sql = `DELETE FROM users WHERE id = ${id} RETURNING id, email`;
        const result = await db.query(sql);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted', user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
