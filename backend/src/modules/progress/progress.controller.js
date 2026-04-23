const progressService = require('./progress.service');

class ProgressController {
  /**
   * GET /progress
   */
  async getProgress(req, res, next) {
    try {
      const progress = await progressService.getProgress(req.user.id);

      return res.status(200).json({
        success: true,
        data: progress,
        message: 'Progress retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /progress/update
   * Body: { studyTimeMinutes?, quizCorrect?, quizTotal?, weakTopics? }
   */
  async updateProgress(req, res, next) {
    try {
      const { studyTimeMinutes, quizCorrect, quizTotal, weakTopics } = req.body;

      // Basic input validation
      if (studyTimeMinutes !== undefined && (typeof studyTimeMinutes !== 'number' || studyTimeMinutes < 0)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'studyTimeMinutes must be a non-negative number',
        });
      }

      if (quizTotal !== undefined && (typeof quizTotal !== 'number' || quizTotal < 0)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'quizTotal must be a non-negative number',
        });
      }

      const progress = await progressService.updateProgress(req.user.id, {
        studyTimeMinutes,
        quizCorrect,
        quizTotal,
        weakTopics,
      });

      return res.status(200).json({
        success: true,
        data: progress,
        message: 'Progress updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProgressController();
