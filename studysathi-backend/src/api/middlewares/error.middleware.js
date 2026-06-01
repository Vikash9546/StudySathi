import { AppError } from '../../common/errors.js';

export function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(`❌ [Error] ${req.method} ${req.originalUrl}:`, err.stack || err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    message: typeof message === 'object' && message.message ? message.message : message,
  });
}
