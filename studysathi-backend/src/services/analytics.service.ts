import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getUserAnalytics(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [attempts, flashcardReviews, xpEvents, topicPerformances, documents] =
      await Promise.all([
        this.prisma.quizAttempt.findMany({
          where: { userId, startedAt: { gte: since }, status: 'EVALUATED' },
          select: {
            accuracy: true,
            score: true,
            timeTaken: true,
            completedAt: true,
            xpEarned: true,
          },
          orderBy: { completedAt: 'asc' },
        }),
        this.prisma.flashcardReview.findMany({
          where: { userId, reviewedAt: { gte: since } },
          select: { rating: true, reviewedAt: true },
          orderBy: { reviewedAt: 'asc' },
        }),
        this.prisma.xPEvent.findMany({
          where: { userId, createdAt: { gte: since } },
          select: { amount: true, reason: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.topicPerformance.findMany({
          where: { userId },
          orderBy: { accuracy: 'desc' },
        }),
        this.prisma.document.count({ where: { userId } }),
      ]);

    const totalQuestionsAnswered = attempts.reduce(
      (sum, a) => sum + (a.score || 0),
      0,
    );
    const avgAccuracy =
      attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) /
          attempts.length
        : 0;
    const totalXP = xpEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalStudyTimeMins = attempts.reduce(
      (sum, a) => sum + Math.round((a.timeTaken || 0) / 60),
      0,
    );

    // Daily accuracy trend
    const dailyTrend = this.buildDailyTrend(attempts, days);

    // Subject performance from topic data
    const subjectPerformance = topicPerformances.slice(0, 10).map((t) => ({
      topic: t.topic,
      accuracy: Math.round(t.accuracy),
      attempts: t.totalAttempts,
    }));

    return {
      summary: {
        totalQuizzes: attempts.length,
        totalQuestionsAnswered,
        avgAccuracy: Math.round(avgAccuracy),
        totalXP,
        totalStudyTimeMins,
        flashcardsReviewed: flashcardReviews.length,
        documentsUploaded: documents,
      },
      dailyAccuracyTrend: dailyTrend,
      subjectPerformance,
      xpHistory: xpEvents.slice(-20),
    };
  }

  private buildDailyTrend(attempts: any[], days: number) {
    const trend: Record<string, { correct: number; total: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      trend[key] = { correct: 0, total: 0 };
    }
    for (const attempt of attempts) {
      if (!attempt.completedAt) continue;
      const key = new Date(attempt.completedAt).toISOString().split('T')[0];
      if (trend[key]) {
        trend[key].total++;
        if ((attempt.accuracy || 0) >= 60) trend[key].correct++;
      }
    }
    return Object.entries(trend)
      .map(([date, data]) => ({
        date,
        accuracy:
          data.total > 0 ? Math.round((data.correct / data.total) * 100) : null,
        quizzes: data.total,
      }))
      .reverse();
  }
}
