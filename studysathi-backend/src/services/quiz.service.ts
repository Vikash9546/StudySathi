import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';
import { GamificationService } from './gamification.service';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
    private gamification: GamificationService,
  ) {}

  // ── Create quiz from document ──────────────────────────────────────────────
  async createDocumentQuiz(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const questions = await this.prisma.question.findMany({
      where: { documentId, type: 'MCQ' },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        'No questions generated yet. Please wait for processing.',
      );
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        title: `Quiz: ${doc.title}`,
        type: 'DOCUMENT',
        documentId,
        questionIds: questions.map((q) => q.id),
      },
    });

    return { quiz, questions };
  }

  // ── Create daily quiz ──────────────────────────────────────────────────────
  async createDailyQuiz(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for existing daily challenge
    let daily = await this.prisma.dailyChallenge.findUnique({
      where: { date: today },
    });

    if (!daily) {
      // Get random questions from user's documents
      const userDocs = await this.prisma.document.findMany({
        where: { userId, status: 'READY' },
        select: { id: true },
      });
      const docIds = userDocs.map((d) => d.id);

      const questions = await this.prisma.question.findMany({
        where: { documentId: { in: docIds }, type: 'MCQ' },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      daily = await this.prisma.dailyChallenge.create({
        data: { date: today, questionIds: questions.map((q) => q.id) },
      });
    }

    const questions = await this.prisma.question.findMany({
      where: { id: { in: daily.questionIds } },
    });

    // Create quiz
    const quiz = await this.prisma.quiz.create({
      data: {
        title: `Daily Challenge — ${today.toDateString()}`,
        type: 'DAILY',
        questionIds: daily.questionIds,
      },
    });

    return { quiz, questions: this.shuffleOptions(questions) };
  }

  // ── Start quiz attempt ─────────────────────────────────────────────────────
  async startAttempt(userId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const attempt = await this.prisma.quizAttempt.create({
      data: { userId, quizId, status: 'IN_PROGRESS' },
    });

    const questions = await this.prisma.question.findMany({
      where: { id: { in: quiz.questionIds } },
      select: {
        id: true,
        question: true,
        options: true,
        type: true,
        difficulty: true,
        topic: true,
        // Do NOT include correctAnswer here
      },
    });

    return { attempt, questions: this.shuffleOptions(questions) };
  }

  // ── Submit quiz attempt ────────────────────────────────────────────────────
  async submitAttempt(
    userId: string,
    attemptId: string,
    answers: { questionId: string; answer: string; timeTaken?: number }[],
  ) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { quiz: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Attempt already submitted');
    }

    let correctCount = 0;
    const answerRecords = [];

    for (const ans of answers) {
      const question = await this.prisma.question.findUnique({
        where: { id: ans.questionId },
      });
      if (!question) continue;

      let isCorrect: boolean | null = null;
      if (question.type === 'MCQ') {
        isCorrect = question.correctAnswer === ans.answer;
        if (isCorrect) correctCount++;
      }

      answerRecords.push({
        attemptId,
        questionId: ans.questionId,
        userAnswer: ans.answer,
        isCorrect,
        timeTaken: ans.timeTaken,
      });
    }

    await this.prisma.attemptAnswer.createMany({ data: answerRecords });

    const mcqAnswers = answers.length;
    const accuracy = mcqAnswers > 0 ? (correctCount / mcqAnswers) * 100 : 0;
    const xpEarned = correctCount * 10;
    const timeTaken = answers.reduce((s, a) => s + (a.timeTaken || 0), 0);

    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'EVALUATED',
        score: correctCount,
        accuracy,
        timeTaken,
        xpEarned,
        completedAt: new Date(),
      },
    });

    // Award XP
    await this.gamification.awardXP(
      userId,
      xpEarned,
      `Quiz completed: ${correctCount} correct answers`,
    );

    // Update topic performance
    await this.updateTopicPerformance(userId, answerRecords);

    return {
      attemptId,
      score: correctCount,
      total: mcqAnswers,
      accuracy: Math.round(accuracy),
      timeTaken,
      xpEarned,
      answers: answerRecords,
    };
  }

  // ── Get attempt results ───────────────────────────────────────────────────
  async getResults(userId: string, attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: { include: { question: true } },
        quiz: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const topicBreakdown = this.buildTopicBreakdown(attempt.answers);

    return {
      score: attempt.score,
      accuracy: attempt.accuracy,
      timeTaken: attempt.timeTaken,
      xpEarned: attempt.xpEarned,
      topicBreakdown,
      weakAreas: topicBreakdown
        .filter((t) => t.accuracy < 60)
        .map((t) => t.topic),
      strongAreas: topicBreakdown
        .filter((t) => t.accuracy >= 80)
        .map((t) => t.topic),
      answers: attempt.answers,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private shuffleOptions(questions: any[]) {
    return questions.map((q) => ({
      ...q,
      options: q.options?.sort(() => Math.random() - 0.5),
    }));
  }

  private buildTopicBreakdown(answers: any[]) {
    const byTopic: Record<string, { correct: number; total: number }> = {};
    for (const ans of answers) {
      const topic = ans.question?.topic || 'General';
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
      byTopic[topic].total++;
      if (ans.isCorrect) byTopic[topic].correct++;
    }
    return Object.entries(byTopic).map(([topic, data]) => ({
      topic,
      correct: data.correct,
      total: data.total,
      accuracy:
        data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }));
  }

  private async updateTopicPerformance(userId: string, answers: any[]) {
    const topicMap: Record<string, { correct: number; total: number }> = {};

    for (const ans of answers) {
      const question = await this.prisma.question.findUnique({
        where: { id: ans.questionId },
      });
      if (!question?.topic) continue;
      if (!topicMap[question.topic])
        topicMap[question.topic] = { correct: 0, total: 0 };
      topicMap[question.topic].total++;
      if (ans.isCorrect) topicMap[question.topic].correct++;
    }

    for (const [topic, data] of Object.entries(topicMap)) {
      const existing = await this.prisma.topicPerformance.findUnique({
        where: { userId_topic: { userId, topic } },
      });

      const newTotal = (existing?.totalAttempts ?? 0) + data.total;
      const newCorrect = (existing?.correctAttempts ?? 0) + data.correct;
      const accuracy = newTotal > 0 ? (newCorrect / newTotal) * 100 : 0;
      const difficultyLevel =
        accuracy < 60 ? 'EASY' : accuracy > 80 ? 'HARD' : 'MEDIUM';

      await this.prisma.topicPerformance.upsert({
        where: { userId_topic: { userId, topic } },
        update: {
          totalAttempts: newTotal,
          correctAttempts: newCorrect,
          accuracy,
          difficultyLevel,
          lastPracticeDate: new Date(),
        },
        create: {
          userId,
          topic,
          totalAttempts: data.total,
          correctAttempts: data.correct,
          accuracy,
          difficultyLevel,
          lastPracticeDate: new Date(),
        },
      });
    }
  }
}
