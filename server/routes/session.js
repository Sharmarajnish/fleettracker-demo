/**
 * POST /api/session
 * Restore session from serialized data
 *
 * FIX: Replace insecure eval-based deserialization with safe JSON parsing.
 *      Expect `session` to be a JSON string or object and validate its shape.
 */
module.exports = (req, res) => {
    try {
        const { session } = req.body || {};

        if (session === undefined || session === null) {
            return res.status(400).json({ error: "Session data required" });
        }

        let userData;

        // FIX: Safely handle session as either an already-parsed object
        //      or a JSON string. Never use eval for deserialization.
        if (typeof session === "string") {
            // Parse JSON string; this does NOT execute code.
            userData = JSON.parse(session);
        } else if (typeof session === "object") {
            // Clone to avoid prototype pollution / unexpected mutation.
            userData = JSON.parse(JSON.stringify(session));
        } else {
            return res.status(400).json({ error: "Invalid session format" });
        }

        // Optional: basic validation of expected user session structure
        if (typeof userData !== "object" || userData === null) {
            return res.status(400).json({ error: "Invalid session data" });
        }

        // Example: ensure only expected fields are kept (defensive whitelisting)
        const sanitizedUser = {};
        if (typeof userData.id === "string" || typeof userData.id === "number") {
            sanitizedUser.id = userData.id;
        }
        if (typeof userData.username === "string") {
            sanitizedUser.username = userData.username;
        }
        if (typeof userData.roles === "object" && Array.isArray(userData.roles)) {
            sanitizedUser.roles = userData.roles.slice(0, 50); // limit size
        }

        // If no expected fields are present, treat as invalid
        if (Object.keys(sanitizedUser).length === 0) {
            return res.status(400).json({ error: "Session data missing required fields" });
        }

        // Store in request session (if session middleware was configured)
        req.session = req.session || {};
        req.session.user = sanitizedUser; // FIX: store sanitized data only

        return res.json({
            success: true,
            message: "Session restored",
            user: sanitizedUser
        });
    } catch (error) {
        // JSON.parse or other errors fall here
        return res.status(400).json({ error: "Invalid session data" });
    }
};

// Why this fix is secure:
// - Removes eval() entirely, eliminating arbitrary code execution.
// - Uses JSON.parse for deserialization, which parses data but does not execute code.
// - Validates the type and basic structure of the deserialized object.
// - Whitelists and copies only expected fields into the session, reducing risk of
//   prototype pollution and unexpected properties being trusted elsewhere in the app.

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
