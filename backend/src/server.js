require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const http = require('http');

const PORT = process.env.PORT || 5001;
const ENV = process.env.NODE_ENV || 'development';

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running in ${ENV} mode on port ${PORT}`);
      logger.info(`   Health check: http://localhost:${PORT}/api/health`);
    });

    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use.`);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
