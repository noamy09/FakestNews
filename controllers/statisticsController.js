const statisticsService = require(
    "../services/statisticsServices.js"
);

// Returns the view statistics and published update history
// of a specific article for the editor analytics dashboard
exports.getByArticleId = async (req, res) => {
    try {
        const statistics =
            await statisticsService.getStatisticsByArticleId(
                req.params.articleId
            );

        res.status(200).json(statistics);
    } catch (error) {
        res.status(
            error.statusCode || 500
        ).json({
            message:
                "Error fetching article statistics",
            error: error.message
        });
    }
};