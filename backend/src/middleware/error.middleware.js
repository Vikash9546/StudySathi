const logger = require('../utils/logger');

/**
 * Centralised error handler — must be the LAST middleware registered.
 */
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};

module.exports = errorMiddleware;
