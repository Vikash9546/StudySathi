import { executeWithFallback } from './strategies/fallback.js';
import { routeTask } from './strategies/task-router.js';
import { promptCache } from './cache/prompt-cache.js';
import { logAIUsage } from './logger/usage-tracker.js';

export class AIGatewayService {
  async generateText({ prompt, systemInstruction, model, maxTokens = 1500, temperature = 0.7, userId, task }) {
    const options = { systemInstruction, maxTokens, temperature };

    // Check cache
    const cacheVal = await promptCache.get(prompt, options);
    if (cacheVal) {
      console.log('⚡ Prompt Cache Hit!');
      return cacheVal;
    }

    let primaryProvider = 'groq';
    let primaryModel = 'llama-3.3-70b-versatile';

    if (task) {
      const routed = routeTask(task);
      primaryProvider = routed.provider;
      primaryModel = routed.model;
    } else if (model) {
      primaryProvider = model;
    }

    const result = await executeWithFallback(primaryProvider, primaryModel, prompt, options);

    // Cache output
    await promptCache.set(prompt, result, options);

    // Log AI Usage
    await logAIUsage(
      userId,
      result.provider.toUpperCase(),
      result.model,
      task || 'GENERAL_QUERY',
      result.promptTokens,
      result.outputTokens,
      result.cost
    );

    return result;
  }
}

export const aiGateway = new AIGatewayService();
