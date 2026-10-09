const AppError = require("../utils/AppError");
const Comment = require("../models/comments");
const Article = require("../models/articles");
const mongoose = require("mongoose");

const MAX_CONTENT_LENGTH = 1000;
const MAX_NAME_LENGTH = 50;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;
const PUBLIC_FIELDS = "articleId content authorName createdAt";

const IDValidation = (id, label = "comment") => {
    // Accepts only ObjectId instances or 24-char hex strings (no numbers or 12-byte inputs).
    if (!mongoose.isObjectIdOrHexString(id)) {
        throw new AppError(`Invalid ${label} ID`, 400);
    }
};

// Strips control characters (keeps newlines/tabs) and collapses runs of blank lines.
const cleanText = (value) => {
    if (typeof value !== "string") return "";
    return value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\r\n?/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

const validateNewComment = (body) => {
    if (!body || typeof body !== "object") {
        throw new AppError("Comment payload is missing", 400);
    }
    const content = cleanText(body.content);
    const authorName = cleanText(body.authorName).replace(/\s+/g, " ");

    if (!content) throw new AppError("Comment text is required", 400);
    if (content.length > MAX_CONTENT_LENGTH) {
        throw new AppError(`Comment must be at most ${MAX_CONTENT_LENGTH} characters`, 400);
    }
    if (!authorName) throw new AppError("Name is required", 400);
    if (authorName.length > MAX_NAME_LENGTH) {
        throw new AppError(`Name must be at most ${MAX_NAME_LENGTH} characters`, 400);
    }
    return { content, authorName };
};

const assertPublishedArticle = async (articleId) => {
    IDValidation(articleId, "article");
    const exists = await Article.exists({ _id: articleId, status: "published" });
    if (!exists) {
        throw new AppError("Article not found", 404);
    }
};

const parseLimit = (limit) => {
    const parsed = parseInt(limit, 10);
    if (!parsed || parsed < 1) return DEFAULT_PAGE_SIZE;
    return Math.min(parsed, MAX_PAGE_SIZE);
};

// Cursor format "<createdAt ISO>_<_id>": _id breaks ties between comments created in the same millisecond.
const encodeCursor = (comment) => `${comment.createdAt.toISOString()}_${comment._id}`;

const decodeCursor = (cursor) => {
    const [iso, id] = String(cursor).split("_");
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime()) || !mongoose.isObjectIdOrHexString(id)) {
        throw new AppError("Invalid 'before' cursor", 400);
    }
    return { createdAt, id };
};

// Cursor pagination so new comments arriving don't shift pages.
const getArticleComments = async (articleId, { before, limit } = {}) => {
    await assertPublishedArticle(articleId);
    const pageSize = parseLimit(limit);
    const filter = { articleId };

    if (before) {
        const { createdAt, id } = decodeCursor(before);
        filter.$or = [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: id } }
        ];
    }

    const comments = await Comment.find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .limit(pageSize + 1)
        .lean();

    const hasMore = comments.length > pageSize;
    if (hasMore) comments.pop();

    return {
        comments,
        hasMore,
        nextCursor: hasMore ? encodeCursor(comments[comments.length - 1]) : null
    };
};

const countArticleComments = (articleId) => Comment.countDocuments({ articleId });

const createArticleComment = async (articleId, body, sessionUser) => {
    await assertPublishedArticle(articleId);
    const { content, authorName } = validateNewComment(body);

    const comment = await Comment.create({
        articleId,
        content,
        // Logged-in users always comment under their account name.
        authorName: sessionUser?.username || authorName,
        author: sessionUser?._id || null
    });

    return {
        _id: comment._id,
        articleId: comment.articleId,
        content: comment.content,
        authorName: comment.authorName,
        createdAt: comment.createdAt
    };
};

// Moderation (deleting any comment) is for editors and admins. Used by the route guard
// and by the article page to decide whether to show the Delete buttons.
const MODERATOR_ROLES = ["editor", "admin"];
const canModerateComments = (user) => Boolean(user) && MODERATOR_ROLES.includes(String(user.role).toLowerCase());

const deleteComment = async (id) => {
    IDValidation(id);
    const deleted = await Comment.findByIdAndDelete(id).select(PUBLIC_FIELDS).lean();
    if (!deleted) {
        throw new AppError("Comment not found", 404);
    }
    return deleted;
};

// Removes every comment of an article. Meant to be called when the article itself is deleted,
// so it doesn't check that the article still exists. Internal only: no route exposes it.
const deleteArticleComments = async (articleId) => {
    IDValidation(articleId, "article");
    const { deletedCount } = await Comment.deleteMany({ articleId });
    return deletedCount;
};

const getComments = async (query = {}) => {
    const filter = {};
    if (query.articleId) {
        IDValidation(query.articleId, "article");
        filter.articleId = query.articleId;
    }

    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = parseLimit(query.limit);

    return await Comment.find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};

const getCommentByID = async (id) => {
    IDValidation(id);
    const comment = await Comment.findById(id).select(PUBLIC_FIELDS).lean();
    if (!comment) {
        throw new AppError("Comment not found", 404);
    }
    return comment;
};

module.exports = {
    getComments,
    getCommentByID,
    getArticleComments,
    countArticleComments,
    createArticleComment,
    deleteComment,
    deleteArticleComments,
    canModerateComments,
    MAX_CONTENT_LENGTH,
    MAX_NAME_LENGTH
};
