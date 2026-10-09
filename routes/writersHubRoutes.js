const express = require('express');
const router = express.Router();
const controller = require('../controllers/writersHubController');

router.get('/', controller.requireWriterPage, controller.renderHub);
router.get('/new', controller.requireWriterPage, controller.renderNewArticle);
router.get('/edit/:id', controller.requireWriterPage, controller.renderEditArticle);

// Image handling
router.post('/upload-image', controller.uploadImage);
router.post('/remove-image', controller.removeImage);

module.exports = router;