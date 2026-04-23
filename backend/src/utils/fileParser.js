const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const logger = require('./logger');

/**
 * Allowed MIME types and their categories.
 */
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'text/plain': 'text',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Validate file type and size.
 *
 * @param {Object} file – multer file object
 * @returns {{ valid: boolean, error?: string }}
 */
const validateFile = (file) => {
  if (!file) return { valid: false, error: 'No file provided' };
  if (!ALLOWED_TYPES[file.mimetype]) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, WEBP, TXT`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size: 10 MB` };
  }
  return { valid: true };
};

/**
 * Extract text from a file buffer based on its MIME type.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<string>} extracted text
 */
const extractText = async (buffer, mimeType) => {
  const category = ALLOWED_TYPES[mimeType];

  if (category === 'text') {
    return buffer.toString('utf-8');
  }

  if (category === 'pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (err) {
      logger.error(`PDF parsing failed: ${err.message}`);
      throw new Error('Failed to extract text from PDF');
    }
  }

  if (category === 'image') {
    try {
      const { data } = await Tesseract.recognize(buffer, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        },
      });
      return data.text || '';
    } catch (err) {
      logger.error(`OCR failed: ${err.message}`);
      throw new Error('Failed to extract text from image');
    }
  }

  throw new Error(`No parser available for type: ${mimeType}`);
};

module.exports = { validateFile, extractText, ALLOWED_TYPES, MAX_FILE_SIZE };
