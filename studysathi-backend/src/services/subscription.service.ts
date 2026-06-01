import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return { subscription: sub, plan: user?.plan || 'FREE' };
  }

  async upgradeToPro(
    userId: string,
    paymentData: { gateway: string; externalId: string },
  ) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: 'PRO' },
    });

    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodEnd: expiresAt,
        paymentGateway: paymentData.gateway,
        externalId: paymentData.externalId,
      },
      create: {
        userId,
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodEnd: expiresAt,
        paymentGateway: paymentData.gateway,
        externalId: paymentData.externalId,
      },
    });

    return { message: 'Upgraded to Pro successfully', subscription: sub };
  }

  async enforcePlanLimit(
    userId: string,
    feature: 'upload' | 'aiTutor' | 'flashcard',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (user?.plan === 'PRO') return true;

    // Free plan limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (feature === 'upload') {
      const count = await this.prisma.document.count({
        where: { userId, createdAt: { gte: today } },
      });
      if (count >= 5) {
        throw new ForbiddenException(
          'Free plan: 5 uploads per day. Upgrade to Pro.',
        );
      }
    }

    if (feature === 'aiTutor') {
      const count = await this.prisma.aITutorSession.count({
        where: { userId, createdAt: { gte: today } },
      });
      if (count >= 10) {
        throw new ForbiddenException(
          'Free plan: 10 AI tutor queries per day. Upgrade to Pro.',
        );
      }
    }

    return true;
  }
}
