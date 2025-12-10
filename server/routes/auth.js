/**
 * Authentication Routes
 * 
 * VULNERABILITIES:
 * - CWE-778: Insufficient Logging of Security Events
 * - CWE-287: Improper Authentication (weak JWT)
 */

const express = require('express');
const router = express.Router();
const { authenticateUser, registerUser } = require('../lib/auth');

/**
 * POST /api/auth/login
 * User login endpoint
 * 
 * VULNERABILITY: CWE-778 - No logging of failed login attempts
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            // VULNERABLE: No logging of missing credentials attempt (CWE-778)
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await authenticateUser(email, password);

        if (!user) {
            // VULNERABLE: No logging of failed login attempt (CWE-778)
            // Should log: IP address, timestamp, email attempted
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // VULNERABLE: No logging of successful login (CWE-778)
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token: user.token
        });
    } catch (error) {
        // VULNERABLE: Exposing internal error details
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/auth/register
 * User registration endpoint
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // VULNERABLE: No password strength validation
        // Should check: minimum length, complexity, common passwords

        const user = await registerUser(email, password);

        res.status(201).json({
            message: 'Registration successful',
            user
        });
    } catch (error) {
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(409).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
router.post('/logout', (req, res) => {
    // VULNERABLE: No token invalidation mechanism (CWE-287)
    // JWT tokens cannot be invalidated without a blacklist
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
