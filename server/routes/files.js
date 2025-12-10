/**
 * File Routes
 * 
 * VULNERABILITY: CWE-22 - Path Traversal
 * No validation of file paths allows access to arbitrary files
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../middleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

/**
 * GET /api/files/:filename
 * Download a file
 * 
 * VULNERABILITY: CWE-22 - Path Traversal
 * No validation of filename allows directory traversal attacks
 * Attacker can access: /api/files/../../etc/passwd
 */
router.get('/:filename', (req, res) => {
    const { filename } = req.params;

    // VULNERABLE: No path validation (CWE-22)
    // Attacker can use: ../../../etc/passwd
    // Or: ..%2F..%2F..%2Fetc%2Fpasswd (URL encoded)
    const filepath = path.join(__dirname, '../../uploads', filename);

    // No check if resolved path is within uploads directory
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filepath);
});

/**
 * POST /api/files/upload
 * Upload a maintenance document
 */
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // VULNERABLE: No file type validation
        // Allows uploading of any file type including executables

        res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: `/uploads/${req.file.filename}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/files/document/:docPath
 * Get document by path
 * 
 * VULNERABILITY: CWE-22 - Another path traversal example
 */
router.get('/document/:docPath(*)', (req, res) => {
    const { docPath } = req.params;

    // VULNERABLE: Path traversal via URL path parameter (CWE-22)
    const fullPath = path.join(__dirname, '../../documents', docPath);

    fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json({ content: data });
    });
});

/**
 * DELETE /api/files/:filename
 * Delete a file
 */
router.delete('/:filename', authenticate, (req, res) => {
    const { filename } = req.params;

    // VULNERABLE: Path traversal in delete operation (CWE-22)
    const filepath = path.join(__dirname, '../../uploads', filename);

    fs.unlink(filepath, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        res.json({ success: true, message: 'File deleted' });
    });
});

module.exports = router;
