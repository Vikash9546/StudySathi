const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const errorMiddleware = require('./middleware/error.middleware');

// ─── Route imports ───
const authRoutes = require('./modules/auth/auth.routes');
const studyRoutes = require('./modules/study/study.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const progressRoutes = require('./modules/progress/progress.routes');

const app = express();

// ─── Global middleware ───
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(generalLimiter);

// ─── Health check ───
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    message: 'StudySathi API is running',
  });
});

// ─── API routes ───
app.use('/api/auth', authRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/progress', progressRoutes);

// ─── 404 handler ───
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: 'Route not found',
  });
});

// ─── Centralised error handler (must be last) ───
app.use(errorMiddleware);

module.exports = app;
