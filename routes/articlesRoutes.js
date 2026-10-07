const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlesController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/', controller.getAll);
router.get('/categories', controller.getCategories);
router.get('/:id', controller.getById);

// Protected routes using single-fetch service-layer ownership & RBAC validation
router.post('/', requireAuth, requireRole('reporter', 'editor', 'admin'), controller.create);
router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.delete);

module.exports = router;