import { prisma } from '../config/db.js';

export const LEVEL_XP = [0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5500];

export class GamificationService {
  async awardXP(userId, amount, reason) {
    // Log the XP award event
    await prisma.xPEvent.create({
      data: { userId, amount, reason },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });

    if (!user) return null;

    const newXP = user.xp + amount;
    let newLevel = user.level;

    while (newLevel < LEVEL_XP.length && newXP >= LEVEL_XP[newLevel]) {
      newLevel++;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXP,
        level: newLevel,
      },
    });

    // Run badge checks asynchronously
    this.checkBadges(userId).catch(err => console.error('Error awarding badge:', err));

    return updatedUser;
  }

  async checkBadges(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { quizAttempts: true },
    });

    if (!user) return;

    if (user.quizAttempts.length >= 1) {
      await this.assignBadge(userId, 'First Step', 'Started your first quiz attempt!', '🎬');
    }

    if (user.level >= 3) {
      await this.assignBadge(userId, 'Brainiac', 'Reached level 3!', '🧠');
    }

    if (user.streakCount >= 5) {
      await this.assignBadge(userId, 'Streak Master', 'Maintained a 5-day study streak!', '🔥');
    }
  }

  async assignBadge(userId, name, description, icon) {
    const badge = await prisma.badge.upsert({
      where: { name },
      update: {},
      create: { name, description, icon },
    });

    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id },
    });
  }

  async getLeaderboard(userId, type = 'weekly') {
    // For simplicity, sort by user's total XP
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        avatarUrl: true,
        streakCount: true,
      },
      orderBy: { xp: 'desc' },
      take: 20,
    });

    return users.map((user, index) => ({
      rank: index + 1,
      xp: user.xp,
      isCurrentUser: user.id === userId,
      user: {
        id: user.id,
        name: user.name,
        level: user.level,
        avatarUrl: user.avatarUrl,
        streakCount: user.streakCount,
      }
    }));
  }

  async getStats(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: {
          include: { badge: true },
        },
      },
    });

    if (!user) throw new Error('User not found');

    const nextXP = LEVEL_XP[user.level] || (user.level * 1500);

    return {
      xp: user.xp,
      level: user.level,
      streakCount: user.streakCount,
      badges: user.userBadges,
      nextLevelXP: nextXP,
    };
  }
}

export const gamificationService = new GamificationService();
