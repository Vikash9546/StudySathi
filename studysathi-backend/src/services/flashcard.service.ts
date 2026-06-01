import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

// SM-2 Algorithm implementation
function sm2(
  quality: number, // 0-5 (Again=0, Hard=2, Good=3, Easy=5)
  repetitions: number,
  easeFactor: number,
  interval: number,
): { repetitions: number; easeFactor: number; interval: number; nextReviewDate: Date } {
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

const RATING_QUALITY: Record<string, number> = {
  AGAIN: 0,
  HARD: 2,
  GOOD: 3,
  EASY: 5,
};

@Injectable()
export class FlashcardService {
  constructor(private prisma: PrismaService) {}

  async getDueFlashcards(userId: string) {
    const now = new Date();

    // Get all flashcards from user's documents
    const userDocs = await this.prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });
    const docIds = userDocs.map(d => d.id);

    // Get flashcards that are due (last review's nextReviewDate <= now, or never reviewed)
    const flashcards = await this.prisma.flashcard.findMany({
      where: { documentId: { in: docIds } },
      include: {
        reviews: {
          where: { userId },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
        },
      },
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

  async reviewFlashcard(
    userId: string,
    flashcardId: string,
    rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY',
  ) {
    const flashcard = await this.prisma.flashcard.findUnique({ where: { id: flashcardId } });
    if (!flashcard) throw new NotFoundException('Flashcard not found');

    // Get last review for SM-2 state
    const lastReview = await this.prisma.flashcardReview.findFirst({
      where: { userId, flashcardId },
      orderBy: { reviewedAt: 'desc' },
    });

    const quality = RATING_QUALITY[rating];
    const { repetitions, easeFactor, interval, nextReviewDate } = sm2(
      quality,
      lastReview?.repetitions ?? 0,
      lastReview?.easeFactor ?? 2.5,
      lastReview?.interval ?? 0,
    );

    const review = await this.prisma.flashcardReview.create({
      data: {
        userId,
        flashcardId,
        rating: rating as any,
        easeFactor,
        repetitions,
        interval,
        nextReviewDate,
      },
    });

    return review;
  }

  async getFlashcardStats(userId: string) {
    const userDocs = await this.prisma.document.findMany({
      where: { userId },
      select: { id: true },
    });
    const docIds = userDocs.map(d => d.id);

    const total = await this.prisma.flashcard.count({ where: { documentId: { in: docIds } } });
    const reviewed = await this.prisma.flashcardReview.count({ where: { userId } });
    const due = (await this.getDueFlashcards(userId)).length;

    return { total, reviewed, due };
  }
}
