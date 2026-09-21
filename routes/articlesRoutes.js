const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlesController');
const { handleArticlesFeed, handleSingleArticle } = require('../utils/publicArticlesUtil');

router.get('/', publicViewController.renderHomePage);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;