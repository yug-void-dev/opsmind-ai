/**
 * OpsMind AI — Server Entry Point
 *
 * Startup sequence:
 *  1. Validate required environment variables (fail fast)
 *  2. Connect to MongoDB Atlas
 *  3. Start HTTP server
 *  4. Register process signal handlers for graceful shutdown
 */

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const socketService = require('./services/socketService');

const PORT = parseInt(process.env.PORT) || 5000;

// ─── Startup Validation ───────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];

const validateEnv = () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('\n❌  OpsMind AI startup failed — missing required environment variables:');
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error('\n   → Copy .env.example → .env and fill in all required values.\n');
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('\n❌  JWT_SECRET must be at least 32 characters long.');
    console.error('   → Run: openssl rand -base64 48\n');
    process.exit(1);
  }

  // Warn about recommended but optional vars
  const RECOMMENDED = ['GROQ_API_KEY'];
  const missingRecommended = RECOMMENDED.filter((k) => !process.env[k] && process.env.LLM_PROVIDER === k.replace('_API_KEY', '').toLowerCase());
  if (missingRecommended.length > 0) {
    logger.warn(`Missing recommended env vars: ${missingRecommended.join(', ')}`);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (server, signal) => {
  logger.info(`${signal} received — starting graceful shutdown`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server close:', { error: err.message });
      process.exit(1);
    }
    logger.info('HTTP server closed cleanly');
    process.exit(0);
  });

  // Force-kill after 10 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  validateEnv();

  logger.info('🔌 Connecting to MongoDB Atlas...');
  await connectDB();

  const server = app.listen(PORT, () => {
    const banner = `
╔═══════════════════════════════════════════╗
║          OpsMind AI Backend v2.0          ║
║      Enterprise SOP Knowledge Agent       ║
╠═══════════════════════════════════════════╣
║  Port     : ${String(PORT).padEnd(28)}║
║  Env      : ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║  LLM      : ${(process.env.LLM_PROVIDER || 'gemini').padEnd(28)}║
║  Rerank   : ${(process.env.RERANK_ENABLED !== 'false' ? 'enabled' : 'disabled').padEnd(28)}║
║  Health   : http://localhost:${PORT}/health${' '.repeat(Math.max(0, 13 - String(PORT).length))}║
╚═══════════════════════════════════════════╝`;
    logger.info(banner);

    // Initialize Socket.io
    socketService.init(server);
    logger.info('🚀 Socket.io initialized');
  });

  // ─── Process Handlers ──────────────────────────────────────────────────
  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));
  process.on('SIGINT',  () => shutdown(server, 'SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    // In production, unhandled rejections should restart the process
    if (process.env.NODE_ENV === 'production') {
      shutdown(server, 'UNHANDLED_REJECTION');
    }
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception — shutting down', {
      error: err.message,
      stack: err.stack,
    });
    shutdown(server, 'UNCAUGHT_EXCEPTION');
  });

  return server;
};

startServer().catch((err) => {
  logger.error(`Fatal startup error: ${err.message}`, { stack: err.stack });
  process.exit(1);
});
