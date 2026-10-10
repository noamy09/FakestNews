const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlesController');
const commentsController = require('../controllers/commentsController');
const { requireAuth, requireRole } = require('../middlewares/auth');
const deviceId = require('../middlewares/deviceId');
const commentRateLimiter = require('../middlewares/commentRateLimiter');

router.get('/', controller.getAll);
router.get('/categories', controller.getCategories);
router.get('/:id', controller.getById);

// Comments of an article (spec §7). Posting is open to guests, limited to 3 per minute per device/user.
router.get('/:articleId/comments', commentsController.listForArticle);
router.post('/:articleId/comments', deviceId, commentRateLimiter, commentsController.createForArticle);

// Protected routes using single-fetch service-layer ownership & RBAC validation
router.post('/', requireAuth, requireRole('reporter', 'editor', 'admin'), controller.create);
router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;