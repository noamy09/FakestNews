const express = require("express");
const path = require("path");
const router = express.Router();

const articlesRoutes = require('./articlesRoutes');
const commentsRoutes = require('./commentsRoutes');
const notesRoutes = require('./notesRoutes');
const permissionsRoutes = require('./permissionsRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const usersRoutes = require('./usersRoutes');
const viewRoutes = require('./viewRoutes');

router.use('/', viewRoutes);
router.use('/articles', articlesRoutes);
router.use('/comments', commentsRoutes);
router.use('/notes', notesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/users', usersRoutes);

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "home.html"));
});

module.exports = router;