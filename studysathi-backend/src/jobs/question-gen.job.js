import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';

const worker = new Worker('question-generation', async (job) => {
  const { documentId } = job.data;
  console.log(`[Question Job] Generating MCQ & Subjective questions for document ${documentId}`);

  try {
    // cost optimization: limit initial generation to first 7 chunks (~21 MCQs, 14 Subjectives)
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      take: 7,
    });

    if (chunks.length === 0) {
      console.log(`[Question Job] No chunks found for document ${documentId}`);
      return;
    }

    let mcqCount = 0;
    let subjectiveCount = 0;

    for (const chunk of chunks) {
      try {
        const prompt = `Based on the following document chunk, generate 3 Multiple Choice Questions (MCQs) and 2 Subjective Questions for student revision.

Document Chunk:
"${chunk.content}"

Respond ONLY with a valid, clean JSON object matching the following structure:
{
  "mcqs": [
    {
      "question": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Why Option A is correct",
      "difficulty": "EASY" or "MEDIUM" or "HARD",
      "topic": "Concept name"
    }
  ],
  "subjective": [
    {
      "question": "Explain ...",
      "expectedAnswer": "Brief model answer...",
      "rubric": "Detail core points required for full marks (accuracy, completeness)",
      "difficulty": "EASY" or "MEDIUM" or "HARD",
      "topic": "Concept name"
    }
  ]
}
Do not include markdown tags like \`\`\`json.`;

        const aiRes = await aiGateway.generateText({
          prompt,
          systemInstruction: 'You are an educational compiler. You read text chunks and return multiple choice and subjective questions in raw JSON format.',
          userId: null,
          task: 'MCQ_GENERATION', // Routes to Claude 3.5 Sonnet
        });

        let data = { mcqs: [], subjective: [] };
        try {
          const cleanJson = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
          data = JSON.parse(cleanJson);
        } catch (err) {
          console.error(`Failed to parse AI questions output for chunk ${chunk.id}:`, err.message);
          continue;
        }

        const questionsToCreate = [];

        // Map and validate MCQs
        if (Array.isArray(data.mcqs)) {
          for (const m of data.mcqs) {
            questionsToCreate.push({
              documentId,
              chunkId: chunk.id,
              type: 'MCQ',
              question: m.question || 'Review Question',
              options: Array.isArray(m.options) ? m.options : [],
              correctAnswer: m.correctAnswer || '',
              explanation: m.explanation || '',
              difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(m.difficulty) ? m.difficulty : 'MEDIUM',
              topic: m.topic || chunk.topic || 'General',
            });
            mcqCount++;
          }
        }

        // Map and validate Subjective Questions
        if (Array.isArray(data.subjective)) {
          for (const s of data.subjective) {
            questionsToCreate.push({
              documentId,
              chunkId: chunk.id,
              type: 'SUBJECTIVE',
              question: s.question || 'Review Essay Question',
              expectedAnswer: s.expectedAnswer || '',
              rubric: s.rubric || 'Accuracy, clarity, and depth of explanation.',
              difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(s.difficulty) ? s.difficulty : 'MEDIUM',
              topic: s.topic || chunk.topic || 'General',
            });
            subjectiveCount++;
          }
        }

        if (questionsToCreate.length > 0) {
          await prisma.question.createMany({ data: questionsToCreate });
        }

      } catch (chunkErr) {
        console.error(`Error processing chunk ${chunk.id} for question generation:`, chunkErr);
      }
    }

    console.log(`[Question Job] Finished. Generated ${mcqCount} MCQs and ${subjectiveCount} Subjective Questions for doc ${documentId}`);

  } catch (err) {
    console.error(`[Question Job] Critical error generating questions for document ${documentId}:`, err);
    throw err;
  }
}, { connection: redis });

export { worker as questionGenWorker };
