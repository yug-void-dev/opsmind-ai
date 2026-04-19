/**
 * OpsMind AI — Document Controller
 *
 * Handles:
 * - PDF upload with immediate 202 response (async processing)
 * - Memory-safe background pipeline: PDF → chunk → embed → store
 * - Duplicate document detection by filename + user
 * - Safe deletion (document + all embeddings)
 * - Reindexing (re-embed without re-upload)
 * - Tag management
 */
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const { processPDF } = require('../services/pdfService');
const { batchGenerateEmbeddings, isValidEmbedding } = require('../services/embeddingService');
const { logUpload } = require('../services/analyticsService');
const { sanitizeFilename, sanitizeTags } = require('../utils/sanitizer');
const cache = require('../utils/cache');
const { success, created, notFound, badRequest, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── Upload Handler ───────────────────────────────────────────────────────────

/**
 * POST /api/documents/upload
 * Accepts PDF, responds 202 immediately, processes in background.
 */
const uploadDocument = async (req, res, next) => {
  const startTime = Date.now();
  let docRecord = null;

  try {
    if (!req.file) return badRequest(res, 'No file provided. Send a PDF file in the "file" field.');

    const originalName = sanitizeFilename(req.file.originalname);
    const customName = req.body.name
      ? sanitizeFilename(req.body.name)
      : path.parse(originalName).name;

    const tags = sanitizeTags(
      Array.isArray(req.body.tags)
        ? req.body.tags
        : typeof req.body.tags === 'string'
        ? req.body.tags.split(',')
        : []
    );

    // Check for duplicate (same user, same sanitized name)
    const existing = await Document.findOne({
      uploadedBy: req.user._id,
      name: customName,
      status: { $ne: 'failed' },
    });

    if (existing) {
      // Clean up the just-uploaded file before rejecting
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return badRequest(
        res,
        `A document named "${customName}" already exists. Use /reindex to re-process or delete it first.`
      );
    }

    // Create document record immediately — processing state
    docRecord = await Document.create({
      name: customName,
      originalName,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      tags,
      uploadedBy: req.user._id,
      status: 'processing',
    });

    logger.info(`[Upload] Document created [${docRecord._id}]: "${customName}" (${(req.file.size / 1024).toFixed(1)} KB)`);

    // Respond immediately — client can poll GET /documents/:id for status
    res.status(202).json({
      success: true,
      message: 'PDF received. Processing started — poll the document status endpoint for completion.',
      data: {
        documentId: docRecord._id,
        name: customName,
        status: 'processing',
        statusEndpoint: `/api/documents/${docRecord._id}`,
      },
    });

    // Run async pipeline — errors are caught internally and written to doc record
    runProcessingPipeline(docRecord, tags, req.user._id, startTime);

  } catch (err) {
    // Cleanup uploaded file on unexpected error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (docRecord?._id) {
      await Document.findByIdAndUpdate(docRecord._id, {
        status: 'failed',
        processingError: err.message,
      }).catch(() => {});
    }
    if (!res.headersSent) next(err);
  }
};

// ─── Background Processing Pipeline ──────────────────────────────────────────

/**
 * Full async pipeline: PDF text extraction → chunking → embedding → MongoDB insert.
 * Runs after HTTP response has been sent.
 * All errors are caught and written back to the document record.
 */
