const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true },
    back: { type: String, required: true },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['summary', 'flashcards', 'quiz'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    summary: {
      type: String,
      default: null,
    },
    flashcards: {
      type: [flashcardSchema],
      default: [],
    },
    quiz: {
      type: [quizQuestionSchema],
      default: [],
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// One result per (note + type) combo
resultSchema.index({ noteId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
