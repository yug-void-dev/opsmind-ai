const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  reindexDocument,
  updateTags,
} = require('../controllers/documentController');
const { authenticate, authorize } = require('../middlewares/auth');
const { upload, handleUploadError } = require('../middlewares/upload');
const { validate, schemas } = require('../middlewares/validate');

// All document routes require authentication
router.use(authenticate);

router.post('/upload', upload.single('file'), handleUploadError, uploadDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);

// Admin-only routes
router.delete('/:id', authorize('admin'), deleteDocument);
router.post('/:id/reindex', authorize('admin'), reindexDocument);
router.patch('/:id/tags', authorize('admin'), updateTags);

module.exports = router;
