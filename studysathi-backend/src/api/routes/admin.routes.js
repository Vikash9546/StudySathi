import { Router } from 'express';
import { prisma } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { successResponse } from '../../common/response.js';
import { NotFoundError } from '../../common/errors.js';
import os from 'os';

const router = Router();

// Protect all admin endpoints
router.use(requireAuth, requireRole(['ADMIN']));

// List and search users
router.get('/users', async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        xp: true,
        level: true,
        streakCount: true,
        isEmailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(successResponse(users));
  } catch (err) {
    next(err);
  }
});

// Update subscription plan for a user manually
router.patch('/users/:id/plan', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan } = req.body; // 'FREE' | 'PRO'

    if (!['FREE', 'PRO'].includes(plan)) {
      return next(new Error('Invalid plan selection'));
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { plan },
    });

    // If upgraded to PRO, upsert subscription details
    if (plan === 'PRO') {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.subscription.upsert({
        where: { userId: id },
        update: { plan: 'PRO', status: 'ACTIVE', currentPeriodEnd: periodEnd },
        create: { userId: id, plan: 'PRO', status: 'ACTIVE', currentPeriodEnd: periodEnd }
      });
    } else {
      await prisma.subscription.deleteMany({ where: { userId: id } });
    }

    res.json(successResponse({ user: { id: updated.id, email: updated.email, plan: updated.plan } }));
  } catch (err) {
    next(err);
  }
});

// AI Usage and Cost Metrics
router.get('/ai-usage', async (req, res, next) => {
  try {
    const logs = await prisma.aIUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Compute aggregated metrics
    const aggregates = await prisma.aIUsageLog.aggregate({
      _sum: {
        promptTokens: true,
        outputTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      }
    });

    // Group costs by task type
    const taskBreakdown = await prisma.aIUsageLog.groupBy({
      by: ['task'],
      _sum: {
        costUsd: true,
        promptTokens: true,
        outputTokens: true,
      },
      _count: true,
    });

    res.json(successResponse({
      recentLogs: logs,
      totals: {
        totalRequests: aggregates._count.id,
        promptTokens: aggregates._sum.promptTokens || 0,
        outputTokens: aggregates._sum.outputTokens || 0,
        costUsd: aggregates._sum.costUsd || 0,
      },
      taskBreakdown,
    }));
  } catch (err) {
    next(err);
  }
});

// System Health and Telemetry Check
router.get('/system-health', async (req, res, next) => {
  try {
    // 1. Database connection check
    let dbStatus = 'UP';
    let dbPingStart = Date.now();
    let dbPing = 0;
    try {
      await prisma.$executeRaw`SELECT 1`;
      dbPing = Date.now() - dbPingStart;
    } catch (err) {
      dbStatus = 'DOWN';
    }

    // 2. Redis status check
    let redisStatus = 'UP';
    try {
      await redis.ping();
    } catch (err) {
      redisStatus = 'DOWN';
    }

    res.json(successResponse({
      status: dbStatus === 'UP' && redisStatus === 'UP' ? 'HEALTHY' : 'DEGRADED',
      database: {
        status: dbStatus,
        latencyMs: dbPing,
      },
      redis: {
        status: redisStatus,
      },
      telemetry: {
        uptimeSec: os.uptime(),
        freeMemBytes: os.freemem(),
        totalMemBytes: os.totalmem(),
        cpuLoadAvg: os.loadavg(), // [1m, 5m, 15m]
      }
    }));
  } catch (err) {
    next(err);
  }
});

export default router;
