import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';
import OpenAI from 'openai';
import { env } from '../config/env.js';

export class AITutorService {
  constructor() {
    this.openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  }

  async getQuestionEmbedding(text) {
    if (!this.openai) {
      // Mock embedding vector for local testing if OpenAI key is missing
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    }
    const res = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return res.data[0].embedding;
  }

  async askQuestion(userId, question, documentId = null, sessionId = null) {
    const embedding = await this.getQuestionEmbedding(question);
    const vectorString = `[${embedding.join(',')}]`;

    let chunks = [];

    // Query matched chunks using cosine similarity pgvector operator (<=>)
    if (documentId) {
      const query = `
        SELECT de."chunkId", dc."content", (1 - (de."embedding" <=> $1::vector)) AS "similarity"
        FROM "document_embeddings" de
        JOIN "document_chunks" dc ON de."chunkId" = dc."id"
        WHERE dc."documentId" = $2
        ORDER BY "similarity" DESC
        LIMIT 5
      `;
      chunks = await prisma.$queryRawUnsafe(query, vectorString, documentId);
    } else {
      const query = `
        SELECT de."chunkId", dc."content", (1 - (de."embedding" <=> $1::vector)) AS "similarity"
        FROM "document_embeddings" de
        JOIN "document_chunks" dc ON de."chunkId" = dc."id"
        JOIN "documents" d ON dc."documentId" = d."id"
        WHERE d."userId" = $2
        ORDER BY "similarity" DESC
        LIMIT 5
      `;
      chunks = await prisma.$queryRawUnsafe(query, vectorString, userId);
    }

    const context = chunks.map((c, i) => `[Source ${i + 1}]:\n${c.content}`).join('\n\n');

    const systemInstruction = `You are StudySathi, an intelligent AI tutor. Use the provided study context to answer the student's question accurately without hallucinations. Cite sources if applicable.`;
    const prompt = `Context:\n${context || 'No relevant study materials found.'}\n\nStudent Question: ${question}\n\nAnswer:`;

    const aiRes = await aiGateway.generateText({
      prompt,
      systemInstruction,
      userId,
      model: 'groq',
    });

    const sources = chunks.map(c => ({
      content: c.content,
      similarity: Math.round((c.similarity || 0) * 100),
    }));

    // Find or create session
    let session;
    if (sessionId) {
      session = await prisma.aITutorSession.findFirst({ where: { id: sessionId, userId } });
    }

    const userMsg = { role: 'user', content: question, timestamp: new Date().toISOString() };
    const tutorMsg = { role: 'assistant', content: aiRes.text, timestamp: new Date().toISOString(), sources };

    if (session) {
      session = await prisma.aITutorSession.update({
        where: { id: session.id },
        data: {
          messages: {
            push: [userMsg, tutorMsg],
          }
        }
      });
    } else {
      session = await prisma.aITutorSession.create({
        data: {
          userId,
          documentId,
          messages: [userMsg, tutorMsg],
        }
      });
    }

    return {
      answer: aiRes.text,
      sources,
      sessionId: session.id,
      model: aiRes.model,
    };
  }

  async getSessions(userId) {
    return prisma.aITutorSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}

export const aiTutorService = new AITutorService();
