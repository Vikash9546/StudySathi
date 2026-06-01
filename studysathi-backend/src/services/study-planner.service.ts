import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';

@Injectable()
export class StudyPlannerService {
  private readonly logger = new Logger(StudyPlannerService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
  ) {}

  async generateWeeklyPlan(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        examGoal: true,
        examDate: true,
        dailyTargetMins: true,
        subjects: true,
      },
    });

    const weakTopics = await this.prisma.topicPerformance.findMany({
      where: { userId, accuracy: { lt: 60 } },
      orderBy: { accuracy: 'asc' },
      take: 10,
    });

    const pastAttempts = await this.prisma.quizAttempt.findMany({
      where: { userId, status: 'EVALUATED' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { accuracy: true, completedAt: true },
    });

    const context = {
      examGoal: user?.examGoal || 'General Study',
      examDate: user?.examDate?.toISOString().split('T')[0] || 'Not set',
      dailyTargetMins: user?.dailyTargetMins || 60,
      subjects: user?.subjects || [],
      weakTopics: weakTopics.map(
        (t) => `${t.topic} (${Math.round(t.accuracy)}% accuracy)`,
      ),
      recentAccuracy:
        pastAttempts.length > 0
          ? Math.round(
              pastAttempts.reduce((s, a) => s + (a.accuracy || 0), 0) /
                pastAttempts.length,
            )
          : 0,
    };

    const result = await this.aiGateway.complete(
      AITask.STUDY_PLAN,
      `You are an expert study planner for competitive examinations.
Generate a personalized weekly study plan based on student data.

Return JSON:
{
  "weeklyGoal": "string",
  "dailyTasks": [
    {
      "day": "Monday",
      "tasks": [
        { "title": "string", "description": "string", "durationMins": number, "topic": "string" }
      ]
    }
  ],
  "recommendations": ["string"]
}`,
      `Student profile:\n${JSON.stringify(context, null, 2)}`,
      { userId },
    );

    let planData: any = { weeklyGoal: '', dailyTasks: [], recommendations: [] };
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) planData = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn('Could not parse study plan JSON');
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const plan = await this.prisma.studyPlan.create({
      data: {
        userId,
        weekStart,
        weekEnd,
        goals: [planData.weeklyGoal, ...(planData.recommendations || [])],
        tasks: {
          create: (planData.dailyTasks || []).flatMap((day: any) =>
            (day.tasks || []).map((task: any) => {
              const dayOffset = [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ].indexOf(day.day);
              const dueDate = new Date(weekStart);
              dueDate.setDate(dueDate.getDate() + dayOffset);
              return {
                title: task.title,
                description: task.description,
                topic: task.topic,
                dueDate,
              };
            }),
          ),
        },
      },
      include: { tasks: true },
    });

    return plan;
  }

  async getCurrentPlan(userId: string) {
    const now = new Date();
    return this.prisma.studyPlan.findFirst({
      where: { userId, weekStart: { lte: now }, weekEnd: { gte: now } },
      include: { tasks: { orderBy: { dueDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeTask(userId: string, taskId: string) {
    const task = await this.prisma.studyTask.findFirst({
      where: { id: taskId, plan: { userId } },
    });
    if (!task) throw new Error('Task not found');

    return this.prisma.studyTask.update({
      where: { id: taskId },
      data: { isCompleted: true },
    });
  }
}
