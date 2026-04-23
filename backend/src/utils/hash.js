const crypto = require('crypto');

/**
 * Generate a SHA-256 hash for a given buffer (used for duplicate file detection).
 *
 * @param {Buffer} buffer
 * @returns {string} hex digest
 */
const hashBuffer = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

module.exports = { hashBuffer };
