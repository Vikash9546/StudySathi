const studyRepository = require('./study.repository');
const { getGfs } = require('../../config/storage');
const { extractText } = require('../../utils/fileParser');
const { hashBuffer } = require('../../utils/hash');
const logger = require('../../utils/logger');
const stream = require('stream');

class StudyService {
  /**
   * Upload a note: Save buffer to GridFS manually → extract text (async).
   *
   * @param {Object} file   – multer memory file object
   * @param {string} userId – authenticated user ID
   * @returns {Object} note document
   */
  async uploadNote(file, userId) {
    // 1. Calculate hash first (we have the buffer in memory)
    const fileHash = hashBuffer(file.buffer);
    const existing = await studyRepository.findByUserIdAndHash(userId, fileHash);
    
    if (existing) {
      const error = new Error('Duplicate file — this note already exists');
      error.statusCode = 409;
      throw error;
    }

    // 2. Manually write buffer to GridFS
    const gfs = getGfs();
    const filename = `${Date.now()}-${file.originalname}`;
    
    const uploadStream = gfs.createWriteStream({
      filename: filename,
      bucketName: 'uploads',
      content_type: file.mimetype
    });

    // Wrapped in a promise to handle stream success/failure
    const fileId = await new Promise((resolve, reject) => {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(file.buffer);
      
      bufferStream.pipe(uploadStream)
        .on('error', (err) => reject(err))
        .on('close', (fileData) => resolve(fileData._id));
    });

    // 3. Create note metadata record
    const note = await studyRepository.create({
      userId,
      title: file.originalname,
      fileUrl: fileId,
      fileName: filename,
      mimeType: file.mimetype,
      hash: fileHash,
      status: 'processing',
    });

    // 4. Extract text in background
    this._extractTextBackground(note._id, file.buffer, file.mimetype);

    return note;
  }

  async uploadTextNote(text, title, userId) {
    if (!text || text.trim().length === 0) {
      const error = new Error('Text content cannot be empty');
      error.statusCode = 400;
      throw error;
    }

    const fileHash = hashBuffer(Buffer.from(text, 'utf-8'));
    const existing = await studyRepository.findByUserIdAndHash(userId, fileHash);
    if (existing) {
      const error = new Error('Duplicate note — this content already exists');
      error.statusCode = 409;
      throw error;
    }

    const note = await studyRepository.create({
      userId,
      title: title || 'Text Note',
      textContent: text,
      hash: fileHash,
      status: 'ready',
    });

    return note;
  }

  async getNotes(userId, page, limit) {
    return studyRepository.findByUserId(userId, { page, limit });
  }

  async getNoteById(noteId, userId) {
    const note = await studyRepository.findById(noteId);
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
    return note;
  }

  async updateNote(noteId, userId, data) {
    const note = await studyRepository.findById(noteId);
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

    const allowed = {};
    if (data.title !== undefined && data.title.trim().length > 0) {
      allowed.title = data.title.trim();
    }
    if (data.textContent !== undefined) {
      allowed.textContent = data.textContent;
      allowed.hash = hashBuffer(Buffer.from(data.textContent, 'utf-8'));
      allowed.status = 'ready';
    }

    if (Object.keys(allowed).length === 0) return note;

    return studyRepository.updateById(noteId, allowed);
  }

  async deleteNote(noteId, userId) {
    const note = await studyRepository.findById(noteId);
    if (!note) throw new Error('Note not found');
    if (note.userId.toString() !== userId) throw new Error('Access denied');

    if (note.fileUrl) {
      const gfs = getGfs();
      gfs.remove({ _id: note.fileUrl, root: 'uploads' }, (err) => {
        if (err) logger.error(`GridFS deletion failed: ${err.message}`);
      });
    }

    await studyRepository.deleteResultsByNoteId(noteId);
    await studyRepository.deleteById(noteId);
    return { id: noteId };
  }

  async _extractTextBackground(noteId, buffer, mimeType) {
    try {
      const text = await extractText(buffer, mimeType);
      await studyRepository.updateTextContent(noteId, text);
      logger.info(`Text extracted for note ${noteId}`);
    } catch (err) {
      logger.error(`Text extraction failed for note ${noteId}: ${err.message}`);
      await studyRepository.updateStatus(noteId, 'failed');
    }
  }
}

module.exports = new StudyService();
