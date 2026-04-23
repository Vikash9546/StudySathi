const multer = require('multer');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// Use memory storage to avoid connection race conditions
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const getGfs = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database connection not ready');
  }
  return Grid(mongoose.connection.db, mongoose.mongo);
};

const ensureDbReady = (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  mongoose.connection.once('open', () => next());
};

module.exports = { upload, getGfs, ensureDbReady };
