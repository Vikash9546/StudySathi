const { getGroqClient } = require('../../config/ai');
const { SUMMARY_PROMPT, FLASHCARDS_PROMPT, QUIZ_PROMPT } = require('./ai.prompts');
const Result = require('../../models/result.model');
const Note = require('../../models/note.model');
const logger = require('../../utils/logger');

const MAX_INPUT_CHARS = 12000; // limit text sent to LLM
const MAX_RETRIES = 2;
const MODEL = 'llama-3.3-70b-versatile';

class AIService {
  /**
   * Kick off an AI generation task in the background.
   * Returns the Result document immediately (status: "processing").
   *
   * @param {string} noteId
   * @param {string} userId
   * @param {'summary'|'flashcards'|'quiz'} type
   */
  async generate(noteId, userId, type) {
    // 1. Validate note exists and belongs to user
    const note = await Note.findById(noteId);
    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      throw error;
    }
    if (note.userId.toString() !== userId) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }
    if (note.status !== 'ready') {
      const error = new Error('Note text is not ready yet. Please wait for processing to complete.');
      error.statusCode = 409;
      throw error;
    }
    if (!note.textContent || note.textContent.trim().length < 50) {
      const error = new Error('Note text is too short for AI generation (min 50 chars)');
      error.statusCode = 400;
      throw error;
    }

    // 2. Check for existing result (cached)
    const existing = await Result.findOne({ noteId, type });
    if (existing && existing.status === 'completed') {
      return existing; // return cached result
    }

    // 3. Create or update result doc
    let result;
    if (existing) {
      existing.status = 'processing';
      existing.error = null;
      result = await existing.save();
    } else {
      result = await Result.create({ noteId, userId, type, status: 'processing' });
    }

    // 4. Fire-and-forget background generation
    this._runGeneration(result._id, note.textContent, type);

    return result;
  }

  /**
   * Get the current status / result of an AI generation.
   */
  async getResult(resultId, userId) {
    const result = await Result.findById(resultId);
    if (!result) {
      const error = new Error('Result not found');
      error.statusCode = 404;
      throw error;
    }
    if (result.userId.toString() !== userId) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }
    return result;
  }

  /**
   * Get all results for a note.
   */
  async getResultsByNote(noteId, userId) {
    const note = await Note.findById(noteId);
    if (!note) {
      const error = new Error('Note not found');
      error.statusCode = 404;
      throw error;
    }
    if (note.userId.toString() !== userId) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }
    return Result.find({ noteId }).lean();
  }

  // ──────────────────── private helpers ────────────────────

  async _runGeneration(resultId, rawText, type) {
    try {
      const text = rawText.slice(0, MAX_INPUT_CHARS);
      let prompt;

      switch (type) {
        case 'summary':
          prompt = SUMMARY_PROMPT(text);
          break;
        case 'flashcards':
          prompt = FLASHCARDS_PROMPT(text);
          break;
        case 'quiz':
          prompt = QUIZ_PROMPT(text);
          break;
        default:
          throw new Error(`Unknown generation type: ${type}`);
      }

      const response = await this._callGroqWithRetry(prompt);

      // Parse and store
      const update = this._parseResponse(response, type);
      update.status = 'completed';
      update.error = null;

      await Result.findByIdAndUpdate(resultId, update);
      logger.info(`AI ${type} generation completed for result ${resultId}`);
    } catch (err) {
      logger.error(`AI generation failed (result ${resultId}): ${err.message}`);
      await Result.findByIdAndUpdate(resultId, {
        status: 'failed',
        error: err.message,
      });
    }
  }

  async _callGroqWithRetry(prompt, attempt = 0) {
    try {
      const groq = getGroqClient();
      const chatCompletion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      });

      return chatCompletion.choices[0]?.message?.content || '';
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        logger.warn(`Groq API attempt ${attempt + 1} failed, retrying...`);
        // Exponential backoff: 1s, 2s
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
        return this._callGroqWithRetry(prompt, attempt + 1);
      }
      throw new Error(`AI API failed after ${MAX_RETRIES + 1} attempts: ${err.message}`);
    }
  }

  _parseResponse(raw, type) {
    if (type === 'summary') {
      return { summary: raw.trim() };
    }

    // For flashcards and quiz, expect JSON array
    try {
      // Try to extract JSON from the response (LLM sometimes wraps in markdown)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      if (type === 'flashcards') {
        const flashcards = parsed.map((item) => ({
          front: item.front || item.question || '',
          back: item.back || item.answer || '',
        }));
        return { flashcards };
      }

      if (type === 'quiz') {
        const quiz = parsed.map((item) => ({
          question: item.question || '',
          options: Array.isArray(item.options) ? item.options : [],
          answer: item.answer || item.correct_answer || '',
          explanation: item.explanation || '',
        }));
        return { quiz };
      }
    } catch (parseErr) {
      logger.warn(`JSON parse failed for ${type}, using fallback`);
      // Fallback: return raw text as summary
      return type === 'flashcards'
        ? { flashcards: [{ front: 'Parse error', back: raw.slice(0, 500) }] }
        : { quiz: [{ question: 'Parse error — raw response', options: [], answer: raw.slice(0, 500), explanation: '' }] };
    }

    return {};
  }
}

module.exports = new AIService();
