const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlesController');

router.get('/public', controller.getPublicFeed);
router.get('/api/feed', controller.getApiArticles);
router.get('/view/:id', controller.getPublicArticle);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;