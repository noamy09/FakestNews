const express = require("express");
const router = express.Router();
const editorViewController = require("../controllers/editorViewController");
const { requireAuth, requireRole } = require("../middlewares/auth");

router.use(requireAuth, requireRole("editor", "admin"));

// Editor dashboard
router.get("/", editorViewController.renderDashboard);
router.get("/analytics", editorViewController.renderAnalytics);

module.exports = router;
