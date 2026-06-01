import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';

interface FlashcardData {
  front: string;
  back: string;
  type: string;
  topic: string;
}

@Injectable()
@Processor('flashcard-gen')
export class FlashcardGenJob extends WorkerHost {
  private readonly logger = new Logger(FlashcardGenJob.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
  ) {
    super();
  }

  async process(job: Job<{ documentId: string; chunkIds: string[] }>) {
    const { documentId, chunkIds } = job.data;
    this.logger.log(`Generating flashcards for document ${documentId}`);

    for (const chunkId of chunkIds) {
      const chunk = await this.prisma.documentChunk.findUnique({
        where: { id: chunkId },
      });
      if (!chunk) continue;

      const existing = await this.prisma.flashcard.count({
        where: { documentId, /* no direct chunkId on flashcard */ },
      });

      // Limit to 10 flashcards total for free initial generation
      if (existing >= 10) break;

      try {
        await this.generateFlashcards(chunk);
      } catch (error) {
        this.logger.error(
          `Failed to generate flashcards for chunk ${chunkId}: ${error.message}`,
        );
      }
    }
  }

  private async generateFlashcards(chunk: any) {
    const result = await this.aiGateway.complete(
      AITask.FLASHCARD_GENERATION,
      `You are an expert at creating study flashcards. Create 2-3 flashcards from the provided content.

Return a JSON array:
[
  {
    "front": "Question or term (concise)",
    "back": "Answer or definition (clear and complete)",
    "type": "DEFINITION|FORMULA|PROCESS|CONCEPT|COMPARISON",
    "topic": "string"
  }
]

Requirements:
- Front side: a clear question or key term
- Back side: accurate, complete answer
- Types: DEFINITION (term→meaning), FORMULA (concept→formula), PROCESS (how-to), CONCEPT (idea→explanation), COMPARISON (A vs B)
- Keep each card focused on ONE concept`,
      `Create flashcards from:\n\n${chunk.content}`,
      { useCache: false },
    );

    let flashcards: FlashcardData[] = [];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) flashcards = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn(`Could not parse flashcard JSON for chunk ${chunk.id}`);
      return;
    }

    if (flashcards.length > 0) {
      await this.prisma.flashcard.createMany({
        data: flashcards.map((f) => ({
          documentId: chunk.documentId,
          front: f.front,
          back: f.back,
          type: (['DEFINITION', 'FORMULA', 'PROCESS', 'CONCEPT', 'COMPARISON'].includes(f.type)
            ? f.type
            : 'CONCEPT') as any,
          topic: f.topic || chunk.topic,
        })),
      });
      this.logger.log(`Created ${flashcards.length} flashcards for chunk ${chunk.id}`);
    }
  }
}
