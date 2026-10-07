const express = require('express');
const router = express.Router();
const controller = require('../controllers/usersController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Public authentication endpoints
router.post('/register', controller.register);
router.post('/login', controller.login);

// Session-protected auth endpoints
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.getMe);

// IDOR-protected user profile endpoint (self or editor/admin)
router.get('/:id', requireAuth, controller.getById);

// Role-protected user management endpoints
router.get('/', requireAuth, requireRole('editor', 'admin'), controller.getAll);
router.put('/:id', requireAuth, controller.update); // Internal self/management check in controller
router.delete('/:id', requireAuth, requireRole('editor', 'admin'), controller.delete);

module.exports = router;
