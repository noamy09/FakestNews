const express = require('express');
const router = express.Router();
const publicViewController = require('../controllers/publicViewController');

// Render public home feed
router.get('/', publicViewController.renderFeed);

// Render single article view
router.get('/:id', publicViewController.renderArticlePage);

module.exports = router;