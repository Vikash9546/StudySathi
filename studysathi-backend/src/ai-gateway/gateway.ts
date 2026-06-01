import { Injectable, Logger } from '@nestjs/common';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { PromptCacheService } from './cache/prompt-cache';
import { UsageTrackerService } from './logger/usage-tracker';
import {
  AITask,
  AIProvider,
  TASK_ROUTING,
  ModelConfig,
} from './strategies/task-router';

export interface AIGatewayResult {
  text: string;
  provider: string;
  model: string;
  cached: boolean;
}

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);

  constructor(
    private anthropic: AnthropicProvider,
    private openai: OpenAIProvider,
    private gemini: GeminiProvider,
    private groq: GroqProvider,
    private cache: PromptCacheService,
    private usageTracker: UsageTrackerService,
  ) {}

  async complete(
    task: AITask,
    systemPrompt: string,
    userMessage: string,
    options: { userId?: string; useCache?: boolean } = {},
  ): Promise<AIGatewayResult> {
    const { userId, useCache = true } = options;
    const cacheKey = `${task}:${systemPrompt}:${userMessage}`;

    // Check cache
    if (useCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          text: cached,
          provider: 'cache',
          model: 'cache',
          cached: true,
        };
      }
    }

    const models = TASK_ROUTING[task];
    let lastError: Error;

    // Try models in order (fallback chain)
    for (const modelConfig of models) {
      try {
        const result = await this.callProvider(
          modelConfig,
          systemPrompt,
          userMessage,
        );

        // Track usage
        await this.usageTracker.track({
          userId,
          provider: modelConfig.provider,
          model: modelConfig.model,
          task,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });

        // Cache response
        if (useCache) {
          await this.cache.set(cacheKey, result.text);
        }

        return {
          text: result.text,
          provider: modelConfig.provider,
          model: modelConfig.model,
          cached: false,
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Provider ${modelConfig.provider}/${modelConfig.model} failed for task ${task}: ${error.message}. Trying fallback...`,
        );
      }
    }

    throw new Error(
      `All AI providers failed for task ${task}. Last error: ${lastError?.message}`,
    );
  }

  async createEmbedding(text: string, userId?: string): Promise<number[]> {
    const embedding = await this.openai.createEmbedding(text);
    await this.usageTracker.track({
      userId,
      provider: 'openai',
      model: 'text-embedding-3-small',
      task: AITask.EMBEDDING,
      inputTokens: Math.ceil(text.length / 4),
      outputTokens: 0,
    });
    return embedding;
  }

  private async callProvider(
    config: ModelConfig,
    systemPrompt: string,
    userMessage: string,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    switch (config.provider) {
      case AIProvider.ANTHROPIC:
        return this.anthropic.complete(
          config.model,
          systemPrompt,
          userMessage,
          config.maxTokens,
        );
      case AIProvider.OPENAI:
        return this.openai.complete(
          config.model,
          systemPrompt,
          userMessage,
          config.maxTokens,
        );
      case AIProvider.GEMINI:
        return this.gemini.complete(
          config.model,
          systemPrompt,
          userMessage,
          config.maxTokens,
        );
      case AIProvider.GROQ:
        return this.groq.complete(
          config.model,
          systemPrompt,
          userMessage,
          config.maxTokens,
        );
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
