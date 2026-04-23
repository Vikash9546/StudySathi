const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Note',
      trim: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    textContent: {
      type: String,
      default: '',
    },
    hash: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing',
    },
  },
  { timestamps: true }
);

// Compound index for duplicate detection per user
noteSchema.index({ userId: 1, hash: 1 });

module.exports = mongoose.model('Note', noteSchema);
