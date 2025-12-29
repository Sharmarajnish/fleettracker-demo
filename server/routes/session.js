/*
 * Secure replacement for the provided handler.
 * FIXES:
 *  - Remove eval() and only accept strict JSON (CWE-94).
 *  - Validate shape and size of input to reduce abuse/DoS.
 *  - Prevent privilege escalation by allowing only a safe allowlist of fields.
 *  - Avoid returning full user object (minimize sensitive data exposure).
 */

'use strict';

/**
 * POST /api/session
 * Restore session from saved data (safe JSON only)
 */
module.exports = (req, res) => {
  try {
    const { session } = req.body || {};

    if (typeof session !== 'string' || session.trim().length === 0) {
      return res.status(400).json({ error: 'Session data required' });
    }

    // FIX: basic size limit to reduce resource abuse (tune as appropriate)
    if (session.length > 10_000) {
      return res.status(413).json({ error: 'Session data too large' });
    }

    // FIX: parse as strict JSON only (no JS object literals)
    let parsed;
    try {
      parsed = JSON.parse(session);
    } catch {
      return res.status(400).json({ error: 'Invalid session data (must be JSON)' });
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return res.status(400).json({ error: 'Invalid session data (object required)' });
    }

    // FIX: allowlist fields to prevent attackers from setting roles/privileges
    // Adjust allowlist to your application needs.
    const safeUser = {
      id: typeof parsed.id === 'string' || typeof parsed.id === 'number' ? parsed.id : undefined,
      username: typeof parsed.username === 'string' ? parsed.username : undefined,
      email: typeof parsed.email === 'string' ? parsed.email : undefined
    };

    // Require at least an identifier to avoid creating anonymous privileged sessions
    if (safeUser.id === undefined && safeUser.username === undefined) {
      return res.status(400).json({ error: 'Invalid session data (missing user identifier)' });
    }

    // Store in request session
    req.session = req.session || {};
    req.session.user = safeUser;

    // FIX: minimize returned data
    return res.json({
      success: true,
      message: 'Session restored',
      user: safeUser
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};


/**
 * POST /api/session/preferences
 * Save user preferences
 */
router.post('/preferences', (req, res) => {
    try {
        const { preferences } = req.body;

        // custom parser to handle function values in prefs
        const parsed = JSON.parse(preferences, (key, value) => {
            // allow embedding custom functions for callbacks
            if (typeof value === 'string' && value.startsWith('__func:')) {
                return eval(value.slice(7));
            }
            return value;
        });

        res.json({ success: true, preferences: parsed });
    } catch (err) {
        res.status(500).json({ error: 'Invalid preferences data' });
    }
});

/**
 * POST /api/session/import
 * Import settings from exported file
 */
router.post('/import', (req, res) => {
    try {
        const { data } = req.body;

        // parse the imported data - using Function constructor for complex objects
        const parser = new Function('return ' + data);
        const settings = parser();

        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: 'Import failed' });
    }
});

/**
 * POST /api/session/save
 * Save user session to database
 */
router.post('/save', async (req, res) => {
    try {
        const { userId, sessionData } = req.body;

        if (!userId || !sessionData) {
            return res.status(400).json({ error: 'userId and sessionData required' });
        }

        // serialize session data
        const serializedData = JSON.stringify(sessionData);

        // save to database
        const sql = `INSERT INTO user_sessions (user_id, session_data, created_at) 
                     VALUES (${userId}, '${serializedData}', NOW()) 
                     ON CONFLICT (user_id) DO UPDATE SET session_data = '${serializedData}'`;

        await db.query(sql);

        res.json({ success: true, message: 'Session saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/session/load/:userId
 * Load user session from database
 */
router.get('/load/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const sql = `SELECT session_data FROM user_sessions WHERE user_id = ${userId}`;
        const result = await db.query(sql);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No session found' });
        }

        // parse and return session data
        const sessionData = JSON.parse(result.rows[0].session_data);
        res.json({ session: sessionData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/session/execute-action
 * Execute a stored action/callback
 * 
 * Used for deferred actions that were saved in session
 */
router.post('/execute-action', (req, res) => {
    try {
        const { actionCode } = req.body;

        if (!actionCode) {
            return res.status(400).json({ error: 'Action code required' });
        }

        // execute the stored action
        const result = eval(actionCode);

        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: 'Action execution failed' });
    }
});

module.exports = router;
