require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Graceful shutdown handler
const shutdown = (server, signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════╗
║          OpsMind AI Backend            ║
║     Enterprise SOP Knowledge Agent     ║
╠════════════════════════════════════════╣
║  Port    : ${PORT}                        ║
║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(24)}║
║  LLM     : ${(process.env.LLM_PROVIDER || 'gemini').padEnd(24)}║
╚════════════════════════════════════════╝
      `);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason: reason?.message || reason });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
      shutdown(server, 'UNCAUGHT_EXCEPTION');
    });

    process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => shutdown(server, 'SIGINT'));

    return server;
  } catch (error) {
    logger.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

startServer();
