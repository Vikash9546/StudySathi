import express from 'express';
import cors from 'cors';
import http from 'http';
import { env } from './config/env.js';
import { authMiddleware } from './api/middlewares/auth.middleware.js';
import { errorMiddleware } from './api/middlewares/error.middleware.js';
import { setupSocket } from './realtime/socket.js';

// Import BullMQ workers to start processing queues in background
import './jobs/document-parse.job.js';
import './jobs/question-gen.job.js';
import './jobs/flashcard-gen.job.js';
import './jobs/revision-notes-gen.job.js';
import './jobs/subjective-grade.job.js';

// Import Route Handlers
import authRoutes from './api/routes/auth.routes.js';
import documentRoutes from './api/routes/document.routes.js';
import quizRoutes from './api/routes/quiz.routes.js';
import flashcardRoutes from './api/routes/flashcard.routes.js';
import communityRoutes from './api/routes/community.routes.js';
import gamificationRoutes from './api/routes/gamification.routes.js';
import profileRoutes from './api/routes/profile.routes.js';
import adminRoutes from './api/routes/admin.routes.js';

const app = express();
const server = http.createServer(app);

// Configure cors and basic parsers
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply JWT user verification globally
app.use(authMiddleware);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Map Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Apply central error handler middleware
app.use(errorMiddleware);

// Configure Socket.io
setupSocket(server);

// Start Server
const port = env.PORT || 3000;
server.listen(port, () => {
  console.log(`==================================================`);
  console.log(`🚀 StudySathi AI Server started on port ${port}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`==================================================`);
  // console.log(error);
});

export { app, server };
