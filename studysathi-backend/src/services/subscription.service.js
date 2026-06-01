import { prisma } from '../config/db.js';

export class SubscriptionService {
  async upgradeUser(userId, gateway, externalId) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { plan: 'PRO' },
      });

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await tx.subscription.upsert({
        where: { userId },
        update: {
          plan: 'PRO',
          status: 'ACTIVE',
          currentPeriodEnd: periodEnd,
          paymentGateway: gateway,
          externalId,
        },
        create: {
          userId,
          plan: 'PRO',
          status: 'ACTIVE',
          currentPeriodEnd: periodEnd,
          paymentGateway: gateway,
          externalId,
        }
      });

      return user;
    });
  }

  async getSubscription(userId) {
    return prisma.subscription.findUnique({ where: { userId } });
  }
}

export const subscriptionService = new SubscriptionService();
