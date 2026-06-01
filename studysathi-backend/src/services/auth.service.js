import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../common/errors.js';
import { randomUUID } from 'crypto';
import { sendEmail } from '../common/mailer.js';
import { gamificationService } from './gamification.service.js';

export class AuthService {
  async register({ email, password, name }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        plan: 'FREE',
      },
    });

    const tokenPayload = { sub: user.id, email: user.email, plan: user.plan };
    const accessToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    // Save refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokenPayload = { sub: user.id, email: user.email, plan: user.plan };
    const accessToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    // Save refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(token) {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
      const stored = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Rotate: delete old, generate new
      await prisma.refreshToken.delete({ where: { id: stored.id } });

      const user = stored.user;
      const tokenPayload = { sub: user.id, email: user.email, plan: user.plan };
      const accessToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      });
      const newRefreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async logout(token) {
    await prisma.refreshToken.deleteMany({
      where: { token },
    });
    return { success: true };
  }

  async googleLogin(googleUser) {
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.avatarUrl,
          provider: 'GOOGLE',
          isEmailVerified: true,
        },
      });
    }

    const tokenPayload = { sub: user.id, email: user.email, plan: user.plan };
    const accessToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });
    const refreshToken = jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async sendVerificationEmail(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestError('User not found');
    if (user.isEmailVerified) throw new BadRequestError('Email is already verified');

    // Delete existing tokens
    await prisma.emailVerificationToken.deleteMany({ where: { email: user.email } });

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        email: user.email,
        token,
        expiresAt,
      },
    });

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your StudySathi Account',
      html: `<p>Hello ${user.name || 'Student'},</p>
             <p>Welcome to StudySathi! Please verify your email by clicking the link below:</p>
             <p><a href="${verifyUrl}">${verifyUrl}</a></p>
             <p>This link will expire in 24 hours.</p>`,
      text: `Hello,\n\nPlease verify your StudySathi account using the following link: ${verifyUrl}`,
    });

    return { success: true };
  }

  async verifyEmail(token) {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) throw new BadRequestError('User not found');

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: { isEmailVerified: true },
      }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    // Reward XP for email verification (+50 XP)
    await gamificationService.awardXP(user.id, 50, 'Verified Email Address');

    return { success: true };
  }

  async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to prevent email enumeration
      return { success: true };
    }

    // Delete existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Reset your StudySathi Password',
      html: `<p>Hello ${user.name || 'User'},</p>
             <p>We received a request to reset your password. Click the link below to set a new password:</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>If you did not request this, you can safely ignore this email.</p>
             <p>This link will expire in 1 hour.</p>`,
      text: `Hello,\n\nReset your password using the following link: ${resetUrl}`,
    });

    return { success: true };
  }

  async resetPassword(token, newPassword) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
    ]);

    return { success: true };
  }
}

export const authService = new AuthService();
