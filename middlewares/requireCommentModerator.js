const { canModerateComments } = require("../services/commentsServices");

// Comment moderation is for editors and admins. It reads the session that the auth branch sets up
// (req.session.user = { _id, username, role }); until that is merged there is no session, so every
// request gets 401 and the routes stay closed.
const requireCommentModerator = (req, res, next) => {
    const user = req.session?.user;
    if (!user) {
        return res.status(401).json({ message: "Please log in as an editor to moderate comments." });
    }
    if (!canModerateComments(user)) {
        console.warn(`[comments] moderation denied user=${user._id} role=${user.role} ${req.method} ${req.originalUrl}`);
        return res.status(403).json({ message: "Only editors can moderate comments." });
    }
    next();
};

module.exports = requireCommentModerator;
