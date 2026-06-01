import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

const defaultOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
};

export const parseQueue = new Queue('document-parsing', defaultOptions);
export const questionQueue = new Queue('question-generation', defaultOptions);
export const flashcardQueue = new Queue('flashcard-generation', defaultOptions);
export const revisionQueue = new Queue('revision-generation', defaultOptions);
export const subjectiveQueue = new Queue('subjective-grading', defaultOptions);
