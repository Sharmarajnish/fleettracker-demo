/**
 * Authentication Middleware
 * 
 * VULNERABILITY: CWE-287 - Improper Authentication
 * The middleware uses a weak JWT implementation with no expiry checking.
 */

const { verifyToken, JWT_SECRET } = require('./lib/auth');

/**
 * Authenticate middleware
 * Verifies JWT token from Authorization header
 */
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // VULNERABLE: No check for token expiration (CWE-287)
    // The token was created without expiration, so it never expires

    req.user = decoded;
    next();
}

/**
 * Admin only middleware
 * VULNERABLE: Only checks role, no additional verification
 */
function adminOnly(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
}

module.exports = {
    authenticate,
    adminOnly,
};
