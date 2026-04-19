/**
 * OpsMind AI — Express Application
 *
 * Security middleware stack (in order):
 *  1. Helmet      — HTTP security headers
 *  2. CORS        — Cross-origin policy
 *  3. Rate limits — Per-route adaptive limits
 *  4. Body parsing — with size caps
 *  5. Morgan      — HTTP access logging
 *  6. Routes
 *  7. 404 handler
 *  8. Global error handler
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const queryRoutes = require('./routes/queryRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const logger = require('./utils/logger');

const app = express();

// ─── 1. Security Headers (Helmet) ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
  })
);

// ─── 2. CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24h
  })
);

// ─── 3. Rate Limiting ─────────────────────────────────────────────────────────

// Global catch-all rate limit
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/health', // Never rate-limit health checks
});

// Strict rate limit for auth endpoints (brute-force prevention)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,                   // 20 login attempts per 15 min
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Query endpoint: generous but not unlimited
const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,             // 30 queries/min per IP
  message: { success: false, message: 'Query rate limit reached. Please wait a moment.' },
});

// Upload endpoint: strict (embedding is expensive)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25,                   // 25 uploads per hour per IP
  message: { success: false, message: 'Upload limit reached. Maximum 25 uploads per hour.' },
});

app.use(globalLimiter);

// ─── 4. Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── 5. HTTP Logging ──────────────────────────────────────────────────────────
const morganFormat =
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

app.use(
  morgan(morganFormat, {
    stream: {
      write: (msg) => logger.http(msg.trim()),
    },
    skip: (req) => req.path === '/health',
  })
);

// ─── Request ID ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const id = require('crypto').randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OpsMind AI',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    llmProvider: process.env.LLM_PROVIDER || 'gemini',
    uptime: Math.floor(process.uptime()),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/documents', uploadLimiter, documentRoutes);
app.use('/api/query', queryLimiter, queryRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
