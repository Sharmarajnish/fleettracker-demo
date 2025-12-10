/**
 * Session Routes
 * 
 * VULNERABILITY: CWE-502 - Insecure Deserialization
 * User-provided data is deserialized using eval()
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/session
 * Restore session from serialized data
 * 
 * VULNERABILITY: CWE-502 - Insecure Deserialization
 * Using eval() to deserialize user-provided data allows arbitrary code execution
 */
router.post('/', (req, res) => {
    try {
        const { session } = req.body;

        if (!session) {
            return res.status(400).json({ error: 'Session data required' });
        }

        // VULNERABLE: Using eval() to deserialize user data (CWE-502)
        // Attacker can send: session = "process.exit(1)" to crash server
        // Or: session = "(function(){require('child_process').exec('rm -rf /');})()"
        const userData = eval('(' + session + ')');

        // Store in request session (if session middleware was configured)
        req.session = req.session || {};
        req.session.user = userData;

        res.json({
            success: true,
            message: 'Session restored',
            user: userData
        });
    } catch (error) {
        res.status(500).json({ error: 'Invalid session data' });
    }
});

/**
 * POST /api/session/preferences
 * Save user preferences
 * 
 * VULNERABILITY: CWE-502 - Another insecure deserialization example
 */
router.post('/preferences', (req, res) => {
    try {
        const { preferences } = req.body;

        // VULNERABLE: Deserializing JSON with reviver that can execute code
        const parsed = JSON.parse(preferences, (key, value) => {
            // VULNERABLE: Type coercion can be exploited
            if (typeof value === 'string' && value.startsWith('__func:')) {
                // Dangerous: evaluating function from user input
                return eval(value.slice(7));
            }
            return value;
        });

        res.json({ success: true, preferences: parsed });
    } catch (error) {
        res.status(500).json({ error: 'Invalid preferences data' });
    }
});

/**
 * POST /api/session/import
 * Import settings from exported data
 * 
 * VULNERABILITY: CWE-502 - Yet another deserialization vulnerability
 */
router.post('/import', (req, res) => {
    try {
        const { data } = req.body;

        // VULNERABLE: Using Function constructor to parse data
        // Similar to eval() - allows code execution
        const parser = new Function('return ' + data);
        const settings = parser();

        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ error: 'Import failed' });
    }
});

module.exports = router;
