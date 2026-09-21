const express = require("express");
const router = express.Router();
const articlesRoutes = require('./articlesRoutes');
const commentsRoutes = require('./commentsRoutes');
const notesRoutes = require('./notesRoutes');
const permissionsRoutes = require('./permissionsRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const usersRoutes = require('./usersRoutes');
const { handleArticlesFeed } = require('../utils/publicArticlesUtil');

router.get("/", handleArticlesFeed);
router.use('/articles', articlesRoutes);
router.use('/comments', commentsRoutes);
router.use('/notes', notesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/users', usersRoutes);

module.exports = router;