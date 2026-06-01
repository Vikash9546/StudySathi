import { Router } from 'express';
import { quizService } from '../../services/quiz.service.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { successResponse } from '../../common/response.js';
import { prisma } from '../../config/db.js';

const router = Router();

// Create a quiz from a document
router.post('/document/:documentId', requireAuth, async (req, res, next) => {
  try {
    const result = await quizService.createDocumentQuiz(req.currentUser.id, req.params.documentId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get quiz attempt history for the current user
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: req.currentUser.id },
      orderBy: { startedAt: 'desc' },
      take: 30,
      include: {
        quiz: {
          select: { id: true, title: true, type: true, documentId: true }
        },
        answers: {
          select: { isCorrect: true, question: { select: { topic: true } } }
        }
      }
    });

    const history = attempts.map(a => {
      // Build topic summary
      const topicMap = {};
      for (const ans of a.answers) {
        const t = ans.question?.topic || 'General';
        if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
        topicMap[t].total++;
        if (ans.isCorrect) topicMap[t].correct++;
      }
      const topicSummary = Object.entries(topicMap).map(([topic, s]) => ({
        topic,
        accuracy: Math.round((s.correct / s.total) * 100),
        strength: s.correct / s.total >= 0.75 ? 'STRONG' : s.correct / s.total >= 0.5 ? 'AVERAGE' : 'WEAK',
      }));
      const accuracy = a.accuracy || 0;
      const grade = accuracy >= 90 ? 'A+' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' :
                    accuracy >= 60 ? 'C' : accuracy >= 50 ? 'D' : 'F';
      return {
        attemptId: a.id,
        quizId: a.quiz?.id,
        documentId: a.quiz?.documentId,
        quizTitle: a.quiz?.title || 'Quiz',
        quizType: a.quiz?.type,
        score: a.score,
        totalQuestions: a.answers.length,
        accuracy,
        grade,
        xpEarned: a.xpEarned || 0,
        timeTaken: a.timeTaken,
        status: a.status,
        completedAt: a.completedAt,
        createdAt: a.startedAt,
        topicSummary,
        weakTopics: topicSummary.filter(t => t.strength === 'WEAK').map(t => t.topic),
        strongTopics: topicSummary.filter(t => t.strength === 'STRONG').map(t => t.topic),
      };
    });

    res.json(successResponse(history));
  } catch (err) {
    next(err);
  }
});

