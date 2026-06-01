import { prisma } from '../config/db.js';
import { gamificationService } from './gamification.service.js';

export class QuizService {
  async createDocumentQuiz(userId, documentId) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } });
    if (!doc) throw new Error('Document not found');

    const questions = await prisma.question.findMany({
      where: { documentId, type: 'MCQ' },
      take: 20,
    });

    if (questions.length === 0) {
      throw new Error('No questions generated for this document yet');
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: `Quiz: ${doc.title}`,
        type: 'DOCUMENT',
        documentId,
        questionIds: questions.map(q => q.id),
      }
    });

    return { quiz, questions: questions.map(q => this.normalizeQuestion(q)) };
  }

  async createDailyQuiz(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daily = await prisma.dailyChallenge.findUnique({ where: { date: today } });

    if (!daily) {
      const docs = await prisma.document.findMany({ where: { userId, status: 'READY' } });
      const docIds = docs.map(d => d.id);

      const questions = await prisma.question.findMany({
        where: { documentId: { in: docIds }, type: 'MCQ' },
        take: 10,
      });

      if (questions.length === 0) {
        throw new Error('Please upload documents and let them process to play the Daily Challenge!');
      }

      daily = await prisma.dailyChallenge.create({
        data: {
          date: today,
          questionIds: questions.map(q => q.id),
        }
      });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: `Daily Challenge — ${today.toDateString()}`,
        type: 'DAILY',
        questionIds: daily.questionIds,
      }
    });

    const questions = await prisma.question.findMany({
      where: { id: { in: daily.questionIds } },
    });

    return { quiz, questions: this.shuffleOptions(questions) };
  }

  async startAttempt(userId, quizId) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new Error('Quiz not found');

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        status: 'IN_PROGRESS',
      }
    });

    const allQuestions = await prisma.question.findMany({
      where: { id: { in: quiz.questionIds } },
    });

    // Extract unique topics from the candidate questions
    const topics = [...new Set(allQuestions.map(q => q.topic).filter(Boolean))];

    // Fetch user topic performances
    const performances = await prisma.topicPerformance.findMany({
      where: { userId, topic: { in: topics } },
    });

    const performanceMap = new Map(performances.map(p => [p.topic, p]));
    const selectedQuestions = [];

    // Group candidates by topic and filter adaptively
    for (const topic of topics) {
      const topicQuestions = allQuestions.filter(q => q.topic === topic);
      const perf = performanceMap.get(topic);

      let targetDifficulty = 'MEDIUM';
      if (perf) {
        if (perf.accuracy < 60) {
          targetDifficulty = 'EASY';
        } else if (perf.accuracy > 80) {
          targetDifficulty = 'HARD';
        }
      }

      // Filter by user-targeted difficulty level
      let matched = topicQuestions.filter(q => q.difficulty === targetDifficulty);
      if (matched.length === 0) {
        matched = topicQuestions; // fallback to all if target difficulty not generated
      }

      selectedQuestions.push(...matched);
    }

    let finalQuestions = selectedQuestions.length > 0 ? selectedQuestions : allQuestions;
    // Limit to maximum 15 questions per attempt
    finalQuestions = finalQuestions.slice(0, 15);

    // Shuffle options for returned questions
    return { attempt, questions: this.shuffleOptions(finalQuestions) };
  }

  async submitAttempt(userId, attemptId, answers) {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { quiz: true }
    });

    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS') throw new Error('Attempt already submitted');

    let correctCount = 0;
    let subjectiveFound = false;
    const answerRecords = [];
    const topicUpdates = {};

    for (const ans of answers) {
      const q = await prisma.question.findUnique({ where: { id: ans.questionId } });
      if (!q) continue;

      let isCorrect = null;
      if (q.type === 'MCQ') {
        isCorrect = q.correctAnswer === ans.answer;
        if (isCorrect) correctCount++;

        // Track topic updates for MCQs
        if (q.topic) {
          if (!topicUpdates[q.topic]) {
            topicUpdates[q.topic] = { correct: 0, total: 0 };
          }
          topicUpdates[q.topic].total++;
          if (isCorrect) topicUpdates[q.topic].correct++;
        }
      } else if (q.type === 'SUBJECTIVE') {
        subjectiveFound = true;
      }

      answerRecords.push({
        attemptId,
        questionId: ans.questionId,
        userAnswer: ans.answer,
        isCorrect,
        timeTaken: ans.timeTaken || 0,
      });
    }

    await prisma.attemptAnswer.createMany({ data: answerRecords });

    // Update topic performances for MCQ questions
    for (const [topic, stats] of Object.entries(topicUpdates)) {
      const perf = await prisma.topicPerformance.findUnique({
        where: { userId_topic: { userId, topic } },
      });

      if (perf) {
        const total = perf.totalAttempts + stats.total;
        const correct = perf.correctAttempts + stats.correct;
        const accuracy = (correct / total) * 100;
        const difficultyLevel = accuracy < 60 ? 'EASY' : accuracy > 80 ? 'HARD' : 'MEDIUM';

        await prisma.topicPerformance.update({
          where: { id: perf.id },
          data: {
            totalAttempts: total,
            correctAttempts: correct,
            accuracy,
            difficultyLevel,
            lastPracticeDate: new Date(),
          }
        });
      } else {
        const accuracy = (stats.correct / stats.total) * 100;
        await prisma.topicPerformance.create({
          data: {
            userId,
            topic,
            totalAttempts: stats.total,
            correctAttempts: stats.correct,
            accuracy,
            difficultyLevel: accuracy < 60 ? 'EASY' : accuracy > 80 ? 'HARD' : 'MEDIUM',
            lastPracticeDate: new Date(),
          }
        });
      }
    }

    const total = answers.length;
    const timeTaken = answers.reduce((s, a) => s + (a.timeTaken || 0), 0);

    if (subjectiveFound) {
      // Set to SUBMITTED as it requires async AI grading
      const updatedAttempt = await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'SUBMITTED',
          score: correctCount, // will be finalized after subjective evaluation
          accuracy: total > 0 ? (correctCount / total) * 100 : 0,
          timeTaken,
          completedAt: new Date(),
        }
      });

      // Import BullMQ queue dynamically to avoid circular references
      const { subjectiveQueue } = await import('../jobs/queue.js');
      await subjectiveQueue.add('grade-subjective', { attemptId });

      return { attempt: updatedAttempt, subjectivePending: true };
    } else {
      // Evaluate immediately
      const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
      const xpEarned = correctCount * 10;

      const updatedAttempt = await prisma.quizAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'EVALUATED',
          score: correctCount,
          accuracy,
          timeTaken,
          xpEarned,
          completedAt: new Date(),
        }
      });

      if (xpEarned > 0) {
        await gamificationService.awardXP(userId, xpEarned, `Quiz Completed: ${attempt.quiz.title}`);
      }

      return { attempt: updatedAttempt, correctCount, xpEarned, subjectivePending: false };
    }
  }

  normalizeQuestion(q) {
    // Ensure options is always a proper array (handle stringified JSON from DB)
    let options = q.options;
    if (typeof options === 'string') {
      try { options = JSON.parse(options); } catch { options = []; }
    }
    if (!Array.isArray(options)) options = [];
    return { ...q, options };
  }

  shuffleOptions(questions) {
    return questions.map(q => {
      const normalized = this.normalizeQuestion(q);
      if (normalized.options.length > 0) {
        const copy = [...normalized.options];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return { ...normalized, options: copy };
      }
      return normalized;
    });
  }
}

export const quizService = new QuizService();
