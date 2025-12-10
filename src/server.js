/**
 * Express Server Entry Point
 * 
 * This file sets up the Express API server with all routes
 * and intentionally vulnerable endpoints for security scanning demo.
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import route handlers
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const exportRoutes = require('./routes/export');
const fileRoutes = require('./routes/files');
const sessionRoutes = require('./routes/session');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/session', sessionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`FleetTracker API running on port ${PORT}`);
    });
}

module.exports = app;
