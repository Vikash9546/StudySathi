import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { AIGatewayService } from '../ai-gateway/gateway';
import { AITask } from '../ai-gateway/strategies/task-router';
import { OpenAIProvider } from '../ai-gateway/providers/openai.provider';

@Injectable()
export class AITutorService {
  private readonly logger = new Logger(AITutorService.name);

  constructor(
    private prisma: PrismaService,
    private aiGateway: AIGatewayService,
    private openai: OpenAIProvider,
  ) {}

  // ── Index document for vector search ──────────────────────────────────────
  async indexDocument(documentId: string) {
    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      include: { embeddings: true },
    });

    for (const chunk of chunks) {
      if (chunk.embeddings.length > 0) continue; // Already indexed

      try {
        const embedding = await this.openai.createEmbedding(chunk.content);
        const vectorStr = `[${embedding.join(',')}]`;

        await this.prisma.$executeRaw`
          INSERT INTO "document_embeddings" ("id", "chunkId", "embedding", "createdAt")
          VALUES (gen_random_uuid(), ${chunk.id}::uuid, ${vectorStr}::vector, NOW())
          ON CONFLICT DO NOTHING
        `;
      } catch (error) {
        this.logger.error(
          `Failed to index chunk ${chunk.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Indexed ${chunks.length} chunks for document ${documentId}`,
    );
  }

  // ── Ask question (RAG) ─────────────────────────────────────────────────────
  async askQuestion(
    userId: string,
    question: string,
    documentId?: string,
    sessionId?: string,
  ) {
    // Generate question embedding
    const embedding = await this.aiGateway.createEmbedding(question, userId);
    const vectorStr = `[${embedding.join(',')}]`;

    // Vector similarity search
    const relevantChunks = await this.prisma.$queryRaw<
      { content: string; chunkId: string; similarity: number }[]
    >`
      SELECT dc.content, de."chunkId", 1 - (de.embedding <=> ${vectorStr}::vector) AS similarity
      FROM document_embeddings de
      JOIN document_chunks dc ON dc.id = de."chunkId"
      JOIN documents d ON d.id = dc."documentId"
      WHERE d."userId" = ${userId}::uuid
      ${documentId ? this.prisma.$queryRaw`AND d.id = ${documentId}::uuid` : this.prisma.$queryRaw``}
      ORDER BY similarity DESC
      LIMIT 5
    `;

    if (relevantChunks.length === 0) {
      return {
        answer:
          'I could not find relevant information in your documents to answer this question. Please upload study materials first.',
        sources: [],
      };
    }

    const context = relevantChunks
      .map((c, i) => `[Source ${i + 1}]: ${c.content}`)
      .join('\n\n');

    // Generate answer using Claude Haiku
    const result = await this.aiGateway.complete(
      AITask.AI_TUTOR,
      `You are StudySathi AI Tutor — an expert educational assistant.
Your role is to answer student questions ONLY based on the provided context from their study materials.

Rules:
1. ONLY use information from the provided context
2. If the answer is not in the context, say "I don't have enough information about this in your study materials"
3. Be concise but thorough
4. Use examples and analogies when helpful
5. Never hallucinate or make up information`,
      `Context from study materials:\n${context}\n\nStudent question: ${question}`,
      { userId, useCache: false },
    );

    // Save session
    if (sessionId) {
      await this.updateSession(sessionId, question, result.text);
    } else {
      await this.createSession(userId, documentId, question, result.text);
    }

    return {
      answer: result.text,
      sources: relevantChunks.map((c) => ({
        content: c.content.substring(0, 200) + '...',
        similarity: Math.round(c.similarity * 100),
      })),
      model: result.model,
    };
  }

  // ── Get AI sessions ────────────────────────────────────────────────────────
  async getSessions(userId: string) {
    return this.prisma.aITutorSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ── Generate revision notes ────────────────────────────────────────────────
  async generateRevisionNotes(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      include: { chunks: { take: 10 } },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // Check if notes already exist
    const existing = await this.prisma.revisionNote.findFirst({
      where: { documentId },
    });
    if (existing) return existing;

    const content = doc.chunks.map((c) => c.content).join('\n\n');

    const result = await this.aiGateway.complete(
      AITask.REVISION_NOTES,
      `You are an expert study notes creator. Generate comprehensive revision notes from the provided content.

Return a JSON object:
{
  "summary": "2-3 paragraph summary",
  "keyPoints": ["point 1", "point 2", ...],
  "formulaSheet": "All formulas mentioned (or null if none)",
  "examNotes": "Key exam tips and important concepts"
}`,
      `Create revision notes from:\n\n${content.substring(0, 4000)}`,
      { userId },
    );

    let notesData = {
      summary: '',
      keyPoints: [],
      formulaSheet: null,
      examNotes: '',
    };
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) notesData = JSON.parse(jsonMatch[0]);
    } catch {
      notesData.summary = result.text;
    }

    return this.prisma.revisionNote.create({
      data: {
        documentId,
        summary: notesData.summary,
        keyPoints: notesData.keyPoints,
        formulaSheet: notesData.formulaSheet,
        examNotes: notesData.examNotes,
      },
    });
  }

  // ── Generate mind map ──────────────────────────────────────────────────────
  async generateMindMap(userId: string, documentId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      include: { chunks: { take: 5 } },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const existing = await this.prisma.mindMap.findFirst({
      where: { documentId },
    });
    if (existing) return existing;

    const content = doc.chunks.map((c) => c.content).join('\n\n');

    const result = await this.aiGateway.complete(
      AITask.MIND_MAP,
      `Create a structured mind map in JSON format from educational content.

Return JSON:
{
  "root": "Main Topic",
  "branches": [
    {
      "name": "Branch 1",
      "children": [
        { "name": "Sub-topic", "details": "brief description" }
      ]
    }
  ]
}`,
      `Create mind map from:\n\n${content.substring(0, 2000)}`,
      { userId },
    );

    let mapData = {};
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) mapData = JSON.parse(jsonMatch[0]);
    } catch {
      mapData = { root: doc.title, branches: [] };
    }

    return this.prisma.mindMap.create({
      data: {
        documentId,
        title: doc.title,
        mapData,
      },
    });
  }

  private async createSession(
    userId: string,
    documentId: string | undefined,
    question: string,
    answer: string,
  ) {
    return this.prisma.aITutorSession.create({
      data: {
        userId,
        documentId,
        messages: [
          {
            role: 'user',
            content: question,
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: answer,
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  }

  private async updateSession(
    sessionId: string,
    question: string,
    answer: string,
  ) {
    const session = await this.prisma.aITutorSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) return;

    const messages = [
      ...(session.messages as any[]),
      { role: 'user', content: question, timestamp: new Date().toISOString() },
      {
        role: 'assistant',
        content: answer,
        timestamp: new Date().toISOString(),
      },
    ];

    return this.prisma.aITutorSession.update({
      where: { id: sessionId },
      data: { messages },
    });
  }
}
