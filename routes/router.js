const express = require('express');
const router = express.Router();
const articlesRoutes = require('./articlesRoutes');
const commentsRoutes = require('./commentsRoutes');
const notesRoutes = require('./notesRoutes');
const permissionsRoutes = require('./permissionsRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const usersRoutes = require('./usersRoutes');
const viewRoutes = require('./viewRoutes');
const publicViewController = require('../controllers/publicViewController');
const writersHubRoutes = require('./writersHubRoutes');

router.get('/', publicViewController.renderFeed);
router.use('/WritersHub', writersHubRoutes);
router.use('/articles', viewRoutes);
/* Api Routes*/
router.use('/api/articles', articlesRoutes);
router.use('/api/comments', commentsRoutes);
router.use('/api/notes', notesRoutes);
router.use('/api/permissions', permissionsRoutes);
router.use('/api/statistics', statisticsRoutes);
router.use('/api/users', usersRoutes);

module.exports = router;