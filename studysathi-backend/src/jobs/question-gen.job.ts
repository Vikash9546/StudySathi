import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';

interface MCQQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  topic: string;
}

interface SubjectiveQuestion {
  question: string;
  expectedAnswer: string;
  rubric: string;
  difficulty: string;
  topic: string;
}

@Injectable()
@Processor('question-gen')
export class QuestionGenJob extends WorkerHost {
  private readonly logger = new Logger(QuestionGenJob.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
  ) {
    super();
  }

  async process(job: Job<{ documentId: string; chunkIds: string[]; priority?: string }>) {
    const { documentId, chunkIds } = job.data;
    this.logger.log(`Generating questions for ${chunkIds.length} chunks, doc: ${documentId}`);

    for (const chunkId of chunkIds) {
      const chunk = await this.prisma.documentChunk.findUnique({
        where: { id: chunkId },
        include: { document: true },
      });
      if (!chunk) continue;

      // Check if questions already exist for this chunk
      const existing = await this.prisma.question.count({
        where: { chunkId },
      });
      if (existing > 0) continue;

      try {
        // Generate MCQs
        await this.generateMCQs(chunk);

        // Generate Subjective Questions
        await this.generateSubjective(chunk);
      } catch (error) {
        this.logger.error(
          `Failed to generate questions for chunk ${chunkId}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Question generation complete for document ${documentId}`);
  }

  private async generateMCQs(chunk: any) {
    const result = await this.aiGateway.complete(
      AITask.QUESTION_MCQ,
      `You are an expert question setter for competitive examinations. Generate exactly 3 high-quality MCQ questions from the provided content.

Return a JSON array with this structure:
[
  {
    "question": "string",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A) ...",
    "explanation": "string",
    "difficulty": "EASY|MEDIUM|HARD",
    "topic": "string"
  }
]

Requirements:
- Questions must be based ONLY on provided content
- Options must be plausible but with one clearly correct answer
- Include explanation for the correct answer
- Vary difficulty levels`,
      `Generate 3 MCQ questions from:\n\n${chunk.content}`,
      { useCache: false },
    );

    let questions: MCQQuestion[] = [];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn(`Could not parse MCQ JSON for chunk ${chunk.id}`);
      return;
    }

    if (questions.length > 0) {
      await this.prisma.question.createMany({
        data: questions.map((q) => ({
          documentId: chunk.documentId,
          chunkId: chunk.id,
          type: 'MCQ',
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: (q.difficulty as any) || 'MEDIUM',
          topic: q.topic || chunk.topic,
        })),
      });
      this.logger.log(`Created ${questions.length} MCQs for chunk ${chunk.id}`);
    }
  }

  private async generateSubjective(chunk: any) {
    const result = await this.aiGateway.complete(
      AITask.QUESTION_SUBJECTIVE,
      `You are an expert teacher. Generate exactly 2 subjective questions from the provided content.

Return a JSON array:
[
  {
    "question": "string",
    "expectedAnswer": "string",
    "rubric": "string - criteria for grading",
    "difficulty": "EASY|MEDIUM|HARD",
    "topic": "string"
  }
]

Requirements:
- Questions should test understanding, not just recall
- Expected answer should be comprehensive but concise
- Rubric should list key points that must be covered`,
      `Generate 2 subjective questions from:\n\n${chunk.content}`,
      { useCache: false },
    );

    let questions: SubjectiveQuestion[] = [];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) questions = JSON.parse(jsonMatch[0]);
    } catch {
      this.logger.warn(`Could not parse subjective JSON for chunk ${chunk.id}`);
      return;
    }

    if (questions.length > 0) {
      await this.prisma.question.createMany({
        data: questions.map((q) => ({
          documentId: chunk.documentId,
          chunkId: chunk.id,
          type: 'SUBJECTIVE',
          question: q.question,
          options: [],
          expectedAnswer: q.expectedAnswer,
          rubric: q.rubric,
          difficulty: (q.difficulty as any) || 'MEDIUM',
          topic: q.topic || chunk.topic,
        })),
      });
      this.logger.log(`Created ${questions.length} subjective questions for chunk ${chunk.id}`);
    }
  }
}
