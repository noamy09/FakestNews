const express = require('express');
const router = express.Router();
const controller = require('../controllers/articlesController');
const { requireAuth, requireRole, requireOwnership } = require('../middlewares/auth');

router.get('/', controller.getAll);
router.get('/categories', controller.getCategories);
router.get('/:id', controller.getById);

router.post('/', requireAuth, requireRole('reporter', 'editor'), controller.create);
router.put('/:id', requireAuth, requireOwnership, controller.update);
router.delete('/:id', requireAuth, requireRole('editor'), controller.delete);

module.exports = router;