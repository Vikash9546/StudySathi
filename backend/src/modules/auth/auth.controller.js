const { validationResult } = require('express-validator');
const authService = require('./auth.service');

class AuthController {
  async signup(req, res, next) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: errors.array().map((e) => e.msg).join(', '),
        });
      }

      const { email, password, name } = req.body;
      const result = await authService.signup({ email, password, name });

      return res.status(201).json({
        success: true,
        data: result,
        message: 'Account created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: errors.array().map((e) => e.msg).join(', '),
        });
      }

      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.id);

      return res.status(200).json({
        success: true,
        data: profile,
        message: 'Profile retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: errors.array().map((e) => e.msg).join(', '),
        });
      }

      const { name, bio, avatarUrl } = req.body;
      const profile = await authService.updateProfile(req.user.id, {
        name,
        bio,
        avatarUrl,
      });

      return res.status(200).json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          data: null,
          message: errors.array().map((e) => e.msg).join(', '),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
