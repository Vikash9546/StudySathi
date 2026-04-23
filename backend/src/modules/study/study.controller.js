const studyService = require('./study.service');

class StudyController {
  /**
   * POST /study/upload
   * Accepts a file (multipart) or raw text.
   */
  async upload(req, res, next) {
    try {
      let note;

      if (req.file) {
        // File upload
        note = await studyService.uploadNote(req.file, req.user.id);
      } else if (req.body.text) {
        // Plain text upload
        note = await studyService.uploadTextNote(
          req.body.text,
          req.body.title,
          req.user.id
        );
      } else {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Please provide a file or text content',
        });
      }

      return res.status(201).json({
        success: true,
        data: note,
        message:
          note.status === 'processing'
            ? 'File uploaded. Text extraction in progress — poll GET /study/notes/:id for updates.'
            : 'Note created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /study/notes
   */
  async getNotes(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

      const result = await studyService.getNotes(req.user.id, page, limit);

      return res.status(200).json({
        success: true,
        data: result,
        message: 'Notes retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /study/notes/:id
   */
  async getNoteById(req, res, next) {
    try {
      const note = await studyService.getNoteById(req.params.id, req.user.id);

      return res.status(200).json({
        success: true,
        data: note,
        message: 'Note retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudyController();
