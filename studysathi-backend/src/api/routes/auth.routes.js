import { Router } from 'express';
import { authService } from '../../services/auth.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { successResponse } from '../../common/response.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register({ email, password, name });
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json(successResponse({ message: 'Logged out successfully' }));
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(successResponse({ user: req.currentUser }));
  } catch (err) {
    next(err);
  }
});

router.post('/send-verification', requireAuth, async (req, res, next) => {
  try {
    const result = await authService.sendVerificationEmail(req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const { email, name, avatarUrl } = req.body; // In mobile auth, frontend sends user info after validating google client token.
    if (!email) {
      return next(new Error('Email is required for Google login'));
    }
    const result = await authService.googleLogin({ email, name, avatarUrl });
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;
