import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GroqProvider {
  private client: Groq;
  private readonly logger = new Logger(GroqProvider.name);

  constructor(private configService: ConfigService) {
    this.client = new Groq({ apiKey: this.configService.get('GROQ_API_KEY') });
  }

  async complete(
    model: string,
    systemPrompt: string,
    userMessage: string,
    maxTokens = 1024,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    return {
      text: response.choices[0].message.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
