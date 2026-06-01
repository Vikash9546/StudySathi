import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

// Approximate cost per 1M tokens in USD
const COST_PER_1M: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 0.25, output: 1.25 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
};

@Injectable()
export class UsageTrackerService {
  private readonly logger = new Logger(UsageTrackerService.name);

  constructor(private prisma: PrismaService) {}

  async track(params: {
    userId?: string;
    provider: string;
    model: string;
    task: string;
    inputTokens: number;
    outputTokens: number;
  }) {
    const costs = COST_PER_1M[params.model] ?? { input: 0, output: 0 };
    const costUsd =
      (params.inputTokens * costs.input + params.outputTokens * costs.output) /
      1_000_000;

    await this.prisma.aIUsageLog.create({
      data: {
        userId: params.userId,
        provider: params.provider,
        model: params.model,
        task: params.task,
        promptTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd,
      },
    });

    this.logger.log(
      `AI Usage: ${params.provider}/${params.model} | task=${params.task} | ` +
        `in=${params.inputTokens} out=${params.outputTokens} cost=$${costUsd.toFixed(6)}`,
    );
  }

  async getUserUsage(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await this.prisma.aIUsageLog.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    const totalCost = logs.reduce((sum, l) => sum + l.costUsd, 0);
    const totalTokens = logs.reduce(
      (sum, l) => sum + l.promptTokens + l.outputTokens,
      0,
    );

    return { logs, totalCost, totalTokens };
  }

  async getSystemUsage(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { costUsd: true, promptTokens: true, outputTokens: true },
      _count: true,
    });
    return result;
  }
}
