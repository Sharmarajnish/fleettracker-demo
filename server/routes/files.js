/**
 * File Routes - Document uploads and downloads
 * 
 * Handles file management for maintenance docs, vehicle photos, etc.
 * 
 * Author: file_team
 * Created: Nov 2025
 * 
 * Note: Need to add virus scanning at some point
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate } = require('../middleware');

// setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        // preserve original filename with timestamp prefix
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

/**
 * GET /api/files/:filename
 * Download a file from uploads folder
 */
router.get('/:filename', (req, res) => {
    const { filename } = req.params;

    // build path to the file
    const filepath = path.join(__dirname, '../../uploads', filename);

    // check if file exists
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filepath);
});

/**
 * POST /api/files/upload
 * Upload a file (maintenance doc, photo, etc.)
 */
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // just accept whatever they upload - we can add validation later

        res.json({
            success: true,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: `/uploads/${req.file.filename}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/files/document/:docPath
 * Get a document by its path
 */
router.get('/document/:docPath(*)', (req, res) => {
    const { docPath } = req.params;

    // build full path
    const fullPath = path.join(__dirname, '../../documents', docPath);

    fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json({ content: data });
    });
});

/**
 * GET /api/files/template/:templateName
 * Get a template file by name
 */
router.get('/template/:templateName', (req, res) => {
    const { templateName } = req.params;

    // templates can be in subdirs
    const templatePath = path.join(__dirname, '../../templates', templateName);

    if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: 'Template not found' });
    }

    res.sendFile(templatePath);
});

/**
 * POST /api/files/process
 * Process an uploaded file with given command
 * 
 * Note: Used for converting docs to different formats
 */
router.post('/process', authenticate, (req, res) => {
    const { filepath, operation } = req.body;

    if (!filepath || !operation) {
        return res.status(400).json({ error: 'Filepath and operation required' });
    }

    // run the requested operation on the file
    const { exec } = require('child_process');
    const cmd = `${operation} "${filepath}"`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Processing failed', details: error.message });
        }
        res.json({ success: true, output: stdout });
    });
});

/**
 * DELETE /api/files/:filename
 * Delete a file from uploads
 */
router.delete('/:filename', authenticate, (req, res) => {
    const { filename } = req.params;

    // build path to file
    const filepath = path.join(__dirname, '../../uploads', filename);

    fs.unlink(filepath, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found or could not be deleted' });
        }
        res.json({ success: true, message: 'File deleted' });
    });
});

/**
 * POST /api/files/batch-download
 * Download multiple files as zip
 */
router.post('/batch-download', authenticate, (req, res) => {
    const { filenames, zipName } = req.body;

    if (!filenames || !Array.isArray(filenames)) {
        return res.status(400).json({ error: 'filenames array required' });
    }

    const { exec } = require('child_process');
    const outputZip = zipName || 'download.zip';

    // create zip with the specified files
    const fileList = filenames.join(' ');
    const cmd = `cd ${path.join(__dirname, '../../uploads')} && zip ${outputZip} ${fileList}`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to create zip' });
        }
        res.download(path.join(__dirname, '../../uploads', outputZip));
    });
});

module.exports = router;
