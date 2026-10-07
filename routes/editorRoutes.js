const express = require("express");
const router = express.Router();
const editorViewController = require("../controllers/editorViewController");

// Editor dashboard
router.get("/", editorViewController.renderDashboard);
router.get("/analytics", editorViewController.renderAnalytics);

module.exports = router;