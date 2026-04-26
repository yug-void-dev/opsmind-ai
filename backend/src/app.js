/**
 * OpsMind AI — Express Application
 *
 * Middleware stack (in order):
 *  1. Helmet      — HTTP security headers
 *  2. CORS        — Cross-origin resource sharing
 *  3. Rate limits — Per-route adaptive limits
 *  4. Body parsing — JSON + URL-encoded with size caps
 *  5. Morgan      — HTTP access logging (skips /health)
 *  6. Request ID  — UUID injected on every request
 *  7. Health check— GET /health (unauthenticated, never rate-limited)
 *  8. API Routes  — /api/{auth,documents,query,chats,admin}
 *  9. 404 handler
 * 10. Global error handler
 */

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const crypto  = require('crypto');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const queryRoutes    = require('./routes/queryRoutes');
const chatRoutes     = require('./routes/chatRoutes');
const adminRoutes    = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ─── 1. Security Headers ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc : ["'self'"],
        scriptSrc  : ["'self'"],
        objectSrc  : ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts       : { maxAge: 31_536_000, includeSubDomains: true },
    noSniff    : true,
    frameguard : { action: 'deny' },
    xssFilter  : true,
  })
);

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173';
const allowedOrigins = rawOrigins === '*'
  ? '*'
  : rawOrigins.split(',').map((o) => {
      const trimmed = o.trim();
      try {
        // Robustness: if user accidentally includes a path (e.g. /login) or trailing slash,
        // extract just the origin (e.g., https://example.com)
        return new URL(trimmed).origin;
      } catch (e) {
        // Fallback for localhost without http:// or just return trimmed
        return trimmed.replace(/\/+$/, '');
      }
    }).filter(Boolean);

app.use(
  cors({
    origin      : allowedOrigins,
    methods     : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials : true,
    maxAge      : 86_400, // Cache OPTIONS preflight for 24 h
  })
);

// ─── 3. Rate Limiting ─────────────────────────────────────────────────────────

// Global — applied to everything, but /health is exempt
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max     : parseInt(process.env.RATE_LIMIT_MAX)        || 500,
  standardHeaders: true,
  legacyHeaders  : false,
  message        : { success: false, message: 'Too many requests — please slow down.' },
  skip           : (req) => req.path === '/health',
});

// Auth — strict brute-force prevention (20 attempts / 15 min, skip successes)
const authLimiter = rateLimit({
  windowMs             : 15 * 60 * 1000,
  max                  : 20,
  skipSuccessfulRequests: true,
  message              : { success: false, message: 'Too many auth attempts — try again in 15 minutes.' },
});

// Query — generous but bounded (30 req / min)
const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max     : 30,
  message : { success: false, message: 'Query rate limit reached — please wait a moment.' },
});

// Upload — expensive (embedding API costs); 25 uploads / hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max     : 25,
  message : { success: false, message: 'Upload limit reached — maximum 25 uploads per hour.' },
});

app.use(globalLimiter);

// ─── 4. Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── 5. HTTP Request Logging ──────────────────────────────────────────────────
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip  : (req) => req.path === '/health',
  })
);

// ─── 6. Request ID ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const id = crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// ─── 7. Health Check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const mongoose = require('mongoose');
  const dbState  = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.status(200).json({
    status     : 'healthy',
    service    : 'OpsMind AI',
    version    : '2.0.0',
    timestamp  : new Date().toISOString(),
    uptime     : Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    llmProvider: process.env.LLM_PROVIDER || 'gemini',
    database   : dbState[mongoose.connection.readyState] || 'unknown',
    memory     : {
      rss       : `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapUsed  : `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
    },
  });
});

// ─── 8. API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',      authLimiter,   authRoutes);
app.use('/api/documents',                documentRoutes);
app.use('/api/query',     queryLimiter,  queryRoutes);
app.use('/api/chats',                    chatRoutes);
app.use('/api/admin',                    adminRoutes);
app.use('/api/notifications',            notificationRoutes);

// ─── 9–10. Error Handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
