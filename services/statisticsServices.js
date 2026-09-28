const AppError = require("../utils/AppError");
const ArticleStatistics = require("../models/statistics");
const Article = require("../models/articles");
const mongoose = require("mongoose");

// Validates that the given ID is a valid MongoDB ObjectId
const IDValidation = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid article ID", 400);
    }
};

// Returns the view statistics and published update history
// of a specific article for the editor analytics dashboard
const getStatisticsByArticleId = async (articleId) => {
    IDValidation(articleId);

    const article = await Article.findById(articleId)
        .select("updatesHistory");

    if (!article) {
        throw new AppError("Article not found", 404);
    }

    const views = await ArticleStatistics.find({ articleId })
        .sort({ timestamp: 1 });

    return {
        views,
        updates: article.updatesHistory
    };
};

module.exports = {
    getStatisticsByArticleId
};