const express = require("express");
const path = require("path");
const router = express.Router();

const articlesRoutes = require('./articlesRoutes');
const commentsRoutes = require('./commentsRoutes');
const notesRoutes = require('./notesRoutes');

// Temp out till permissions are made
// const permissionsRoutes = require('./permissionsRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const usersRoutes = require('./usersRoutes');

router.use('/articles', articlesRoutes);
router.use('/comments', commentsRoutes);
router.use('/notes', notesRoutes);

// Temp out till permissions are made
// router.use('/permissions', permissionsRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/users', usersRoutes);

router.get("/", (req, res) => {
    res.redirect("/articles/public");
});

module.exports = router;