const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateLogin } = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authMiddleware, authController.getMe);
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
