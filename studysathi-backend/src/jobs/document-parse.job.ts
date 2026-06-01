import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { StorageService } from '../config/storage.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Dynamic imports for ESM packages
async function parsePDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks.filter((c) => c.trim().length > 20);
}

@Injectable()
@Processor('document-parse')
export class DocumentParseJob extends WorkerHost {
  private readonly logger = new Logger(DocumentParseJob.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private aiGateway: AIGatewayService,
    @InjectQueue('question-gen') private questionQueue: Queue,
    @InjectQueue('flashcard-gen') private flashcardQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ documentId: string }>) {
    const { documentId } = job.data;
    this.logger.log(`Processing document: ${documentId}`);

    try {
      // Update status to PROCESSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      // Get document
      const doc = await this.prisma.document.findUnique({
        where: { id: documentId },
      });
      if (!doc) throw new Error('Document not found');

      // Get file from storage
      const signedUrl = await this.storage.getSignedUrl(doc.storageKey);
      const response = await fetch(signedUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Extract text
      let text = '';
      const mime = doc.fileType;

      if (mime === 'application/pdf') {
        text = await parsePDF(buffer);
      } else if (
        mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await parseDOCX(buffer);
      } else if (mime === 'text/plain') {
        text = buffer.toString('utf-8');
      } else if (mime.startsWith('image/')) {
        // OCR via Tesseract — simplified: use AI vision
        text = `[Image content from ${doc.fileName} — OCR processing]`;
      } else {
        text = buffer.toString('utf-8');
      }

      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract meaningful text from document');
      }

      // AI Topic Extraction
      const topicResult = await this.aiGateway.complete(
        AITask.TOPIC_EXTRACTION,
        `You are an expert academic content analyzer. Extract the subject, main topics, subtopics, difficulty level, and education level from the provided text.
Return a JSON object with this structure:
{
  "subject": "string",
  "topics": ["string"],
  "subtopics": ["string"],
  "difficulty": "EASY|MEDIUM|HARD",
  "educationLevel": "string"
}`,
        `Extract topics from:\n\n${text.substring(0, 3000)}`,
        { useCache: false },
      );

      let topicData = { subject: null, topics: [], difficulty: 'MEDIUM', educationLevel: null };
      try {
        const jsonMatch = topicResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) topicData = JSON.parse(jsonMatch[0]);
      } catch {
        this.logger.warn('Could not parse topic extraction JSON');
      }

      // Create chunks
      const chunks = chunkText(text);
      this.logger.log(`Created ${chunks.length} chunks for document ${documentId}`);

      // Store chunks
      await this.prisma.documentChunk.createMany({
        data: chunks.map((content, index) => ({
          documentId,
          chunkIndex: index,
          content,
          tokenCount: content.split(/\s+/).length,
          topic: topicData.topics?.[0] ?? null,
        })),
      });

      // Update document as READY
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'READY',
          subject: topicData.subject,
          topics: topicData.topics ?? [],
          educationLevel: topicData.educationLevel,
        },
      });

      // Queue question and flashcard generation for first 5 chunks
      const firstChunks = await this.prisma.documentChunk.findMany({
        where: { documentId },
        take: 5,
        orderBy: { chunkIndex: 'asc' },
      });

      await this.questionQueue.add('generate', {
        documentId,
        chunkIds: firstChunks.map((c) => c.id),
        priority: 'high',
      });

      await this.flashcardQueue.add('generate', {
        documentId,
        chunkIds: firstChunks.map((c) => c.id),
      });

      this.logger.log(`Document ${documentId} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}: ${error.message}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', processingError: error.message },
      });
      throw error;
    }
  }
}
