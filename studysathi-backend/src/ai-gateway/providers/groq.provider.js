import { Groq } from 'groq-sdk';
import { env } from '../../config/env.js';

export class GroqProvider {
  constructor() {
    this.client = env.GROQ_API_KEY ? new Groq({ apiKey: env.GROQ_API_KEY }) : null;
  }

  async generate(prompt, options = {}) {
    if (!this.client) throw new Error('Groq API key is not configured');
    const modelName = options.model || 'llama-3.3-70b-versatile';
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
    const promptTokens = response.usage?.prompt_tokens || Math.round(prompt.length / 4);
    const outputTokens = response.usage?.completion_tokens || Math.round(text.length / 4);
    const cost = 0.0;

    return { text, promptTokens, outputTokens, cost, model: modelName };
  }
}

export const groqProvider = new GroqProvider();
