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
const articleCommentsRoutes = require('./articleCommentsRoutes');
const weatherRoutes = require('./weatherRoutes');
const deviceId = require('../middlewares/deviceId');

router.get('/', publicViewController.renderFeed);
router.use('/WritersHub', writersHubRoutes);
// deviceId: readers get their anti-spam cookie before they ever post a comment
router.use('/articles', deviceId, viewRoutes);
/* Api Routes*/
router.use('/api/articles/:articleId/comments', articleCommentsRoutes);
router.use('/api/articles', articlesRoutes);
router.use('/api/weather', weatherRoutes);
router.use('/api/comments', commentsRoutes);
router.use('/api/notes', notesRoutes);
router.use('/api/permissions', permissionsRoutes);
router.use('/api/statistics', statisticsRoutes);
router.use('/api/users', usersRoutes);

module.exports = router;