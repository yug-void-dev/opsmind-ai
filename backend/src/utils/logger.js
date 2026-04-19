/**
 * OpsMind AI — Winston Logger
 *
 * Log levels (descending severity):
 *   error > warn > info > http > debug
 *
 * Production: writes to log files only (warn+)
 * Development: writes to console + files (debug+)
 */

const winston = require('winston');
const path    = require('path');
const fs      = require('fs');

// Ensure logs directory exists
const LOG_DIR = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ─── Formats ──────────────────────────────────────────────────────────────────
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extras = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `${timestamp} [${level}]: ${message}${extras}`;
  })
);

// ─── Transports ───────────────────────────────────────────────────────────────
const transports = [
  new winston.transports.File({
    filename : path.join(LOG_DIR, 'error.log'),
    level    : 'error',
    format   : jsonFormat,
    maxsize  : 5_242_880, // 5 MB
    maxFiles : 5,
    tailable : true,
  }),
  new winston.transports.File({
    filename : path.join(LOG_DIR, 'combined.log'),
    format   : jsonFormat,
    maxsize  : 10_485_760, // 10 MB
    maxFiles : 10,
    tailable : true,
  }),
];

if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level : 'debug',
    })
  );
} else {
  // In production, also log warnings+ to console for container stdout
  transports.push(
    new winston.transports.Console({
      format: jsonFormat,
      level : 'warn',
    })
  );
}

// ─── Logger Instance ──────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level      : process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  levels     : winston.config.npm.levels,
  format     : jsonFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(LOG_DIR, 'rejections.log') }),
  ],
  exitOnError: false,
});

module.exports = logger;
