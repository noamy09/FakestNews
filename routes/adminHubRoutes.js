const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminHubController');

router.get('/', controller.requireAdminPage, controller.renderHub);

module.exports = router;
