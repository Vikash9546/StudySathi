import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

// XP thresholds for each level
const LEVEL_XP: Record<number, number> = {
  1: 0,
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
  7: 2200,
  8: 3100,
  9: 4200,
  10: 5500,
};

function calculateLevel(xp: number): number {
  let level = 1;
  for (const [lvl, threshold] of Object.entries(LEVEL_XP)) {
    if (xp >= threshold) level = Number(lvl);
  }
  return level;
}

const BADGE_DEFINITIONS = [
  {
    name: 'First Upload',
    description: 'Upload your first study document',
    icon: '📄',
  },
  { name: 'Quiz Master', description: 'Complete 10 quizzes', icon: '🏆' },
  { name: '100 Questions', description: 'Answer 100 questions', icon: '💯' },
  {
    name: '7-Day Streak',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
  },
  {
    name: '30-Day Streak',
    description: 'Maintain a 30-day study streak',
    icon: '⚡',
  },
  {
    name: 'Community Helper',
    description: 'Get 5 answers accepted in community',
    icon: '🤝',
  },
  { name: 'Top Performer', description: 'Reach Level 5', icon: '⭐' },
  { name: 'Flashcard Pro', description: 'Review 100 flashcards', icon: '🃏' },
  { name: 'Perfect Quiz', description: 'Score 100% on a quiz', icon: '🎯' },
  { name: 'Early Bird', description: 'Study before 7 AM', icon: '🌅' },
];

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private prisma: PrismaService) {}

  // ── Award XP ───────────────────────────────────────────────────────────────
  async awardXP(userId: string, amount: number, reason: string) {
    // Record XP event
    await this.prisma.xPEvent.create({ data: { userId, amount, reason } });

    // Update user XP and level
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    });

    const newLevel = calculateLevel(user.xp);
    if (newLevel > user.level) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { level: newLevel },
      });
      this.logger.log(`User ${userId} leveled up to ${newLevel}!`);
    }

    // Check badges
    await this.checkBadges(userId);

    return { xp: user.xp, level: newLevel, xpEarned: amount };
  }

  // ── Update daily streak ───────────────────────────────────────────────────
  async updateStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        streakCount: true,
        lastActiveDate: true,
        streakFreezeCount: true,
      },
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = user.lastActiveDate
      ? new Date(
          user.lastActiveDate.getFullYear(),
          user.lastActiveDate.getMonth(),
          user.lastActiveDate.getDate(),
        )
      : null;

    if (lastActive && lastActive.getTime() === today.getTime()) {
      return {
        streakCount: user.streakCount,
        message: 'Already counted today',
      };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = user.streakCount;
    if (!lastActive || lastActive < yesterday) {
      // Missed day — reset (or use freeze)
      if (user.streakFreezeCount > 0) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { streakFreezeCount: { decrement: 1 }, lastActiveDate: now },
        });
        return {
          streakCount: user.streakCount,
          message: 'Streak freeze used!',
        };
      }
      newStreak = 1;
    } else {
      newStreak = user.streakCount + 1;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { streakCount: newStreak, lastActiveDate: now },
    });

    // Check streak badges
    if (newStreak === 7) await this.awardBadge(userId, '7-Day Streak');
    if (newStreak === 30) await this.awardBadge(userId, '30-Day Streak');

    return { streakCount: newStreak };
  }

  // ── Get leaderboard ────────────────────────────────────────────────────────
  async getLeaderboard(type: 'weekly' | 'monthly' | 'global', userId: string) {
    let since: Date | undefined;
    if (type === 'weekly') {
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (type === 'monthly') {
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    if (since) {
      // XP earned in period
      const events = await this.prisma.xPEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 50,
      });

      const userIds = events.map((e) => e.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, avatarUrl: true, level: true },
      });

      return events.map((e, i) => ({
        rank: i + 1,
        user: users.find((u) => u.id === e.userId),
        xp: e._sum.amount,
        isCurrentUser: e.userId === userId,
      }));
    }

    // Global: all-time XP
    const users = await this.prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 50,
      select: { id: true, name: true, avatarUrl: true, xp: true, level: true },
    });

    return users.map((u, i) => ({
      rank: i + 1,
      user: u,
      xp: u.xp,
      isCurrentUser: u.id === userId,
    }));
  }

  // ── Get user stats ────────────────────────────────────────────────────────
  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, streakCount: true },
    });

    const badges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });

    const nextLevelXP =
      Object.values(LEVEL_XP).find((xp) => xp > (user?.xp ?? 0)) ?? null;

    return { ...user, badges, nextLevelXP };
  }

  // ── Check and award badges ────────────────────────────────────────────────
  async checkBadges(userId: string) {
    await this.ensureBadgesExist();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    const docCount = await this.prisma.document.count({ where: { userId } });
    const quizCount = await this.prisma.quizAttempt.count({
      where: { userId, status: 'EVALUATED' },
    });
    const flashcardReviews = await this.prisma.flashcardReview.count({
      where: { userId },
    });

    if (docCount >= 1) await this.awardBadge(userId, 'First Upload');
    if (quizCount >= 10) await this.awardBadge(userId, 'Quiz Master');
    if (flashcardReviews >= 100) await this.awardBadge(userId, 'Flashcard Pro');
    if ((user?.level ?? 0) >= 5) await this.awardBadge(userId, 'Top Performer');
  }

  private async awardBadge(userId: string, badgeName: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { name: badgeName },
    });
    if (!badge) return;

    try {
      await this.prisma.userBadge.create({
        data: { userId, badgeId: badge.id },
      });
      this.logger.log(`Badge awarded to ${userId}: ${badgeName}`);
    } catch {
      // Already has badge — ignore unique constraint error
    }
  }

  private async ensureBadgesExist() {
    for (const badge of BADGE_DEFINITIONS) {
      await this.prisma.badge.upsert({
        where: { name: badge.name },
        update: {},
        create: badge,
      });
    }
  }
}
