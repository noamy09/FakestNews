const AppError = require("../utils/AppError");
const ArticleStatistics = require("../models/statistics");
const mongoose = require("mongoose");

// Validates that the given ID is a valid MongoDB ObjectId
const IDValidation = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid article ID", 400);
    }
};

// Returns all view statistics for a specific article,
// ordered chronologically for the analytics graph
const getStatisticsByArticleId = async (articleId) => {
    IDValidation(articleId);

    return await ArticleStatistics.find({ articleId })
        .sort({ timestamp: 1 });
};

module.exports = {
    getStatisticsByArticleId
};