const express = require('express');
const router = express.Router();
const controller = require('../controllers/commentsController');

// Read-only: comments are created via the rate-limited /api/articles/:articleId/comments route.
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

module.exports = router;
