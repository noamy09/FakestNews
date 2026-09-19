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

<<<<<<< HEAD
router.use('/api/articles', articlesRoutes);
router.use('/api/comments', commentsRoutes);
router.use('/api/notes', notesRoutes);
router.use('/api/permissions', permissionsRoutes);
router.use('/api/statistics', statisticsRoutes);
router.use('/api/users', usersRoutes);
=======
router.use('/', viewRoutes);
router.use('/articles', articlesRoutes);
router.use('/comments', commentsRoutes);
router.use('/notes', notesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/users', usersRoutes);
>>>>>>> 7ed08ea (Public feed, infinite scroll, Ajax filters, article SEO & UI Styling)

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "home.html"));
});

module.exports = router;