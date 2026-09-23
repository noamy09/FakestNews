const express = require('express');
const router = express.Router();
const publicViewController = require('../controllers/publicViewController');

router.get('/', publicViewController.renderFeed);
router.get('/:id', publicViewController.renderArticle);

module.exports = router;