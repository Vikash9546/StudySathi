const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalStudyTime: {
      type: Number, // in minutes
      default: 0,
    },
    quizzesTaken: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number, // percentage 0-100
      default: 0,
    },
    weakTopics: {
      type: [String],
      default: [],
    },
    sessionsCompleted: {
      type: Number,
      default: 0,
    },
    lastStudiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Progress', progressSchema);
