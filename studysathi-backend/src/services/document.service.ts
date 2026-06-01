import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../config/prisma.service';
import { StorageService } from '../config/storage.service';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private configService: ConfigService,
    @InjectQueue('document-parse') private documentQueue: Queue,
    @InjectQueue('question-gen') private questionQueue: Queue,
    @InjectQueue('flashcard-gen') private flashcardQueue: Queue,
  ) {}

  // ── Upload ──────────────────────────────────────────────────────────────────
  async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    plan: string,
  ) {
    const maxSizeMB =
      plan === 'PRO'
        ? parseInt(this.configService.get('UPLOAD_MAX_SIZE_PRO_MB', '100'))
        : parseInt(this.configService.get('UPLOAD_MAX_SIZE_FREE_MB', '20'));

    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new BadRequestException(
        `File size exceeds ${maxSizeMB}MB limit for ${plan} plan`,
      );
    }

    // Check daily limit for free users
    if (plan === 'FREE') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const count = await this.prisma.document.count({
        where: { userId, createdAt: { gte: today } },
      });
      if (count >= 5) {
        throw new BadRequestException(
          'Daily upload limit (5) reached. Upgrade to Pro for unlimited uploads.',
        );
      }
    }

    // Upload to R2
    const { key } = await this.storageService.uploadFile(
      file.buffer,
      file.mimetype,
      'documents',
      file.originalname,
    );

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        userId,
        title: file.originalname.replace(/\.[^/.]+$/, ''),
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey: key,
        status: 'UPLOADING',
      },
    });

    // Queue processing
    await this.documentQueue.add(
      'parse',
      { documentId: document.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Document ${document.id} queued for processing`);
    return document;
  }

  // ── List user documents ──────────────────────────────────────────────────────
  async getUserDocuments(userId: string, page = 1, limit = 20) {
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          status: true,
          subject: true,
          topics: true,
          createdAt: true,
        },
      }),
      this.prisma.document.count({ where: { userId } }),
    ]);

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Get single document ──────────────────────────────────────────────────────
  async getDocument(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      include: {
        revisionNotes: true,
        mindMaps: true,
        _count: { select: { questions: true, flashcards: true, chunks: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  // ── Delete document ──────────────────────────────────────────────────────────
  async deleteDocument(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.storageService.deleteFile(doc.storageKey);
    await this.prisma.document.delete({ where: { id: documentId } });
    return { message: 'Document deleted' };
  }

  // ── Get questions for document ──────────────────────────────────────────────
  async getDocumentQuestions(
    userId: string,
    documentId: string,
    type?: string,
    limit = 20,
  ) {
    await this.verifyOwnership(userId, documentId);

    return this.prisma.question.findMany({
      where: {
        documentId,
        ...(type ? { type: type as any } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Get flashcards for document ─────────────────────────────────────────────
  async getDocumentFlashcards(userId: string, documentId: string) {
    await this.verifyOwnership(userId, documentId);
    return this.prisma.flashcard.findMany({
      where: { documentId },
      take: 10,
    });
  }

  private async verifyOwnership(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }
}
