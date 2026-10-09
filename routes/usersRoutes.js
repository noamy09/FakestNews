const express = require('express');
const router = express.Router();
const controller = require('../controllers/usersController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Public authentication endpoint (accounts are created by admins only, via the Admin Hub)
router.post('/login', controller.login);

// Session-protected auth endpoints
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.getMe);

// IDOR-protected user profile endpoint (self or editor/admin)
router.get('/:id', requireAuth, controller.getById);

// Admin-only user management endpoints (create, search/list, delete)
router.post('/', requireAuth, requireRole('admin'), controller.createUser);
router.get('/', requireAuth, requireRole('admin'), controller.getAll);
router.put('/:id', requireAuth, controller.update); // Internal self/management check in controller
router.delete('/:id', requireAuth, requireRole('admin'), controller.delete);

module.exports = router;
