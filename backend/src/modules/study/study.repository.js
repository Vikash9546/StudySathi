const Note = require('../../models/note.model');

class StudyRepository {
  async create(data) {
    return Note.create(data);
  }

  async findByUserIdAndHash(userId, hash) {
    return Note.findOne({ userId, hash });
  }

  async findById(id) {
    return Note.findById(id);
  }

  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const [notes, total] = await Promise.all([
      Note.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments({ userId }),
    ]);

    return {
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(noteId, status) {
    return Note.findByIdAndUpdate(noteId, { status }, { new: true });
  }

  async updateTextContent(noteId, textContent) {
    return Note.findByIdAndUpdate(
      noteId,
      { textContent, status: 'ready' },
      { new: true }
    );
  }
}

module.exports = new StudyRepository();
