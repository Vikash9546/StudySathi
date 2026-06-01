import OpenAI from 'openai';
import { env } from '../../config/env.js';

// Detect placeholder/invalid keys
function isValidKey(key) {
  return key && !key.includes('your-') && key.length > 10;
}

export class OpenAIProvider {
  constructor() {
    this.client = isValidKey(env.OPENAI_API_KEY) ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
    if (!this.client) {
      console.log('[OpenAIProvider] Skipping: OPENAI_API_KEY not configured or is a placeholder.');
    }
  }

  async generate(prompt, options = {}) {
    if (!this.client) throw new Error('OpenAI API key is not configured');
    const modelName = options.model || 'gpt-4o-mini';
    const response = await this.client.chat.completions.create({
      model: modelName,
      messages: [
        ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature || 0.7,
    });

    const text = response.choices[0].message.content;
    const promptTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const cost = promptTokens * 0.00000015 + outputTokens * 0.0000006;

    return { text, promptTokens, outputTokens, cost, model: modelName };
  }
}

export const openaiProvider = new OpenAIProvider();
