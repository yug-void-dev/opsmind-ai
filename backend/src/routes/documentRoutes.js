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
const { upload, handleUploadError, validateUploadedFile } = require('../middlewares/upload');

router.use(authenticate);

// upload.single → handleUploadError → validateUploadedFile → controller
router.post(
  '/upload',
  upload.single('file'),
  handleUploadError,
  validateUploadedFile,
  uploadDocument
);

router.get('/', listDocuments);
router.get('/:id', getDocument);

// Admin-only
router.delete('/:id', authorize('admin'), deleteDocument);
router.post('/:id/reindex', authorize('admin'), reindexDocument);
router.patch('/:id/tags', authorize('admin'), updateTags);

module.exports = router;
