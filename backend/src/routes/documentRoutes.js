const express = require('express');
const router  = express.Router();
const {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  reindexDocument,
  updateTags,
} = require('../controllers/documentController');
const { authenticate, authorize }                    = require('../middlewares/auth');
const { upload, handleUploadError, validateUploadedFile } = require('../middlewares/upload');
const { validate, schemas }                          = require('../middlewares/validate');

// All document routes require authentication
router.use(authenticate);

// ─── Upload ───────────────────────────────────────────────────────────────────
// upload.single → handleUploadError (multer) → validateUploadedFile (magic bytes) → controller
router.post(
  '/upload',
  upload.single('file'),
  handleUploadError,
  validateUploadedFile,
  uploadDocument
);

// ─── Read ─────────────────────────────────────────────────────────────────────
router.get('/',    listDocuments);
router.get('/:id', getDocument);

// ─── Admin-only mutations ─────────────────────────────────────────────────────
router.delete('/:id',        authorize('admin'), deleteDocument);
router.post('/:id/reindex',  authorize('admin'), reindexDocument);
router.patch('/:id/tags',    authorize('admin'), validate(schemas.updateTags), updateTags);

module.exports = router;
