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

// Role-protected user management endpoints
router.get('/', requireAuth, requireRole('editor'), controller.getAll);
router.get('/:id', requireAuth, controller.getById);
router.put('/:id', requireAuth, requireRole('editor'), controller.update);
router.delete('/:id', requireAuth, requireRole('editor'), controller.delete);

module.exports = router;
