const { logSecurityEvent } = require('../middlewares/securityLogger');

// Page-level guard: browsers get a redirect/error page instead of a JSON error
exports.requireAdminPage = (req, res, next) => {
    const user = req.session ? req.session.user : null;
    if (!user) {
        logSecurityEvent("UNAUTHENTICATED_ACCESS_ATTEMPT", { url: req.originalUrl }, req);
        return res.redirect('/login');
    }
    if (user.role !== 'admin') {
        logSecurityEvent("FORBIDDEN_ROLE_ATTEMPT", {
            userId: user._id,
            userRole: user.role,
            requiredRoles: ['admin'],
            url: req.originalUrl
        }, req);
        return res.status(403).render('error', { message: "Forbidden: The Admin Hub is restricted to admins." });
    }
    next();
};

exports.renderHub = (req, res) => {
    res.render('adminHub', { currentUser: req.session.user });
};
