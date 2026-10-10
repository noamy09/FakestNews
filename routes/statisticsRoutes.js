const express = require("express");

const router = express.Router();

const controller = require(
    "../controllers/statisticsController"
);

// Returns analytics data for a specific article
router.get(
    "/article/:articleId",
    controller.getByArticleId
);

module.exports = router;
