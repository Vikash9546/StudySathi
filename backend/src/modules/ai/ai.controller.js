const aiService = require('./ai.service');

class AIController {
  /**
   * POST /ai/summarize
   * Body: { noteId }
   */
  async summarize(req, res, next) {
    try {
      const { noteId } = req.body;
      if (!noteId) {
        return res.status(400).json({ success: false, data: null, message: 'noteId is required' });
      }

      const result = await aiService.generate(noteId, req.user.id, 'summary');

      const statusCode = result.status === 'completed' ? 200 : 202;
      return res.status(statusCode).json({
        success: true,
        data: result,
        message:
          result.status === 'completed'
            ? 'Summary ready (cached)'
            : 'Summary generation started. Poll GET /ai/result/:id for updates.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/flashcards
   * Body: { noteId }
   */
  async flashcards(req, res, next) {
    try {
      const { noteId } = req.body;
      if (!noteId) {
        return res.status(400).json({ success: false, data: null, message: 'noteId is required' });
      }

      const result = await aiService.generate(noteId, req.user.id, 'flashcards');

      const statusCode = result.status === 'completed' ? 200 : 202;
      return res.status(statusCode).json({
        success: true,
        data: result,
        message:
          result.status === 'completed'
            ? 'Flashcards ready (cached)'
            : 'Flashcard generation started. Poll GET /ai/result/:id for updates.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /ai/quiz
   * Body: { noteId }
   */
  async quiz(req, res, next) {
    try {
      const { noteId } = req.body;
      if (!noteId) {
        return res.status(400).json({ success: false, data: null, message: 'noteId is required' });
      }

      const result = await aiService.generate(noteId, req.user.id, 'quiz');

      const statusCode = result.status === 'completed' ? 200 : 202;
      return res.status(statusCode).json({
        success: true,
        data: result,
        message:
          result.status === 'completed'
            ? 'Quiz ready (cached)'
            : 'Quiz generation started. Poll GET /ai/result/:id for updates.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/result/:id
   * Poll this to check generation status.
   */
  async getResult(req, res, next) {
    try {
      const result = await aiService.getResult(req.params.id, req.user.id);

      return res.status(200).json({
        success: true,
        data: result,
        message: `Result status: ${result.status}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ai/results/note/:noteId
   * Get all AI results for a specific note.
   */
  async getResultsByNote(req, res, next) {
    try {
      const results = await aiService.getResultsByNote(req.params.noteId, req.user.id);

      return res.status(200).json({
        success: true,
        data: results,
        message: 'Results retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
