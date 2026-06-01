import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async sendPush(userId: string, title: string, body: string, data?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    // Save notification to DB
    await this.prisma.notification.create({
      data: { userId, type: data?.type || 'GENERAL', title, body, data },
    });

    if (!user?.pushToken) return;

    // Expo Push Notification
    try {
      const message = {
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      this.logger.log(`Push sent to ${userId}: ${result.data?.status}`);
    } catch (error) {
      this.logger.error(`Push failed for ${userId}: ${error.message}`);
    }
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async notifyFlashcardsDue(userId: string, count: number) {
    return this.sendPush(
      userId,
      '📚 Flashcards Due',
      `You have ${count} flashcards pending review today.`,
      { type: 'FLASHCARD_DUE' },
    );
  }

  async notifyQuizReady(userId: string, documentTitle: string) {
    return this.sendPush(
      userId,
      '🎯 Quiz Ready!',
      `Your quiz for "${documentTitle}" is ready to take.`,
      { type: 'QUIZ_READY' },
    );
  }

  async notifyLevelUp(userId: string, level: number) {
    return this.sendPush(
      userId,
      '🎉 Level Up!',
      `Congratulations! You reached Level ${level}!`,
      { type: 'LEVEL_UP', level },
    );
  }
}
