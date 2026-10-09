const AppError = require('../utils/AppError');
const Article = require('../models/articles');
const { logSecurityEvent } = require('./securityLogger');

/**
 * Middleware to require authentication (valid session).
 * Returns HTTP 401 if unauthenticated.
 */
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { url: req.originalUrl }, req);
        return next(new AppError("Authentication required. Please log in.", 401));
    }
    next();
};

/**
 * Middleware to require specific role(s).
 * Returns HTTP 401 if no session, HTTP 403 if role is not authorized.
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { url: req.originalUrl, requiredRoles: allowedRoles }, req);
            return next(new AppError("Authentication required. Please log in.", 401));
        }

        const userRole = req.session.user.role;
        if (!allowedRoles.includes(userRole)) {
            logSecurityEvent("FORBIDDEN_ROLE_ATTEMPT", {
                userId: req.session.user._id,
                userRole,
                requiredRoles: allowedRoles,
                url: req.originalUrl
            }, req);
            return next(new AppError("Forbidden: Insufficient permissions for this action", 403));
        }

        next();
    };
};

/**
 * Middleware for article ownership & action checking.
 * Uses the `author` field on Article model to match with `req.session.user._id`.
 * - Editors can edit, publish, return, or delete any article.
 * - Reporters can only edit draft content of their own articles.
 * - Reporters CANNOT publish, return, or delete articles (returns 403 Forbidden).
 * Returns HTTP 401 if no session, HTTP 403 if non-owner reporter or forbidden status transition.
 */
const requireOwnership = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { url: req.originalUrl }, req);
            return next(new AppError("Authentication required. Please log in.", 401));
        }

        const { user } = req.session;

        // Editors have full universal authorization over all articles
        if (user.role === 'editor') {
            return next();
        }

        // Only editors can change article status (publish, archive, return to draft/unpublished)
        if (req.body && req.body.status && ['published', 'archived', 'unpublished'].includes(req.body.status)) {
            logSecurityEvent("FORBIDDEN_PUBLISH_ATTEMPT", {
                userId: user._id,
                userRole: user.role,
                attemptedStatus: req.body.status,
                url: req.originalUrl
            }, req);
            return next(new AppError("Forbidden: Only editors can publish, return, or archive articles", 403));
        }

        // For Reporters, verify ownership via author field
        const articleId = req.params.id || req.params.articleId;
        if (!articleId) {
            return next(new AppError("Article ID parameter is required", 400));
        }

        const article = await Article.findById(articleId);
        if (!article) {
            return next(new AppError("Article not found", 404));
        }

        const authorId = article.author ? article.author.toString() : null;
        const userId = user._id.toString();

        if (authorId !== userId) {
            logSecurityEvent("FORBIDDEN_OWNERSHIP_ATTEMPT", {
                userId,
                articleId,
                articleAuthor: authorId,
                url: req.originalUrl
            }, req);
            return next(new AppError("Forbidden: You can only edit your own articles", 403));
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requireAuth,
    requireRole,
    requireOwnership
};
