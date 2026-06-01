import { prisma } from '../config/db.js';

export class NotificationService {
  async registerPushToken(userId, token) {
    return prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
  }

  async sendNotification(userId, title, body, type = 'SYSTEM', data = null) {
    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data: data || {},
      }
    });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    if (user && user.pushToken) {
      // Mock log push alert dispatch for simulation
      console.log(`[Expo Push Alert] Dispatched to token ${user.pushToken}: "${title}" - "${body}"`);
    }

    return notif;
  }

  async getNotifications(userId) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async readNotification(userId, id) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async readAll(userId) {
    return prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }
}

export const notificationService = new NotificationService();
