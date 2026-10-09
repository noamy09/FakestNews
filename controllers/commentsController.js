const commentService = require("../services/commentsServices.js");
const { logSecurityEvent } = require("../middlewares/securityLogger");

// Errors go to the central error handler (middlewares/errorHandler.js) via next().

exports.getAll = async (req, res, next) => {
    try {
        const comments = await commentService.getComments(req.query);
        res.status(200).json(comments);
    } catch (error) {
        next(error);
    }
};

exports.getById = async (req, res, next) => {
    try {
        const comment = await commentService.getCommentByID(req.params.id);
        res.status(200).json(comment);
    } catch (error) {
        next(error);
    }
};

exports.listForArticle = async (req, res, next) => {
    try {
        const result = await commentService.getArticleComments(req.params.articleId, req.query);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

exports.createForArticle = async (req, res, next) => {
    try {
        const comment = await commentService.createArticleComment(
            req.params.articleId,
            req.body,
            req.session?.user
        );
        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
};

// Moderation: requireAuth + requireRole('editor', 'admin') have already run.
exports.delete = async (req, res, next) => {
    try {
        const comment = await commentService.deleteComment(req.params.id);
        logSecurityEvent("COMMENT_DELETED", { commentId: req.params.id, articleId: String(comment.articleId) }, req);
        res.status(200).json(comment);
    } catch (error) {
        next(error);
    }
};
