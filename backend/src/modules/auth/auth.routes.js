const { Router } = require('express');
const authController = require('./auth.controller');
const {
  signupValidation,
  loginValidation,
  profileUpdateValidation,
  changePasswordValidation,
} = require('./auth.validation');
const authMiddleware = require('../../middleware/auth.middleware');

const router = Router();

// ─── Public routes ───
router.post('/signup', signupValidation, authController.signup.bind(authController));
router.post('/login', loginValidation, authController.login.bind(authController));

// ─── Protected profile routes ───
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));
router.put(
  '/profile',
  authMiddleware,
  profileUpdateValidation,
  authController.updateProfile.bind(authController)
);
router.put(
  '/profile/password',
  authMiddleware,
  changePasswordValidation,
  authController.changePassword.bind(authController)
);

module.exports = router;
