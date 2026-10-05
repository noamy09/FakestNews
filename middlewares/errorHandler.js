const { logSecurityEvent } = require('./securityLogger');

/**
 * Centralized error handling middleware.
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Log security events for 401/403 responses
    if (statusCode === 401 || statusCode === 403) {
        logSecurityEvent("UNAUTHORIZED_OR_FORBIDDEN_ATTEMPT", {
            statusCode,
            message,
            path: req.originalUrl,
            user: req.session && req.session.user ? req.session.user._id : 'Unauthenticated'
        }, req);
    }

    res.status(statusCode).json({
        status: "error",
        statusCode,
        message
    });
};

module.exports = errorHandler;
