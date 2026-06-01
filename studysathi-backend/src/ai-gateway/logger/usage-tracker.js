import { prisma } from '../../config/db.js';

export async function logAIUsage(userId, provider, model, task, promptTokens, outputTokens, costUsd) {
  try {
    return await prisma.aIUsageLog.create({
      data: {
        userId: userId || null,
        provider,
        model,
        task,
        promptTokens,
        outputTokens,
        costUsd,
      }
    });
  } catch (err) {
    console.error('❌ Failed to save AI usage log:', err);
  }
}
