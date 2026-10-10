const express = require('express');
const router = express.Router();
const controller = require('../controllers/writersHubController');

// Dashboard view
router.get('/', controller.requireWriterPage, controller.renderHub);

// Create new article view
router.get('/new', controller.requireWriterPage, controller.renderNewArticle);

// Edit article view
router.get('/edit/:id', controller.requireWriterPage, controller.renderEditArticle);

// Image management endpoints
router.post('/upload-image', controller.uploadImage);
router.post('/remove-image', controller.removeImage);

module.exports = router;