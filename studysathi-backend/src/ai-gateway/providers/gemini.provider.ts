import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiProvider {
  private client: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private configService: ConfigService) {
    this.client = new GoogleGenerativeAI(
      this.configService.get('GEMINI_API_KEY'),
    );
  }

  async complete(
    model: string,
    systemPrompt: string,
    userMessage: string,
    maxTokens = 1024,
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const genModel = this.client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
    });

    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const text = result.response.text();
    const usage = result.response.usageMetadata;

    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    };
  }
}
