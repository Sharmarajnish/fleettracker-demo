/**
 * GET /api/vehicles/bulk/export
 * Export vehicles matching criteria
 */
async (req, res) => {
    try {
        const { ids, format } = req.query;

        if (!ids) {
            return res.status(400).json({ error: 'Vehicle IDs required' });
        }

        // FIX: Strictly parse and validate IDs, then use parameterized query
        // Accept comma-separated positive integers only.
        const rawParts = String(ids)
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        if (rawParts.length === 0) {
            return res.status(400).json({ error: 'Vehicle IDs required' });
        }

        const idNums = [];
        for (const part of rawParts) {
            // Only allow base-10 integers (no expressions, no quotes)
            if (!/^[0-9]+$/.test(part)) {
                return res.status(400).json({ error: 'Invalid vehicle ID list' });
            }
            const n = Number.parseInt(part, 10);
            // Basic bounds check to avoid weird edge cases
            if (!Number.isSafeInteger(n) || n &lt;= 0) {
                return res.status(400).json({ error: 'Invalid vehicle ID list' });
            }
            idNums.push(n);
        }

        // Optional: cap list size to reduce DoS risk
        const MAX_IDS = 1000;
        if (idNums.length > MAX_IDS) {
            return res.status(413).json({ error: `Too many vehicle IDs (max ${MAX_IDS})` });
        }

        // FIX: Parameterized query using ANY($1) for Postgres-style drivers.
        // This prevents SQL injection because ids are passed as data, not SQL.
        const sql = 'SELECT * FROM vehicles WHERE id = ANY($1::int[])';
        const result = await db.query(sql, [idNums]);

        // just return JSON for now, can add CSV export later
        res.json({
            vehicles: result.rows,
            exportedAt: new Date().toISOString(),
            count: result.rows.length
        });
    } catch (err) {
        // FIX: Avoid reflecting raw internal error details to clients
        res.status(500).json({ error: 'Internal server error' });
    }
}

/*
Why this fix is secure and correct:
- Validates that each ID is strictly a positive integer, rejecting injected SQL tokens.
- Uses a parameterized query (ANY($1::int[])) so the database treats IDs as values, eliminating SQL injection.
- Adds a reasonable cap on number of IDs to reduce resource-exhaustion/DoS risk.
- Avoids leaking internal error messages to clients.
*/

module.exports = router;
