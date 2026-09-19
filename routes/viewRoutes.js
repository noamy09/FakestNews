const express = require('express');
const router = express.Router();
const publicViewController = require('../controllers/publicViewController');

router.get('/', publicViewController.renderHomePage);
router.get('/articles/view/:id', publicViewController.renderArticlePage);

module.exports = router;