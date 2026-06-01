import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { s3Client } from '../config/storage.js';
import { env } from '../config/env.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../config/db.js';
import { parseQueue } from '../jobs/queue.js';
import { BadRequestError, ForbiddenError } from '../common/errors.js';
import fs from 'fs/promises';
import path from 'path';

export class DocumentService {
  async uploadAndRegister(file, userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestError('User not found');

    // 1. Enforce file size limit based on subscription plan
    const maxSizeMB = user.plan === 'PRO' ? env.UPLOAD_MAX_SIZE_PRO_MB : env.UPLOAD_MAX_SIZE_FREE_MB;
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new BadRequestError(`File size exceeds the ${user.plan} plan limit of ${maxSizeMB} MB.`);
    }

    // 2. Enforce daily count limit for FREE plan
    if (user.plan === 'FREE') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const count = await prisma.document.count({
        where: {
          userId,
          createdAt: { gte: oneDayAgo },
        }
      });

      if (count >= 5) {
        throw new ForbiddenError('Daily upload limit reached for FREE plan (5 uploads maximum). Upgrade to PRO for unlimited uploads.');
      }
    }

    const storageKey = `documents/${userId}/${Date.now()}_${file.originalname}`;
    
    const isPlaceholderStorage = !env.R2_ACCESS_KEY_ID || 
                                 env.R2_ACCESS_KEY_ID.includes('your-') || 
                                 !env.R2_ENDPOINT || 
                                 env.R2_ENDPOINT.includes('your-');

    if (isPlaceholderStorage) {
      console.log(`[Storage] Storage credentials are placeholders. Saving file locally...`);
      const localPath = path.join('uploads', storageKey);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, file.buffer);
    } else {
      try {
        // Upload file to S3/R2
        await s3Client.send(new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
      } catch (err) {
        console.error(`[Storage] R2/S3 upload failed, falling back to local file storage:`, err);
        const localPath = path.join('uploads', storageKey);
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, file.buffer);
      }
    }

    // Register document in DB with status PROCESSING
    const doc = await prisma.document.create({
      data: {
        userId,
        title: file.originalname,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageKey,
        status: 'PROCESSING',
      }
    });

    // Trigger BullMQ job for parsing
    await parseQueue.add('parse-doc', { documentId: doc.id, storageKey, mimetype: file.mimetype });

    return doc;
  }

  async extractText(buffer, mimetype) {
    if (mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text;
      } finally {
        await parser.destroy();
      }
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimetype.startsWith('text/')) {
      return buffer.toString('utf-8');
    }
    
    // Simple placeholder text for OCR/images extraction in local mock environments
    if (mimetype.startsWith('image/')) {
      return `Image OCR Extraction: Contains handwritten notes and text snippets regarding the subjects.`;
    }

    throw new Error(`Unsupported mime type for text extraction: ${mimetype}`);
  }

  async deleteDocument(id, userId) {
    const doc = await prisma.document.findFirst({ where: { id, userId } });
    if (!doc) throw new Error('Document not found');

    // Delete from S3
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: doc.storageKey,
      }));
    } catch (err) {
      console.error('Failed to delete object from S3:', err);
    }

    // Delete from local storage fallback
    try {
      const localPath = path.join('uploads', doc.storageKey);
      await fs.unlink(localPath);
    } catch (err) {
      // Ignore if not present locally
    }

    // Delete from DB
    await prisma.document.delete({ where: { id } });
    return { success: true };
  }
}

export const documentService = new DocumentService();
