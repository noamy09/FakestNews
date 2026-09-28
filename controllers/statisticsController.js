// Simple controller for statistics
const statisticsService = require("../services/statisticsServices.js");
exports.getAll = (req, res) => {
    res.json({ message: "Get all statistics" });
};

exports.getById = (req, res) => {
    res.json({ message: "Get statistics by id " + req.params.id });
};

exports.create = (req, res) => {
    res.json({ message: "Create new statistics" });
};

exports.update = (req, res) => {
    res.json({ message: "Update statistics " + req.params.id });
};

exports.delete = (req, res) => {
    res.json({ message: "Delete statistics " + req.params.id });
};
// Returns the view statistics of a specific article
exports.getByArticleId = async (req, res) => {
    try {
        const statistics = await statisticsService.getStatisticsByArticleId(
            req.params.articleId
        );

        res.status(200).json(statistics);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: `Error fetching statistics for article ${req.params.articleId}`,
            error: error.message
        });
    }
};