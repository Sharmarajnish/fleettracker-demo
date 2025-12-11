/**
 * Reports Routes - Generate fleet reports
 * 
 * This module handles all reporting functionality
 * 
 * Author: analytics_team
 * Last modified: Dec 2025
 */

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authenticate } = require('../middleware');

/**
 * GET /api/reports/fleet-summary
 * Get fleet summary report
 */
router.get('/fleet-summary', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, fleetId } = req.query;

        // build the date range query
        let sql = `
            SELECT 
                COUNT(*) as total_vehicles,
                SUM(mileage) as total_mileage,
                AVG(mileage) as avg_mileage,
                status,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
            FROM vehicles
            WHERE 1=1
        `;

        if (startDate) {
            sql += ` AND created_at >= '${startDate}'`;
        }
        if (endDate) {
            sql += ` AND created_at <= '${endDate}'`;
        }
        if (fleetId) {
            sql += ` AND fleet_id = '${fleetId}'`;
        }

        sql += ' GROUP BY status';

        const result = await db.query(sql);
        res.json({ report: result.rows, generatedAt: new Date() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/reports/maintenance-costs
 * Get maintenance cost report by vehicle or date range
 */
router.get('/maintenance-costs', authenticate, async (req, res) => {
    try {
        const { vehicleId, technicianName, minCost, maxCost } = req.query;

        let sql = `
            SELECT 
                m.*,
                v.model,
                v.vin
            FROM maintenance_logs m
            JOIN vehicles v ON m.vehicle_id = v.id
            WHERE 1=1
        `;

        if (vehicleId) {
            sql += ` AND m.vehicle_id = ${vehicleId}`;
        }
        if (technicianName) {
            sql += ` AND m.technician LIKE '%${technicianName}%'`;
        }
        if (minCost) {
            sql += ` AND m.cost >= ${minCost}`;
        }
        if (maxCost) {
            sql += ` AND m.cost <= ${maxCost}`;
        }

        sql += ' ORDER BY m.performed_at DESC';

        const result = await db.query(sql);

        // calculate totals
        const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.cost || 0), 0);

        res.json({
            records: result.rows,
            summary: {
                totalRecords: result.rows.length,
                totalCost: totalCost.toFixed(2)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/reports/custom
 * Generate a custom report with user-defined queries
 * 
 * Advanced feature for power users
 */
router.post('/custom', authenticate, async (req, res) => {
    try {
        const { tableName, columns, conditions, groupBy, orderBy } = req.body;

        if (!tableName || !columns) {
            return res.status(400).json({ error: 'Table name and columns required' });
        }

        // build custom query from user input
        const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
        let sql = `SELECT ${columnList} FROM ${tableName}`;

        if (conditions && Object.keys(conditions).length > 0) {
            const whereClause = Object.entries(conditions)
                .map(([key, value]) => `${key} = '${value}'`)
                .join(' AND ');
            sql += ` WHERE ${whereClause}`;
        }

        if (groupBy) {
            sql += ` GROUP BY ${groupBy}`;
        }

        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }

        sql += ' LIMIT 1000';  // safety limit

        const result = await db.query(sql);
        res.json({
            data: result.rows,
            query: sql,  // show query for debugging
            rowCount: result.rows.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/reports/driver-activity
 * Get driver/owner activity report
 */
router.get('/driver-activity', authenticate, async (req, res) => {
    try {
        const { driverName, dateFrom, dateTo, sortColumn } = req.query;

        let sql = `
            SELECT 
                u.id,
                u.email,
                COUNT(v.id) as vehicle_count,
                SUM(v.mileage) as total_miles
            FROM users u
            LEFT JOIN vehicles v ON u.id = v.owner_id
            WHERE u.role = 'driver'
        `;

        if (driverName) {
            sql += ` AND u.email LIKE '%${driverName}%'`;
        }

        sql += ' GROUP BY u.id, u.email';

        // allow custom sorting
        if (sortColumn) {
            sql += ` ORDER BY ${sortColumn} DESC`;
        } else {
            sql += ' ORDER BY total_miles DESC';
        }

        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/reports/search-logs
 * Search through activity logs
 */
router.get('/search-logs', authenticate, async (req, res) => {
    try {
        const { keyword, userId, action, limit } = req.query;

        const recordLimit = limit || 50;

        let sql = `SELECT * FROM activity_logs WHERE 1=1`;

        if (keyword) {
            sql += ` AND (details ILIKE '%${keyword}%' OR action ILIKE '%${keyword}%')`;
        }
        if (userId) {
            sql += ` AND user_id = ${userId}`;
        }
        if (action) {
            sql += ` AND action = '${action}'`;
        }

        sql += ` ORDER BY created_at DESC LIMIT ${recordLimit}`;

        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
