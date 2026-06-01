import { Module, Global } from '@nestjs/common';
import { AIGatewayService } from './gateway';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { PromptCacheService } from './cache/prompt-cache';
import { UsageTrackerService } from './logger/usage-tracker';

@Global()
@Module({
  providers: [
    AIGatewayService,
    AnthropicProvider,
    OpenAIProvider,
    GeminiProvider,
    GroqProvider,
    PromptCacheService,
    UsageTrackerService,
  ],
  exports: [AIGatewayService, UsageTrackerService],
})
export class AIGatewayModule {}