// Re-attempt an existing quiz (creates a new attempt with the same quiz questions)
router.post('/:quizId/reattempt', requireAuth, async (req, res, next) => {
  try {
    const result = await quizService.startAttempt(req.currentUser.id, req.params.quizId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});



// Create/Get daily challenge quiz
router.post('/daily', requireAuth, async (req, res, next) => {
  try {
    const result = await quizService.createDailyQuiz(req.currentUser.id);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Start a quiz attempt
router.post('/:quizId/attempt', requireAuth, async (req, res, next) => {
  try {
    const result = await quizService.startAttempt(req.currentUser.id, req.params.quizId);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Submit a quiz attempt
router.post('/attempt/:attemptId/submit', requireAuth, async (req, res, next) => {
  try {
    const { answers } = req.body; // array of { questionId, answer, timeTaken }
    const result = await quizService.submitAttempt(req.currentUser.id, req.params.attemptId, answers);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
});

// Get quiz attempt results with topic analysis + AI teacher summary
router.get('/attempt/:attemptId/results', requireAuth, async (req, res, next) => {
  try {
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: req.params.attemptId, userId: req.currentUser.id },
      include: {
        quiz: { select: { title: true, type: true } },
        answers: {
          include: {
            question: {
              select: { question: true, correctAnswer: true, type: true, topic: true, difficulty: true, explanation: true }
            }
          }
        }
      }
    });
    if (!attempt) throw new Error('Attempt not found');

    // ── Topic-wise analysis ──────────────────────────────────────────────────
    const topicMap = {};
    for (const a of attempt.answers) {
      const topic = a.question?.topic || 'General';
      if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0, wrong: [] };
      topicMap[topic].total++;
      if (a.isCorrect) {
        topicMap[topic].correct++;
      } else {
        topicMap[topic].wrong.push(a.question?.question || '');
      }
    }

    const topicAnalysis = Object.entries(topicMap).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      strength: stats.correct / stats.total >= 0.75 ? 'STRONG' :
                stats.correct / stats.total >= 0.5  ? 'AVERAGE' : 'WEAK',
      wrongQuestions: stats.wrong.slice(0, 2), // show up to 2 wrong questions per topic
    })).sort((a, b) => a.accuracy - b.accuracy); // weakest first

    const strongTopics  = topicAnalysis.filter(t => t.strength === 'STRONG').map(t => t.topic);
    const weakTopics    = topicAnalysis.filter(t => t.strength === 'WEAK').map(t => t.topic);
    const averageTopics = topicAnalysis.filter(t => t.strength === 'AVERAGE').map(t => t.topic);

    // ── AI Teacher Summary ───────────────────────────────────────────────────
    let teacherSummary = null;
    try {
      const { aiGateway } = await import('../../ai-gateway/gateway.js');
      const summaryPrompt = `You are an experienced teacher reviewing a student's quiz performance. Write a warm, encouraging, personal teacher-style feedback paragraph (3-4 sentences) based on the following quiz data.

Quiz: "${attempt.quiz?.title}"
Score: ${attempt.score} / ${attempt.answers.length} (${Math.round(attempt.accuracy)}% accuracy)
Strong Topics: ${strongTopics.length ? strongTopics.join(', ') : 'None yet'}
Weak Topics: ${weakTopics.length ? weakTopics.join(', ') : 'None'}
Average Topics: ${averageTopics.length ? averageTopics.join(', ') : 'None'}
Time Taken: ${Math.round(attempt.timeTaken / 60)} minutes

Write as if speaking directly to the student. Be specific about strong and weak areas. End with one actionable study tip. Do NOT use bullet points or JSON. Just 3-4 natural sentences.`;

      const aiRes = await aiGateway.generateText({
        prompt: summaryPrompt,
        userId: req.currentUser.id,
        task: 'RAG_TUTOR',
      });
      teacherSummary = aiRes.text?.trim() || null;
    } catch (aiErr) {
      console.warn('[Quiz Results] AI summary failed, skipping:', aiErr.message);
    }

    // ── Grade ────────────────────────────────────────────────────────────────
    const accuracy = attempt.accuracy || 0;
    const grade = accuracy >= 90 ? 'A+' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' :
                  accuracy >= 60 ? 'C' : accuracy >= 50 ? 'D' : 'F';

    res.json(successResponse({
      score: attempt.score,
      accuracy,
      grade,
      xpEarned: attempt.xpEarned || 0,
      timeTaken: attempt.timeTaken,
      totalQuestions: attempt.answers.length,
      status: attempt.status,
      quizTitle: attempt.quiz?.title,
      teacherSummary,
      topicAnalysis,
      strongTopics,
      weakTopics,
      averageTopics,
      answers: attempt.answers.map(a => ({
        question: a.question?.question,
        userAnswer: a.userAnswer,
        correctAnswer: a.question?.correctAnswer,
        explanation: a.question?.explanation,
        topic: a.question?.topic,
        difficulty: a.question?.difficulty,
        isCorrect: a.isCorrect,
      })),
    }));
  } catch (err) {
    next(err);
  }
});


// Challenge a friend to a quiz
router.post('/challenge', requireAuth, async (req, res, next) => {
  try {
    const { quizId, challengedId } = req.body;
    const challenge = await prisma.quizChallenge.create({
      data: {
        quizId,
        challengerId: req.currentUser.id,
        challengedId,
        status: 'PENDING',
      }
    });
    res.json(successResponse(challenge));
  } catch (err) {
    next(err);
  }
});

// Get pending challenge quizzes received
router.get('/challenges/pending', requireAuth, async (req, res, next) => {
  try {
    const challenges = await prisma.quizChallenge.findMany({
      where: { challengedId: req.currentUser.id, status: 'PENDING' },
      include: {
        challenger: { select: { id: true, name: true, avatarUrl: true } },
        quiz: true
      }
    });
    res.json(successResponse(challenges));
  } catch (err) {
    next(err);
  }
});

export default router;
