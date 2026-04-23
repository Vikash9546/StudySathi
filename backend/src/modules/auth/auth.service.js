const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Register a new user.
   *
   * @param {{ email: string, password: string, name?: string }} data
   * @returns {{ user: object, token: string }}
   */
  async signup({ email, password, name }) {
    // Check for existing user
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await authRepository.create({
      email,
      password: hashedPassword,
      name: name || '',
    });

    const token = this._generateToken(user);

    logger.info(`New user registered: ${email}`);

    return {
      user: { id: user._id, email: user.email, name: user.name },
      token,
    };
  }

  /**
   * Authenticate user and return a token.
   *
   * @param {{ email: string, password: string }} data
   * @returns {{ user: object, token: string }}
   */
  async login({ email, password }) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = this._generateToken(user);

    logger.info(`User logged in: ${email}`);

    return {
      user: { id: user._id, email: user.email, name: user.name },
      token,
    };
  }

  /**
   * Get the current user's profile.
   */
  async getProfile(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update the current user's profile (name, bio, avatarUrl).
   *
   * @param {string} userId
   * @param {{ name?: string, bio?: string, avatarUrl?: string }} data
   */
  async updateProfile(userId, data) {
    // Whitelist allowed fields
    const allowed = {};
    if (data.name !== undefined) allowed.name = data.name;
    if (data.bio !== undefined) allowed.bio = data.bio;
    if (data.avatarUrl !== undefined) allowed.avatarUrl = data.avatarUrl;

    if (Object.keys(allowed).length === 0) {
      const error = new Error('No valid fields to update');
      error.statusCode = 400;
      throw error;
    }

    const user = await authRepository.updateById(userId, allowed);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info(`Profile updated for user ${userId}`);

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  /**
   * Change the current user's password.
   *
   * @param {string} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findByIdWithPassword(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await authRepository.updateById(userId, { password: hashedPassword });

    logger.info(`Password changed for user ${userId}`);

    return { message: 'Password changed successfully' };
  }

  /**
   * Generate a JWT for the given user.
   */
  _generateToken(user) {
    return jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new AuthService();
