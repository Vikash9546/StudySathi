const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with retry logic.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    // Note: Storage initialization now happens automatically via listeners in storage.js
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
