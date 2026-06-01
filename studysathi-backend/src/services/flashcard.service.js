import { prisma } from '../config/db.js';

function sm2(quality, repetitions, easeFactor, interval) {
  let newRepetitions = repetitions;
  let newEaseFactor = easeFactor;
  let newInterval = interval;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return { repetitions: newRepetitions, easeFactor: newEaseFactor, interval: newInterval, nextReviewDate };
}

const RATING_QUALITY = {
  AGAIN: 0,
  HARD: 2,
  GOOD: 3,
  EASY: 5,
};

export class FlashcardService {
  async getDueFlashcards(userId) {
    const now = new Date();

    const userDocs = await prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });
    const docIds = userDocs.map(d => d.id);

    const flashcards = await prisma.flashcard.findMany({
      where: { documentId: { in: docIds } },
      include: {
        reviews: {
          where: { userId },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
        }
      }
    });

    const due = flashcards.filter(fc => {
      if (fc.reviews.length === 0) return true;
      return fc.reviews[0].nextReviewDate <= now;
    });

    return due.map(fc => ({
      id: fc.id,
      front: fc.front,
      back: fc.back,
      type: fc.type,
      topic: fc.topic,
      lastReview: fc.reviews[0] || null,
    }));
  }

  async reviewFlashcard(userId, flashcardId, rating) {
    const flashcard = await prisma.flashcard.findUnique({ where: { id: flashcardId } });
    if (!flashcard) throw new Error('Flashcard not found');

    const lastReview = await prisma.flashcardReview.findFirst({
      where: { userId, flashcardId },
      orderBy: { reviewedAt: 'desc' },
    });

    const quality = RATING_QUALITY[rating];
    const { repetitions, easeFactor, interval, nextReviewDate } = sm2(
      quality,
      lastReview?.repetitions ?? 0,
      lastReview?.easeFactor ?? 2.5,
      lastReview?.interval ?? 0
    );

    const review = await prisma.flashcardReview.create({
      data: {
        userId,
        flashcardId,
        rating,
        easeFactor,
        repetitions,
        interval,
        nextReviewDate,
      }
    });

    return review;
  }

  async getFlashcardStats(userId) {
    const userDocs = await prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });
    const docIds = userDocs.map(d => d.id);

    const total = await prisma.flashcard.count({ where: { documentId: { in: docIds } } });
    const reviewed = await prisma.flashcardReview.count({ where: { userId } });
    const dueList = await this.getDueFlashcards(userId);

    return { total, reviewed, due: dueList.length };
  }
}

export const flashcardService = new FlashcardService();
