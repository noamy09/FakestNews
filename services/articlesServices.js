const Article = require("../models/articles");
const mongoose = require("mongoose");

// Helper functions:
const allowedStatuses = ["draft", "published", "rejected"];

const articleValidation = (article) => {
    if (article === null || article === undefined) {
        throw new Error("Article is null", 400);
    }
    if (article.title === null || article.title === undefined) {
        throw new Error("Article title is missing", 400);
    }
    if (article.content === null || article.content === undefined) {
        throw new Error("Article content is missing", 400);
    }
    if (article.category === null || article.category === undefined) {
        throw new Error("Article category is missing", 400);
    }
    if (article.summary === null || article.summary === undefined) {
        throw new Error("Article summary is missing", 400);
    }
    if (article.author === null || article.author === undefined) {
        throw new Error("Article author is missing", 400);
    }
    if (article.status && !allowedStatuses.includes(article.status)) {
        throw new Error(`Invalid status: ${article.status}`, 400);
    }
}

const IDValidation = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid article ID", 400);
    }
}

// Services:

const getArticles = async (query = {}) => {
    const filter = {};
    const allowedFilters = ['category', 'author', 'status', 'title', 'page', 'limit'];

    let sort = { createdAt: -1 };

    if (query.sortBy) {
        try {
            const sortBy = JSON.parse(query.sortBy);
            if (sortBy.field === "createdAt" || sortBy.field === "views") {
                if (sortBy.order) {
                    if (sortBy.order === -1 || sortBy.order === 1) {
                        sort = { [sortBy.field]: sortBy.order };
                    } else {
                        throw new Error("Invalid sort order", 400);
                    }
                } else {
                    sort = { [sortBy.field]: -1 };
                }
            } else {
                throw new Error("Invalid sort parameter", 400);
            }
        } catch (error) {
            throw new Error("Invalid sort parameters", 400);
        }
    }

    allowedFilters.forEach(field => {
        if (query[field]) {
            filter[field] = query[field];
        }
    });

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    return await Article.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

const getArticleById = async (id) => {
    IDValidation(id);
    const article = await Article.findById(id);
    if (!article) {
        throw new Error("Article not found", 404);
    }
    return article;
}

const createArticle = async (article) => {
    articleValidation(article);
    const newArticle = new Article(article);
    return await newArticle.save();
}

const updateArticle = async (id, article) => {
    IDValidation(id);
    if (article === null || article === undefined) {
        throw new Error("No changes were given", 400);
    }
    const updatedArticle = await Article.findByIdAndUpdate(
        id, article, { new: true, runValidators: true });
    if (!updatedArticle) {
        throw new Error("Article not found", 404);
    }
    return updatedArticle;
}

const deleteArticle = async (id) => {
    IDValidation(id);
    const deletedArticle = await Article.findByIdAndDelete(id);
    if (!deletedArticle) {
        throw new Error("Article not found", 404);
    }
    return deletedArticle;
}

module.exports = {
    getArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle
}

