// Secure implementation of GET /api/vehicles/search using parameterized queries
// and basic input validation to prevent SQL Injection (CWE-89).

module.exports = async (req, res) => {
    try {
        const { query } = req.query;

        // Basic validation: require non-empty string
        if (typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // Normalize and limit length to reduce abuse/DoS risk
        const normalizedQuery = query.trim();
        const MAX_LENGTH = 100; // adjust as appropriate for your use case
        const safeQuery = normalizedQuery.slice(0, MAX_LENGTH);

        // Use parameterized query with placeholders instead of string concatenation
        // This ensures the user input is treated strictly as data, not executable SQL.
        const sql = `
            SELECT *
            FROM vehicles
            WHERE model ILIKE $1
               OR vin ILIKE $1
        `;

        // Wrap the search term with wildcards in the parameter value, not in the SQL string
        const params = [`%${safeQuery}%`];

        const result = await db.query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        // Avoid leaking internal details in production; log internally instead.
        // Here we return a generic message while preserving status code.
        console.error('Error in /api/vehicles/search:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/vehicles
 * Create a new vehicle
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { vin, model, year, notes, status, mileage } = req.body;

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
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Vehicle with this VIN already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/vehicles/:id
 * Update a vehicle
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle
 * 
 * VULNERABILITY: CWE-862 - Missing Authorization
 * No verification that the authenticated user owns this vehicle
 * Any authenticated user can delete any vehicle
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // VULNERABLE: Missing authorization check (CWE-862)
        // Should verify: req.user.userId === vehicle.owner_id || req.user.role === 'admin'
        // Currently ANY authenticated user can delete ANY vehicle

        const result = await db.query(
            'DELETE FROM vehicles WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        res.json({ message: 'Vehicle deleted', vehicle: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/vehicles/:id/maintenance
 * Get maintenance logs for a vehicle
 */
router.get('/:id/maintenance', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT * FROM maintenance_logs WHERE vehicle_id = $1 ORDER BY performed_at DESC',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/vehicles/:id/maintenance
 * Add maintenance log to a vehicle
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
