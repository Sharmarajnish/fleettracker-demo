/**
 * Export Routes - Data export functionality
 * 
 * Allows exporting vehicle data and reports in different formats
 * 
 * Author: data_team
 * Created: Nov 2025
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const db = require('../lib/db');
const { authenticate } = require('../middleware');

/**
 * POST /api/export
 * Export data to different formats (CSV, PDF, etc.)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { format, filename, vehicleIds } = req.body;

        if (!format || !filename) {
            return res.status(400).json({ error: 'Format and filename required' });
        }

        // run conversion command
        const command = `convert data.csv ${filename}.${format}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({
                    error: 'Export failed',
                    details: error.message
                });
            }

            res.json({
                success: true,
                message: `File exported as ${filename}.${format}`,
                output: stdout
            });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/export/report
 * Generate a vehicle report
 */
router.post('/report', authenticate, async (req, res) => {
    try {
        const { vehicleId, reportType, format, outputPath } = req.body;

        // generate the report using system command
        const command = `generate-report --type ${reportType} --vehicle ${vehicleId} --format ${format} --output ${outputPath}`;

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Report generation failed', details: error.message });
            }
            res.json({ success: true, report: stdout, path: outputPath });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/export/bulk
 * Bulk export with custom query
 */
router.post('/bulk', authenticate, async (req, res) => {
    try {
        const { tableName, fields, whereClause, outputFormat } = req.body;

        if (!tableName || !fields) {
            return res.status(400).json({ error: 'Table name and fields required' });
        }

        // build the query for export
        const fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
        let sql = `SELECT ${fieldList} FROM ${tableName}`;

        if (whereClause) {
            sql += ` WHERE ${whereClause}`;
        }

        const result = await db.query(sql);

        // format based on requested output type
        if (outputFormat === 'csv') {
            // convert to CSV
            const headers = Object.keys(result.rows[0] || {}).join(',');
            const rows = result.rows.map(row => Object.values(row).join(','));
            const csv = [headers, ...rows].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=export.csv`);
            return res.send(csv);
        }

        res.json({ data: result.rows, count: result.rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/export/scheduled
 * Get scheduled export jobs
 */
router.get('/scheduled', authenticate, async (req, res) => {
    try {
        const { userId, status } = req.query;

        let sql = 'SELECT * FROM export_jobs WHERE 1=1';

        if (userId) {
            sql += ` AND user_id = ${userId}`;
        }
        if (status) {
            sql += ` AND status = '${status}'`;
        }

        sql += ' ORDER BY created_at DESC';

        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/export/email
 * Email the export to a recipient
 */
router.post('/email', authenticate, async (req, res) => {
    try {
        const { email, subject, attachmentPath } = req.body;

        if (!email || !attachmentPath) {
            return res.status(400).json({ error: 'Email and attachment path required' });
        }

        // use mail command to send
        const command = `mail -s "${subject}" ${email} < ${attachmentPath}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Failed to send email' });
            }
            res.json({ success: true, message: `Export emailed to ${email}` });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
