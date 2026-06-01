import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';

// Detect placeholder/invalid keys
function isValidKey(key) {
  return key && !key.includes('your-') && key.length > 10;
}

export class AnthropicProvider {
  constructor() {
    this.client = isValidKey(env.ANTHROPIC_API_KEY) ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
    if (!this.client) {
      console.log('[AnthropicProvider] Skipping: ANTHROPIC_API_KEY not configured or is a placeholder.');
    }
  }

  async generate(prompt, options = {}) {
    if (!this.client) throw new Error('Anthropic API key is not configured');
    const modelName = options.model || 'claude-3-5-haiku-latest';
    const response = await this.client.messages.create({
      model: modelName,
      system: options.systemInstruction || undefined,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature || 0.7,
    });

    const text = response.content[0].text;
    const promptTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = promptTokens * 0.00000025 + outputTokens * 0.00000125;

    return { text, promptTokens, outputTokens, cost, model: modelName };
  }
}

export const anthropicProvider = new AnthropicProvider();
