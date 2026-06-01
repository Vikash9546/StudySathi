import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';

// Detect placeholder/invalid keys
function isValidKey(key) {
  return key && !key.includes('your-') && key.length > 10;
}

export class GeminiProvider {
  constructor() {
    this.client = isValidKey(env.GEMINI_API_KEY) ? new GoogleGenerativeAI(env.GEMINI_API_KEY) : null;
    if (!this.client) {
      console.log('[GeminiProvider] Skipping: GEMINI_API_KEY not configured or is a placeholder.');
    }
  }

  async generate(prompt, options = {}) {
    if (!this.client) throw new Error('Gemini API key is not configured');
    const modelName = options.model || 'gemini-2.0-flash';
    const model = this.client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.7,
      },
    });
    const text = result.response.text();
    const promptTokens = Math.round(prompt.length / 4);
    const outputTokens = Math.round(text.length / 4);
    const cost = promptTokens * 0.000000075 + outputTokens * 0.0000003;

    return { text, promptTokens, outputTokens, cost, model: modelName };
  }
}

export const geminiProvider = new GeminiProvider();
