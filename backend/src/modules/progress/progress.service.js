const progressRepository = require('./progress.repository');
const logger = require('../../utils/logger');

class ProgressService {
  /**
   * Get the progress for a user.
   */
  async getProgress(userId) {
    return progressRepository.getOrCreate(userId);
  }

  /**
   * Update progress after a study session or quiz completion.
   *
   * @param {string} userId
   * @param {Object} data – partial update fields
   * @param {number} [data.studyTimeMinutes]  – minutes studied in this session
   * @param {number} [data.quizCorrect]       – correct answers in this quiz
   * @param {number} [data.quizTotal]         – total questions in this quiz
   * @param {string[]} [data.weakTopics]      – topics the student struggled with
   */
  async updateProgress(userId, data) {
    const current = await progressRepository.getOrCreate(userId);

    const update = {};

    // Add study time
    if (data.studyTimeMinutes && data.studyTimeMinutes > 0) {
      update.totalStudyTime = current.totalStudyTime + data.studyTimeMinutes;
    }

    // Update quiz stats
    if (data.quizTotal && data.quizTotal > 0) {
      const correct = Math.max(0, data.quizCorrect || 0);
      const total = data.quizTotal;

      update.quizzesTaken = current.quizzesTaken + 1;
      update.totalCorrect = current.totalCorrect + correct;
      update.totalQuestions = current.totalQuestions + total;
      update.accuracy =
        Math.round(((update.totalCorrect || current.totalCorrect) /
          (update.totalQuestions || current.totalQuestions)) * 100 * 10) / 10; // 1 decimal
    }

    // Merge weak topics (deduplicate)
    if (Array.isArray(data.weakTopics) && data.weakTopics.length > 0) {
      const merged = [...new Set([...current.weakTopics, ...data.weakTopics])];
      update.weakTopics = merged.slice(0, 50); // cap at 50 topics
    }

    // Session tracking
    update.sessionsCompleted = current.sessionsCompleted + 1;
    update.lastStudiedAt = new Date();

    const updated = await progressRepository.update(userId, update);
    logger.info(`Progress updated for user ${userId}`);

    return updated;
  }
}

module.exports = new ProgressService();
