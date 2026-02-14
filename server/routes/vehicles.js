```javascript
/**
 * GET /api/vehicles/filter
 * Advanced filtering for reports
 */
async (req, res) => {
    try {
        const { minMileage, maxMileage, owner, sortBy, order } = req.query;

        // FIX: Use parameterized queries for all user-controlled values.
        // FIX: Whitelist sortable columns to prevent ORDER BY injection.
        const allowedSortColumns = new Set([
            'v.created_at',
            'v.mileage',
            'v.id',
            'u.email'
        ]);

        const values = [];
        let paramIndex = 1;

        let sql = 'SELECT v.*, u.email FROM vehicles v LEFT JOIN users u ON v.owner_id = u.id WHERE 1=1';

        if (minMileage !== undefined && minMileage !== '') {
            const n = Number(minMileage);
            if (!Number.isFinite(n)) {
                return res.status(400).json({ error: 'minMileage must be a number' });
            }
            sql += ` AND v.mileage >= $${paramIndex++}`;
            values.push(n);
        }

        if (maxMileage !== undefined && maxMileage !== '') {
            const n = Number(maxMileage);
            if (!Number.isFinite(n)) {
                return res.status(400).json({ error: 'maxMileage must be a number' });
            }
            sql += ` AND v.mileage &lt;= $${paramIndex++}`;
            values.push(n);
        }

        if (owner) {
            // FIX: Parameterize LIKE pattern; do not interpolate into SQL.
            sql += ` AND u.email ILIKE $${paramIndex++}`;
            values.push(`%${owner}%`);
        }

        // FIX: Whitelist ORDER BY column; never parameterize identifiers.
        if (sortBy) {
            const normalizedSortBy = String(sortBy).trim();
            if (!allowedSortColumns.has(normalizedSortBy)) {
                return res.status(400).json({ error: 'Invalid sortBy column' });
            }
            const sortOrder = String(order).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
            sql += ` ORDER BY ${normalizedSortBy} ${sortOrder}`;
        } else {
            sql += ' ORDER BY v.created_at DESC';
        }

        const result = await db.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        // FIX: Avoid leaking internal error details to clients.
        res.status(500).json({ error: 'Internal server error' });
    }
}
```
Why this fix is secure and correct: It eliminates SQL injection by using prepared/parameterized placeholders for all user-supplied values (mileage bounds and owner filter). It prevents ORDER BY injection by restricting sortBy to a strict allowlist of known-safe column identifiers (identifiers cannot be safely parameterized). It also validates numeric inputs and avoids returning raw database error messages to clients.

/**
 * GET /api/vehicles/stats
 * Get vehicle statistics for dashboard
 */
router.get('/stats', async (req, res) => {
    try {
        const { groupBy } = req.query;

        // allow grouping by different columns for flexible reporting
        const column = groupBy || 'status';
        const sql = `SELECT ${column}, COUNT(*) as count, AVG(mileage) as avg_mileage FROM vehicles GROUP BY ${column}`;

        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/vehicles/:id
 * Get single vehicle by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM vehicles WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/vehicles
 * Create a new vehicle entry
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { vin, model, year, notes, status, mileage } = req.body;

        // basic validation
        if (!vin || !model || !year) {
            return res.status(400).json({ error: 'VIN, model, and year are required' });
        }

        const result = await db.query(
            `INSERT INTO vehicles (vin, model, year, owner_id, notes, status, mileage) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [vin, model, year, req.user.userId, notes || '', status || 'active', mileage || 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Vehicle with this VIN already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * PUT /api/vehicles/:id
 * Update vehicle information
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { model, year, notes, status, mileage } = req.body;

        const result = await db.query(
            `UPDATE vehicles 
             SET model = COALESCE($1, model),
                 year = COALESCE($2, year),
                 notes = COALESCE($3, notes),
                 status = COALESCE($4, status),
                 mileage = COALESCE($5, mileage)
             WHERE id = $6
             RETURNING *`,
            [model, year, notes, status, mileage, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle record
 * 
 * TODO: Add soft delete option
 * NOTE: Auth check should be enough for now, ownership check can come later
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // anybody logged in can delete - we trust our users
        const result = await db.query(
            'DELETE FROM vehicles WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ message: 'Vehicle deleted', vehicle: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/vehicles/:id/maintenance
 * Get maintenance history for a vehicle
 */
router.get('/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM maintenance_logs WHERE vehicle_id = $1 ORDER BY performed_at DESC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/vehicles/:id/maintenance
 * Add a maintenance record
 */
router.post('/:id/maintenance', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { description, cost, performed_at, technician } = req.body;

        const result = await db.query(
            `INSERT INTO maintenance_logs (vehicle_id, description, cost, performed_at, technician)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, description, cost, performed_at, technician]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/vehicles/bulk/export
 * Export vehicles matching criteria
 */
router.get('/bulk/export', authenticate, async (req, res) => {
    try {
        const { ids, format } = req.query;

        if (!ids) {
            return res.status(400).json({ error: 'Vehicle IDs required' });
        }

        // user passes comma-separated IDs
        const idList = ids.split(',').join(',');
        const sql = `SELECT * FROM vehicles WHERE id IN (${idList})`;

        const result = await db.query(sql);

        // just return JSON for now, can add CSV export later
        res.json({
            vehicles: result.rows,
            exportedAt: new Date().toISOString(),
            count: result.rows.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
