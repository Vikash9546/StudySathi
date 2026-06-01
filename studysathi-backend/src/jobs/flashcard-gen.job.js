import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';

const worker = new Worker('flashcard-generation', async (job) => {
  const { documentId } = job.data;
  console.log(`[Flashcard Job] Generating flashcards for document ${documentId}`);

  try {
    // cost optimization: limit to first 5 chunks (generating 2 flashcards per chunk = 10 flashcards)
    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      take: 5,
    });

    if (chunks.length === 0) {
      console.log(`[Flashcard Job] No chunks found for document ${documentId}`);
      return;
    }

    let count = 0;

    for (const chunk of chunks) {
      try {
        const prompt = `Based on the following study materials, generate 2 key revision flashcards.
Each flashcard must contain a clear question or term on the front and a detailed answer on the back.

Document Chunk:
"${chunk.content}"

Respond ONLY with a valid, clean JSON array of flashcard objects, matching this schema exactly:
[
  {
    "front": "Term or Question",
    "back": "Definition or Answer explanation",
    "type": "DEFINITION" | "FORMULA" | "PROCESS" | "CONCEPT" | "COMPARISON",
    "topic": "Topic name"
  }
]
Do not include markdown tags like \`\`\`json.`;

        const aiRes = await aiGateway.generateText({
          prompt,
          systemInstruction: 'You are an educational compiler. You read text chunks and return key concept flashcards in raw JSON formats.',
          userId: null,
          task: 'FLASHCARD_GENERATION', // Routes to Groq Llama
        });

        let flashcardsData = [];
        try {
          const cleanJson = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
          flashcardsData = JSON.parse(cleanJson);
        } catch (err) {
          console.error(`Failed to parse Flashcard generated JSON for chunk ${chunk.id}:`, err.message);
          continue;
        }

        const flashcardRecords = flashcardsData.map(f => ({
          documentId,
          front: f.front || 'Concept Term',
          back: f.back || 'Definition details',
          type: ['DEFINITION', 'FORMULA', 'PROCESS', 'CONCEPT', 'COMPARISON'].includes(f.type) ? f.type : 'CONCEPT',
          topic: f.topic || chunk.topic || 'General',
        }));

        if (flashcardRecords.length > 0) {
          await prisma.flashcard.createMany({ data: flashcardRecords });
          count += flashcardRecords.length;
        }

      } catch (chunkErr) {
        console.error(`Error processing chunk ${chunk.id} for flashcards:`, chunkErr);
      }
    }

    console.log(`[Flashcard Job] Successfully generated ${count} flashcards for document ${documentId}`);

  } catch (err) {
    console.error(`[Flashcard Job] Critical error generating flashcards for document ${documentId}:`, err);
    throw err;
  }
}, { connection: redis });

export { worker as flashcardGenWorker };
