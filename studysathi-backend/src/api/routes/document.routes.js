import { Router } from 'express';
import { documentService } from '../../services/document.service.js';
import { aiTutorService } from '../../services/ai-tutor.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { createUploadMiddleware } from '../middlewares/upload.middleware.js';
import { aiRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { successResponse } from '../../common/response.js';
import { prisma } from '../../config/db.js';
import { NotFoundError } from '../../common/errors.js';

const router = Router();
const upload = createUploadMiddleware(100);

// Upload and register a document
router.post('/upload', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('Please upload a file.');
    }
    const doc = await documentService.uploadAndRegister(req.file, req.currentUser.id);
    res.json(successResponse(doc));
  } catch (err) {
    next(err);
  }
});

// List all user documents
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      where: { userId: req.currentUser.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(successResponse(docs));
  } catch (err) {
    next(err);
  }
});

// Get document details (with revision notes and mind maps)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.currentUser.id },
      include: {
        revisionNotes: true,
        mindMaps: true,
      },
    });
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    res.json(successResponse(doc));
  } catch (err) {
    next(err);
  }
});

// Delete a document
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await documentService.deleteDocument(req.params.id, req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// AI Tutor chat session
router.post('/ask', requireAuth, aiRateLimiter(), async (req, res, next) => {
  try {
    const { question, documentId, sessionId } = req.body;
    const result = await aiTutorService.askQuestion(
      req.currentUser.id,
      question,
      documentId || null,
      sessionId || null
    );
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get AI Tutor sessions list
router.get('/tutor/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await aiTutorService.getSessions(req.currentUser.id);
    res.json(successResponse(sessions));
  } catch (err) {
    next(err);
  }
});

export default router;
