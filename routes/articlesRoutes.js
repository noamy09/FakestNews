const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlesController');
const { handleArticlesFeed, handleSingleArticle } = require('../utils/publicArticlesUtil');

router.get('/', publicViewController.renderHomePage);
router.post('/', controller.create);
router.put('/:id/autosave', controller.autosave);
router.post('/:id/submit', controller.submit);
router.post('/:id/review', controller.review);
router.post('/:id/approve', controller.approve);
router.delete('/:id', controller.delete);

module.exports = router;