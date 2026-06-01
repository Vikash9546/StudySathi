import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { s3Client } from '../config/storage.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { documentService } from '../services/document.service.js';
import { aiTutorService } from '../services/ai-tutor.service.js';
import { env } from '../config/env.js';
import { questionQueue, flashcardQueue, revisionQueue } from './queue.js';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const worker = new Worker('document-parsing', async (job) => {
  const { documentId, storageKey, mimetype } = job.data;
  console.log(`[Parse Job] Starting parsing job for document ${documentId}`);

  try {
    let buffer;
    
    const isPlaceholderStorage = !env.R2_ACCESS_KEY_ID || 
                                 env.R2_ACCESS_KEY_ID.includes('your-') || 
                                 !env.R2_ENDPOINT || 
                                 env.R2_ENDPOINT.includes('your-');

    if (isPlaceholderStorage) {
      console.log(`[Parse Job] Storage credentials are placeholders. Reading file locally...`);
      const localPath = path.join('uploads', storageKey);
      buffer = await fs.readFile(localPath);
    } else {
      try {
        const s3Res = await s3Client.send(new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: storageKey,
        }));
        buffer = await streamToBuffer(s3Res.Body);
      } catch (err) {
        console.error(`[Parse Job] R2/S3 download failed, attempting to read local fallback storage:`, err);
        const localPath = path.join('uploads', storageKey);
        buffer = await fs.readFile(localPath);
      }
    }

    const text = await documentService.extractText(buffer, mimetype);
    
    if (!text || text.trim() === '') {
      throw new Error('Document contains no extractable text content');
    }

    const chunkSize = 1000;
    const overlap = 200;
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      chunks.push(text.substring(start, start + chunkSize));
      start += chunkSize - overlap;
    }

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const dbChunk = await prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: i,
          content,
          tokenCount: Math.round(content.length / 4),
        }
      });

      const embedding = await aiTutorService.getQuestionEmbedding(content);
      const vectorString = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "document_embeddings" ("id", "chunkId", "embedding") VALUES ($1, $2, $3::vector)`,
        randomUUID(),
        dbChunk.id,
        vectorString
      );
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY' },
    });

    console.log(`[Parse Job] Document ${documentId} parsed. Queueing generators...`);
    await questionQueue.add('generate-questions', { documentId });
    await flashcardQueue.add('generate-flashcards', { documentId });
    await revisionQueue.add('generate-revisions', { documentId });

  } catch (err) {
    console.error(`[Parse Job] Failure on document ${documentId}:`, err);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', processingError: err.message },
    });
    throw err;
  }
}, { connection: redis });

worker.on('failed', (job, err) => {
  console.error(`[Parse Job] Job ${job.id} failed:`, err);
});

export { worker as documentParseWorker };
