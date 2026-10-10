const express = require('express');
const router = express.Router();
const controller = require('../controllers/notesController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', requireAuth, requireRole('editor', 'admin'), controller.create);
router.put('/:id', requireAuth, requireRole('editor', 'admin'), controller.update);
router.delete('/:id', requireAuth, requireRole('editor', 'admin'), controller.delete);

module.exports = router;
