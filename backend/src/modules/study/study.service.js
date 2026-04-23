const { v4: uuidv4 } = require('uuid');
const studyRepository = require('./study.repository');
const { uploadToFirebase } = require('../../config/firebase');
const { validateFile, extractText } = require('../../utils/fileParser');
const { hashBuffer } = require('../../utils/hash');
const logger = require('../../utils/logger');

class StudyService {
  /**
   * Upload a note: validate → hash → check duplicate → upload to Firebase → extract text (async).
   *
   * @param {Object} file   – multer file object (buffer, mimetype, originalname, size)
   * @param {string} userId – authenticated user ID
   * @returns {Object} note document
   */
  async uploadNote(file, userId) {
    // 1. Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      const error = new Error(validation.error);
      error.statusCode = 400;
      throw error;
    }

    // 2. Hash file for duplicate detection
    const fileHash = hashBuffer(file.buffer);
    const existing = await studyRepository.findByUserIdAndHash(userId, fileHash);
    if (existing) {
      const error = new Error('Duplicate file — this note already exists');
      error.statusCode = 409;
      throw error;
    }

    // 3. Upload to Firebase Storage
    const destPath = `notes/${userId}/${uuidv4()}_${file.originalname}`;
    let fileUrl;
    try {
      fileUrl = await uploadToFirebase(file.buffer, destPath, file.mimetype);
    } catch (err) {
      logger.error(`Firebase upload failed: ${err.message}`);
      const error = new Error('File upload failed. Please try again.');
      error.statusCode = 502;
      throw error;
    }

    // 4. Create note with "processing" status
    const note = await studyRepository.create({
      userId,
      title: file.originalname,
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      hash: fileHash,
      status: 'processing',
    });

    // 5. Extract text in background (non-blocking)
    this._extractTextBackground(note._id, file.buffer, file.mimetype);

    return note;
  }

  /**
   * Upload a plain-text note (no file upload needed).
   */
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

  /**
   * Get all notes for a user (paginated).
   */
  async getNotes(userId, page, limit) {
    return studyRepository.findByUserId(userId, { page, limit });
  }

  /**
   * Get a single note by ID (with ownership check).
   */
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

  /**
   * Background text extraction — updates note when done.
   */
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
