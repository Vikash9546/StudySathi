import { prisma } from '../config/db.js';
import { gamificationService } from './gamification.service.js';

export class ProfileService {
  async getProfile(userId) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  async updateProfile(userId, data) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async submitOnboarding(userId, { examGoal, subjects, dailyTargetMins, examDate }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const alreadyDone = user.onboardingDone;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        examGoal,
        subjects,
        dailyTargetMins,
        examDate: examDate ? new Date(examDate) : null,
        onboardingDone: true,
      }
    });

    if (!alreadyDone) {
      await gamificationService.awardXP(userId, 50, 'Completed Onboarding Setup');
    }

    return updated;
  }
}

export const profileService = new ProfileService();
