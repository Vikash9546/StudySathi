import { Router } from 'express';
import { flashcardService } from '../../services/flashcard.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { successResponse } from '../../common/response.js';

const router = Router();

// Get due flashcards for review
router.get('/due', requireAuth, async (req, res, next) => {
  try {
    const result = await flashcardService.getDueFlashcards(req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get flashcard stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const result = await flashcardService.getFlashcardStats(req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Review flashcard (SM-2 rating)
router.post('/:id/review', requireAuth, async (req, res, next) => {
  try {
    const { rating } = req.body; // 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'
    const result = await flashcardService.reviewFlashcard(req.currentUser.id, req.params.id, rating);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

export default router;