const runProcessingPipeline = async (docRecord, tags, userId, startTime) => {
  logger.info(`[Pipeline] Starting for document [${docRecord._id}] "${docRecord.name}"`);

  try {
    // ── Phase 1: Extract + Chunk ──────────────────────────────────────────
    const { chunks, totalPages, totalChunks, metadata } = await processPDF(
      docRecord.filePath,
      docRecord.name
    );

    if (chunks.length === 0) {
      throw new Error('No text extracted. PDF may be scanned or image-based.');
    }

    logger.info(`[Pipeline] Phase 1 done: ${totalChunks} chunks from ${totalPages} pages`);

    // ── Phase 2: Generate Embeddings ──────────────────────────────────────
    const texts = chunks.map((c) => c.text);
    const embeddings = await batchGenerateEmbeddings(texts, 5, 'RETRIEVAL_DOCUMENT');

    // Validate embeddings — skip zero-vectors (failed chunks)
    const validChunks = chunks.filter((_, i) => isValidEmbedding(embeddings[i]));
    const validEmbeddings = embeddings.filter((e) => isValidEmbedding(e));

    const invalidCount = chunks.length - validChunks.length;
    if (invalidCount > 0) {
      logger.warn(`[Pipeline] ${invalidCount} chunks had invalid embeddings — skipped`);
    }

    logger.info(`[Pipeline] Phase 2 done: ${validChunks.length} valid embeddings generated`);

    // ── Phase 3: Bulk Insert Chunks ───────────────────────────────────────
    const chunkDocs = validChunks.map((chunk, i) => ({
      documentId: docRecord._id,
      documentName: docRecord.name,
      text: chunk.text,
      embedding: validEmbeddings[i],
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      charStart: chunk.charStart || 0,
      charEnd: chunk.charEnd || 0,
      wordCount: chunk.wordCount || 0,
      tags,
    }));

    // ordered: false allows partial success — one bad chunk doesn't block the rest
    await Chunk.insertMany(chunkDocs, { ordered: false });
    logger.info(`[Pipeline] Phase 3 done: ${chunkDocs.length} chunks stored in MongoDB`);

    // ── Phase 4: Update Document Record ──────────────────────────────────
    await Document.findByIdAndUpdate(docRecord._id, {
      status: 'ready',
      pageCount: totalPages,
      chunkCount: validChunks.length,
      'metadata.pdfTitle': metadata.title,
      'metadata.pdfAuthor': metadata.author,
      'metadata.fileSizeMB': String(metadata.fileSizeMB),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[Pipeline] ✅ Complete [${docRecord._id}] in ${elapsed}s`);

    // Flush cache since new document changes retrieval results
    cache.flush();

    await logUpload({ userId, documentId: docRecord._id, responseTime: Date.now() - startTime });

  } catch (err) {
    logger.error(`[Pipeline] ❌ Failed [${docRecord._id}]: ${err.message}`);
    await Document.findByIdAndUpdate(docRecord._id, {
      status: 'failed',
      processingError: err.message,
    }).catch(() => {});
  }
};

// ─── List Documents ───────────────────────────────────────────────────────────

const listDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, tags, search } = req.query;
    const filter = {};

    // Regular users see only their own documents
    if (req.user.role !== 'admin') filter.uploadedBy = req.user._id;
    if (status) filter.status = status;
    if (tags) filter.tags = { $in: tags.split(',').map((t) => t.trim()) };
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean(),
      Document.countDocuments(filter),
    ]);

    return success(res, {
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Document ──────────────────────────────────────────────────────

const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .lean();

    if (!doc) return notFound(res, 'Document not found');

    // Access control: user can only see own documents
    if (
      req.user.role !== 'admin' &&
      doc.uploadedBy._id.toString() !== req.user._id.toString()
    ) {
      return notFound(res, 'Document not found');
    }

    return success(res, { document: doc });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Document ──────────────────────────────────────────────────────────

/**
 * DELETE /api/documents/:id  (admin only)
 * Deletes: document record + ALL chunk embeddings + file from disk
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return notFound(res, 'Document not found');

    // 1. Delete all chunk embeddings from MongoDB
    const chunkResult = await Chunk.deleteMany({ documentId: doc._id });
    logger.info(`[Delete] Removed ${chunkResult.deletedCount} chunks for document ${doc._id}`);

    // 2. Delete file from disk
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
      logger.info(`[Delete] File deleted: ${doc.filePath}`);
    }

    // 3. Delete document record
    await doc.deleteOne();

    // 4. Flush cache (search results change)
    cache.flush();

    logger.info(`[Delete] ✅ Document "${doc.name}" [${doc._id}] fully removed`);

    return success(res, {
      deleted: { documentId: doc._id, name: doc.name, chunksRemoved: chunkResult.deletedCount },
    }, `Document "${doc.name}" and all ${chunkResult.deletedCount} embeddings deleted`);

  } catch (err) {
    next(err);
  }
};

// ─── Reindex Document ─────────────────────────────────────────────────────────

/**
 * POST /api/documents/:id/reindex  (admin only)
 * Re-process and re-embed an existing document without re-uploading.
 */
const reindexDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return notFound(res, 'Document not found');

    if (!doc.filePath || !fs.existsSync(doc.filePath)) {
      return badRequest(
        res,
        'Original file not found on disk. Please re-upload the document.'
      );
    }

    if (doc.status === 'processing' || doc.status === 'reindexing') {
      return badRequest(res, `Document is already being processed (status: ${doc.status})`);
    }

    // Delete existing chunks
    const deleted = await Chunk.deleteMany({ documentId: doc._id });
    logger.info(`[Reindex] Cleared ${deleted.deletedCount} old chunks for [${doc._id}]`);

    // Mark as reindexing
    await Document.findByIdAndUpdate(doc._id, { status: 'reindexing', processingError: null });
    cache.flush();

    res.status(202).json({
      success: true,
      message: `Reindexing started for "${doc.name}". Poll /api/documents/${doc._id} for status.`,
      data: { documentId: doc._id, name: doc.name },
    });

    // Run pipeline again with same doc record
    runProcessingPipeline(doc, doc.tags, req.user._id, Date.now());

  } catch (err) {
    next(err);
  }
};

// ─── Update Tags ──────────────────────────────────────────────────────────────

const updateTags = async (req, res, next) => {
  try {
    const tags = sanitizeTags(
      Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags].filter(Boolean)
    );

    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { tags },
      { new: true, runValidators: true }
    );
    if (!doc) return notFound(res, 'Document not found');

    // Propagate tag updates to all chunks (for hybrid search filtering)
    await Chunk.updateMany({ documentId: doc._id }, { $set: { tags } });

    cache.flush();

    return success(res, { document: doc }, `Tags updated for "${doc.name}"`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  reindexDocument,
  updateTags,
  runProcessingPipeline, // exported for admin reindex-all
};
