const express = require('express');
const router = express.Router();
const articlesRoutes = require('./articlesRoutes');
const commentsRoutes = require('./commentsRoutes');
const notesRoutes = require('./notesRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const usersRoutes = require('./usersRoutes');
const viewRoutes = require('./viewRoutes');
const publicViewController = require('../controllers/publicViewController');
const usersController = require('../controllers/usersController');
const adminHubRoutes = require('./adminHubRoutes');
const weatherRoutes = require('./weatherRoutes');
const editorRoutes = require('./editorRoutes');
const writersHubRoutes = require('./writersHubRoutes');

// Public Feed & Hubs
router.get('/', publicViewController.renderFeed);
router.use('/WritersHub', writersHubRoutes);
router.use('/AdminHub', adminHubRoutes);
router.use('/EditorsHub', editorRoutes);
router.use('/articles', viewRoutes);

// Auth View & Form Routes
router.get('/login', (req, res) => res.render('login'));
router.post('/login', usersController.login);

/* Api Routes */
router.use('/api/articles', articlesRoutes);
router.use('/api/weather', weatherRoutes);
router.use('/api/comments', commentsRoutes);
router.use('/api/notes', notesRoutes);
router.use('/api/statistics', statisticsRoutes);
router.use('/api/users', usersRoutes);

module.exports = router;