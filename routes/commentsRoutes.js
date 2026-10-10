const express = require('express');
const router = express.Router();
const controller = require('../controllers/commentsController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Comments are created via the rate-limited /api/articles/:articleId/comments route.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
// Moderation: editors and admins only.
router.delete('/:id', requireAuth, requireRole('editor', 'admin'), controller.delete);

module.exports = router;
