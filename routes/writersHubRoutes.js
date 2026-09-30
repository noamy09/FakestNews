const express = require('express');
const router = express.Router();
const controller = require('../controllers/writersHubController');

router.get('/', controller.renderHub);
router.get('/new', controller.renderNewArticle);
router.get('/edit/:id', controller.renderEditArticle);

// Image handling
router.post('/upload-image', controller.uploadImage);
router.post('/remove-image', controller.removeImage);

module.exports = router;
