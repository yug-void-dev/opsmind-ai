/**
 * OpsMind AI — File Upload Middleware
 *
 * Security layers:
 *  1. MIME type whitelist (application/pdf only)
 *  2. File extension whitelist (.pdf only)
 *  3. Magic bytes validation (PDF starts with %PDF)
 *  4. File size cap
 *  5. Unique UUID-based storage (prevents path traversal)
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

// ─── Ensure upload directory exists ─────────────────────────────────────────
const uploadDir = path.resolve(appConfig.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`[Upload] Created upload directory: ${uploadDir}`);
}

// ─── Storage Engine ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // UUID filename prevents any path traversal or naming conflicts
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ─── MIME + Extension Filter ──────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowedMimes = ['application/pdf', 'application/x-pdf'];
  const allowedExts = ['.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
    return cb(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF files (.pdf) are accepted'),
      false
    );
  }
  cb(null, true);
};

// ─── Multer Instance ──────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.maxFileSizeMB * 1024 * 1024,
    files: 1,
    fields: 5,
  },
});

// ─── Magic Bytes Validator ────────────────────────────────────────────────────
/**
 * PDF files must start with the %PDF magic bytes.
 * This prevents disguised files (e.g., .exe renamed to .pdf).
 * Called AFTER multer saves the file.
 */
const validatePDFMagicBytes = (filePath) => {
  const buffer = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);
  // PDF magic bytes: 25 50 44 46 (%PDF)
  return buffer.toString('ascii', 0, 4) === '%PDF';
};

// ─── Post-Upload Validation Middleware ───────────────────────────────────────
const validateUploadedFile = (req, res, next) => {
  if (!req.file) return next();

  try {
    if (!validatePDFMagicBytes(req.file.path)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'File rejected: invalid PDF format (magic bytes check failed)',
      });
    }
    next();
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.error(`[Upload] Magic bytes validation error: ${err.message}`);
    next(err);
  }
};

// ─── Multer Error Handler ─────────────────────────────────────────────────────
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `File too large. Maximum allowed size is ${appConfig.maxFileSizeMB} MB`,
      LIMIT_FILE_COUNT: 'Only one file can be uploaded at a time',
      LIMIT_UNEXPECTED_FILE: err.message || 'Unexpected file field',
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || `Upload error: ${err.message}`,
    });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, handleUploadError, validateUploadedFile };
