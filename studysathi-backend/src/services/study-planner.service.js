import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';
import { gamificationService } from './gamification.service.js';

export class StudyPlannerService {
  async generateWeeklyPlan(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subjects: true, dailyTargetMins: true, examGoal: true },
    });

    if (!user) throw new Error('User context not found');

    const prompt = `You are an expert academic planner. Generate a structured weekly study plan for a student preparing for "${user.examGoal}".
Subjects to cover: ${user.subjects.join(', ')}
Daily study target: ${user.dailyTargetMins} minutes

Respond ONLY with a valid JSON object matching the following structure:
{
  "goals": ["Goal 1", "Goal 2"],
  "tasks": [
    {
      "title": "Task title",
      "description": "Short description of what to study",
      "daysFromNow": 1,
      "topic": "Subject/Topic name"
    }
  ]
}
Do not include markdown tags like \`\`\`json.`;

    const aiRes = await aiGateway.generateText({
      prompt,
      userId,
      model: 'groq',
    });

    let planData;
    try {
      const cleanJson = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      planData = JSON.parse(cleanJson);
    } catch (err) {
      console.error('Failed to parse planner JSON, fallback mock plan used:', aiRes.text);
      planData = {
        goals: [`Review core concepts in ${user.subjects[0] || 'your subjects'}`],
        tasks: (user.subjects || ['General Studies']).map((sub, idx) => ({
          title: `Study ${sub} Revision Chunks`,
          description: `Read through chapter notes and take a quiz on ${sub}.`,
          daysFromNow: idx + 1,
          topic: sub,
        })),
      };
    }

    const weekStart = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Create plan in DB
    const plan = await prisma.studyPlan.create({
      data: {
        userId,
        weekStart,
        weekEnd,
        goals: planData.goals,
      }
    });

    const taskRecords = planData.tasks.map(t => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (t.daysFromNow || 1));
      return {
        planId: plan.id,
        title: t.title,
        description: t.description || '',
        dueDate,
        topic: t.topic || '',
        isCompleted: false,
      };
    });

    await prisma.studyTask.createMany({ data: taskRecords });

    return prisma.studyPlan.findUnique({
      where: { id: plan.id },
      include: { tasks: true }
    });
  }

  async getCurrentPlan(userId) {
    const now = new Date();
    return prisma.studyPlan.findFirst({
      where: {
        userId,
        weekEnd: { gte: now },
      },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async completeTask(userId, taskId) {
    const task = await prisma.studyTask.findUnique({
      where: { id: taskId },
      include: { plan: true },
    });

    if (!task || task.plan.userId !== userId) {
      throw new Error('Study task not found');
    }

    if (task.isCompleted) return task;

    const updated = await prisma.studyTask.update({
      where: { id: taskId },
      data: { isCompleted: true },
    });

    await gamificationService.awardXP(userId, 20, `Completed Study Task: ${task.title}`);

    return updated;
  }
}

export const studyPlannerService = new StudyPlannerService();
