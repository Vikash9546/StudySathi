import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/db.js';
import { aiGateway } from '../ai-gateway/gateway.js';

const worker = new Worker('revision-generation', async (job) => {
  const { documentId } = job.data;
  console.log(`[Revision Job] Generating revision notes and mind map for document ${documentId}`);

  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      console.error(`[Revision Job] Document ${documentId} not found`);
      return;
    }

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      take: 10, // Take up to 10 chunks for summary context
    });

    if (chunks.length === 0) return;

    const contextText = chunks.map(c => c.content).join('\n\n');

    const prompt = `Based on the following study material, generate standard revision notes and a structured mind map.

Study Material:
"${contextText}"

Respond ONLY with a valid JSON object matching the following structure exactly (do not include markdown or backticks):
{
  "summary": "High-level summary paragraph...",
  "keyPoints": [
    "Core point 1",
    "Core point 2",
    "Core point 3"
  ],
  "formulaSheet": "Essential formulas, definitions, or mathematical models. If none apply, list key terms and their concise relationships.",
  "examNotes": "Important notes, common pitfalls, and study tips for exams.",
  "mindMap": {
    "name": "${doc.title.replace(/"/g, '\\"')}",
    "children": [
      {
        "name": "Subtopic name",
        "children": [
          { "name": "Key concept or detail" }
        ]
      }
    ]
  }
}
Do not include markdown tags like \`\`\`json.`;

    const aiRes = await aiGateway.generateText({
      prompt,
      systemInstruction: 'You are an academic summarizer. Read the text and return revision summaries and a hierarchical mind map structure in raw JSON.',
      userId: null,
      task: 'STUDY_PLAN', // Routes to Groq Llama (fast & free)
    });

    let data;
    try {
      const cleanJson = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleanJson);
    } catch (err) {
      console.error('[Revision Job] Failed to parse summary JSON, creating fallback notes:', err.message);
      data = {
        summary: `Summary of the study materials regarding ${doc.title}.`,
        keyPoints: [`Key facts presented in ${doc.title}`],
        formulaSheet: 'Formula sheet or definition checklist.',
        examNotes: 'Review the text details for exam prep.',
        mindMap: {
          name: doc.title,
          children: [
            { name: 'Core Concepts', children: [{ name: 'Details' }] }
          ]
        }
      };
    }

    // Save Revision Note
    await prisma.revisionNote.create({
      data: {
        documentId,
        summary: data.summary || 'Summary not generated.',
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : ['Key point list.'],
        formulaSheet: data.formulaSheet || null,
        examNotes: data.examNotes || null,
      }
    });

    // Save Mind Map
    await prisma.mindMap.create({
      data: {
        documentId,
        title: doc.title,
        mapData: data.mindMap || {},
      }
    });

    console.log(`[Revision Job] Successfully generated revision notes and mind map for document ${documentId}`);

  } catch (err) {
    console.error(`[Revision Job] Error during generation for document ${documentId}:`, err);
    throw err;
  }
}, { connection: redis });

export { worker as revisionGenWorker };
