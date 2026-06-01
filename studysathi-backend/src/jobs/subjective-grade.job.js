import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';
import { gamificationService } from '../services/gamification.service.js';
import { notificationService } from '../services/notification.service.js';

const worker = new Worker('subjective-grading', async (job) => {
  const { attemptId } = job.data;
  console.log(`[Subjective Grading] Grading attempt ${attemptId}`);

  try {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: true,
        answers: {
          include: { question: true },
        }
      }
    });

    if (!attempt) {
      console.error(`[Subjective Grading] Attempt ${attemptId} not found`);
      return;
    }

    const subjectiveAnswers = attempt.answers.filter(
      ans => ans.question.type === 'SUBJECTIVE' && ans.aiScore === null
    );

    let evaluatedCount = 0;
    let newScore = attempt.score || 0;

    for (const ans of subjectiveAnswers) {
      const q = ans.question;
      try {
        const prompt = `Evaluate the student's answer based on the question, expected answer, and grading rubric.

Question: "${q.question}"
Expected Answer: "${q.expectedAnswer}"
Rubric: "${q.rubric}"
Student's Answer: "${ans.userAnswer}"

Grade the answer out of 10 points. Provide constructive feedback and suggested improvements.

Respond ONLY with a valid, clean JSON object matching the following structure (do not include markdown or backticks):
{
  "score": 8.5,
  "feedback": "A very solid explanation, but missed X...",
  "suggestions": "Include details about Y in future explanations."
}
Do not include markdown tags like \`\`\`json.`;

        const aiRes = await aiGateway.generateText({
          prompt,
          systemInstruction: 'You are an academic evaluator. Grade subjective answers and return score and feedback in raw JSON format.',
          userId: attempt.userId,
          task: 'MCQ_GENERATION', // Routes to Claude 3.5 Sonnet
        });

        let result;
        try {
          const cleanJson = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
          result = JSON.parse(cleanJson);
        } catch (err) {
          console.error(`Failed to parse grading for answer ${ans.id}:`, err.message);
          result = {
            score: 5.0,
            feedback: 'Graded with default score due to processing error.',
            suggestions: 'Review your answer contents.'
          };
        }

        const isCorrect = result.score >= 6;
        if (isCorrect) {
          newScore++;
        }

        await prisma.attemptAnswer.update({
          where: { id: ans.id },
          data: {
            aiScore: result.score,
            aiFeedback: result.feedback,
            aiSuggestions: result.suggestions,
            isCorrect,
          }
        });

        // Update Topic Performance for the subjective question topic
        if (q.topic) {
          const topic = q.topic;
          const perf = await prisma.topicPerformance.findUnique({
            where: { userId_topic: { userId: attempt.userId, topic } },
          });

          const isCorrectVal = isCorrect ? 1 : 0;
          if (perf) {
            const total = perf.totalAttempts + 1;
            const correct = perf.correctAttempts + isCorrectVal;
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
            await prisma.topicPerformance.create({
              data: {
                userId: attempt.userId,
                topic,
                totalAttempts: 1,
                correctAttempts: isCorrectVal,
                accuracy: isCorrectVal * 100,
                difficultyLevel: isCorrectVal * 100 < 60 ? 'EASY' : 'MEDIUM',
                lastPracticeDate: new Date(),
              }
            });
          }
        }

        evaluatedCount++;

      } catch (err) {
        console.error(`Error grading answer ${ans.id}:`, err);
      }
    }

    // Refresh attempt answers to calculate final score
    const allAnswers = await prisma.attemptAnswer.findMany({
      where: { attemptId },
    });

    const total = allAnswers.length;
    const correctCount = allAnswers.filter(a => a.isCorrect === true).length;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;

    // Award XP: 10 XP for MCQs, 15 XP for subjective
    const subjectiveCount = allAnswers.filter(a => a.aiScore !== null).length;
    const mcqCorrectCount = correctCount - allAnswers.filter(a => a.aiScore !== null && a.isCorrect === true).length;
    
    const xpEarned = (mcqCorrectCount * 10) + (subjectiveCount * 15);

    const updated = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'EVALUATED',
        score: correctCount,
        accuracy,
        xpEarned,
        completedAt: new Date(),
      }
    });

    if (xpEarned > 0) {
      await gamificationService.awardXP(attempt.userId, xpEarned, `Quiz Evaluated: ${attempt.quiz.title}`);
    }

    // Send push notification
    await notificationService.sendNotification(
      attempt.userId,
      'Subjective Quiz Evaluated! 🎉',
      `Your answers for quiz "${attempt.quiz.title}" have been graded. Your final score is ${correctCount}/${total}.`,
      'QUIZ_EVALUATION',
      { attemptId, score: correctCount, total }
    );

    console.log(`[Subjective Grading] Completed grading for attempt ${attemptId}. Evaluated ${evaluatedCount} answers.`);

  } catch (err) {
    console.error(`[Subjective Grading] Critical failure for attempt ${attemptId}:`, err);
    throw err;
  }
}, { connection: redis });

export { worker as subjectiveGradeWorker };
