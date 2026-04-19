/**
 * OpsMind AI — Global Error Handler
 *
 * Catches all errors passed via next(err) and returns
 * a standardised JSON error response.
 *
 * Error types handled:
 *  - Mongoose ValidationError  → 400
 *  - Mongoose Duplicate Key    → 409
 *  - Mongoose CastError        → 400
 *  - JWT errors                → 401
 *  - Multer file errors        → 400
 *  - Custom statusCode errors  → as set
 *  - Everything else           → 500
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal server error';

  // ── Mongoose Validation Error ────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const msgs = Object.values(err.errors).map((e) => e.message);
    message = msgs.join(', ');
  }

  // ── Mongoose Duplicate Key ───────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // ── Mongoose CastError (invalid ObjectId, etc.) ──────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: "${err.value}"`;
  }

  // ── JWT Errors ────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired — please log in again'; }
  if (err.name === 'NotBeforeError')     { statusCode = 401; message = 'Token not yet valid'; }

  // ── Multer Errors ─────────────────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE')    { statusCode = 400; message = 'File too large'; }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') { statusCode = 400; message = 'Unexpected file field'; }

  // ── Log ───────────────────────────────────────────────────────────────────
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel](`[${req.method}] ${req.path} → ${statusCode}: ${message}`, {
    requestId: req.requestId,
    user     : req.user?.id,
    ...(statusCode >= 500 && { stack: err.stack }),
  });

  // ── Response ──────────────────────────────────────────────────────────────
  const body = {
    success  : false,
    message,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

/**
 * 404 handler for unmatched routes.
 * Must be registered AFTER all valid routes.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success  : false,
    message  : `Route not found: [${req.method}] ${req.originalUrl}`,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { errorHandler, notFoundHandler };
