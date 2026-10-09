const express = require('express');
const router = express.Router();
const controller = require('../controllers/commentsController');
const requireCommentModerator = require('../middlewares/requireCommentModerator');

// Comments are created via the rate-limited /api/articles/:articleId/comments route.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
// Moderation: editors and admins only.
router.delete('/:id', requireCommentModerator, controller.delete);

module.exports = router;
