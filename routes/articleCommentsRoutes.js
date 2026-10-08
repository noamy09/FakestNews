const express = require('express');
const router = express.Router({ mergeParams: true });
const controller = require('../controllers/commentsController');
const deviceId = require('../middlewares/deviceId');
const commentRateLimiter = require('../middlewares/commentRateLimiter');

router.get('/', controller.listForArticle);
router.post('/', deviceId, commentRateLimiter, controller.createForArticle);

module.exports = router;
