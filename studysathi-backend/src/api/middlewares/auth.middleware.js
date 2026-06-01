import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../common/errors.js';
import { prisma } from '../../config/db.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = payload; // sub, email, plan
  } catch (err) {
    // Invalid or expired token - leave req.user undefined
  }
  next();
}

export async function requireAuth(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication token is missing or expired'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isEmailVerified: true,
        streakCount: true,
        xp: true,
        level: true,
        examGoal: true,
        subjects: true,
        dailyTargetMins: true,
        examDate: true,
        onboardingDone: true,
        avatarUrl: true
      },
    });

    if (!user) {
      return next(new UnauthorizedError('User session not found'));
    }

    req.currentUser = user;
    next();
  } catch (err) {
    next(err);
  }
}
