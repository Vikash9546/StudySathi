const Progress = require('../../models/progress.model');

class ProgressRepository {
  /**
   * Get or create a progress document for a user.
   */
  async getOrCreate(userId) {
    let progress = await Progress.findOne({ userId });
    if (!progress) {
      progress = await Progress.create({ userId });
    }
    return progress;
  }

  async update(userId, updateData) {
    return Progress.findOneAndUpdate({ userId }, updateData, {
      new: true,
      upsert: true,
    });
  }
}

module.exports = new ProgressRepository();
