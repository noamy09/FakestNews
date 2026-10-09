const commentService = require("../services/commentsServices.js");

const sendError = (res, error, message) => {
    const status = error.statusCode || 500;
    if (status >= 500) console.error(`[comments] ${message}:`, error);
    res.status(status).json({
        message: status >= 500 ? message : error.message
    });
};

exports.getAll = async (req, res) => {
    try {
        const comments = await commentService.getComments(req.query);
        res.status(200).json(comments);
    } catch (error) {
        sendError(res, error, "Error fetching comments");
    }
};

exports.getById = async (req, res) => {
    try {
        const comment = await commentService.getCommentByID(req.params.id);
        res.status(200).json(comment);
    } catch (error) {
        sendError(res, error, "Error fetching comment");
    }
};

exports.listForArticle = async (req, res) => {
    try {
        const result = await commentService.getArticleComments(req.params.articleId, req.query);
        res.status(200).json(result);
    } catch (error) {
        sendError(res, error, "Error fetching comments");
    }
};

exports.createForArticle = async (req, res) => {
    try {
        const comment = await commentService.createArticleComment(
            req.params.articleId,
            req.body,
            req.session?.user
        );
        res.status(201).json(comment);
    } catch (error) {
        sendError(res, error, "Error creating comment");
    }
};

// Moderation: the route guard (requireCommentModerator) has already checked the role.
const moderator = (req) => req.session.user.username || req.session.user._id;

exports.delete = async (req, res) => {
    try {
        const comment = await commentService.deleteComment(req.params.id);
        console.log(`[comments] comment ${req.params.id} on article ${comment.articleId} deleted by ${moderator(req)}`);
        res.status(200).json(comment);
    } catch (error) {
        sendError(res, error, "Error deleting comment");
    }
};
