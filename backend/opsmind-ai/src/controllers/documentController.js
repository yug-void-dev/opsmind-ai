const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const { processPDF } = require('../services/pdfService');
const { batchGenerateEmbeddings } = require('../services/embeddingService');
const { logUpload } = require('../services/analyticsService');
const { sanitizeFilename, sanitizeTags } = require('../utils/sanitizer');
const { success, created, notFound, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/upload
 * Upload and process a PDF document
 */
const uploadDocument = async (req, res, next) => {
  const startTime = Date.now();
  let docRecord = null;

  try {
    if (!req.file) return badRequest(res, 'No PDF file provided');

    const originalName = sanitizeFilename(req.file.originalname);
    const customName = req.body.name ? sanitizeFilename(req.body.name) : originalName;
    const tags = sanitizeTags(
      Array.isArray(req.body.tags)
        ? req.body.tags
        : req.body.tags
        ? req.body.tags.split(',')
        : []
    );

    // Create document record immediately (processing state)
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

    logger.info(`Document created [${docRecord._id}]: ${customName}`);

    // Respond immediately — processing happens asynchronously
    res.status(202).json({
      success: true,
      message: 'File uploaded. Processing started.',
      data: { documentId: docRecord._id, name: customName, status: 'processing' },
    });

    // ─── Async Processing Pipeline ────────────────────────────────────────
    processDocumentPipeline(docRecord, req.file.path, customName, tags, req.user._id, startTime);

  } catch (err) {
    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (docRecord) {
      await Document.findByIdAndUpdate(docRecord._id, {
        status: 'failed',
        processingError: err.message,
      });
    }
    logger.error(`Upload failed: ${err.message}`);
    if (!res.headersSent) next(err);
  }
};

/**
 * Background processing: PDF → chunks → embeddings → store
 */
const processDocumentPipeline = async (docRecord, filePath, docName, tags, userId, startTime) => {
  try {
    // Step 1: Parse PDF and chunk
    const { chunks, totalPages, totalChunks } = await processPDF(filePath, docName);

    if (chunks.length === 0) {
      await Document.findByIdAndUpdate(docRecord._id, {
        status: 'failed',
        processingError: 'No extractable text found in PDF',
      });
      return;
    }

    // Step 2: Generate embeddings for all chunks
    logger.info(`Generating embeddings for ${chunks.length} chunks...`);
    const texts = chunks.map((c) => c.text);
    const embeddings = await batchGenerateEmbeddings(texts, 5);

    // Step 3: Build chunk documents for bulk insert
    const chunkDocs = chunks.map((chunk, i) => ({
      documentId: docRecord._id,
      documentName: docName,
      text: chunk.text,
      embedding: embeddings[i],
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      tags,
    }));

    // Step 4: Bulk insert chunks
    await Chunk.insertMany(chunkDocs, { ordered: false });
    logger.info(`Inserted ${chunkDocs.length} chunks for document ${docRecord._id}`);

    // Step 5: Update document record as ready
    await Document.findByIdAndUpdate(docRecord._id, {
      status: 'ready',
      pageCount: totalPages,
      chunkCount: totalChunks,
    });

    const elapsed = Date.now() - startTime;
    logger.info(`Document processing complete [${docRecord._id}] in ${elapsed}ms`);

    // Analytics
    await logUpload({
      userId,
      documentId: docRecord._id,
      responseTime: elapsed,
    });

  } catch (err) {
    logger.error(`Pipeline error for [${docRecord._id}]: ${err.message}`);
    await Document.findByIdAndUpdate(docRecord._id, {
      status: 'failed',
      processingError: err.message,
    });
  }
};

/**
 * GET /api/documents
 * List all documents (admin sees all, user sees own)
 */
const listDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, tags } = req.query;
    const filter = {};

    if (req.user.role !== 'admin') filter.uploadedBy = req.user._id;
    if (status) filter.status = status;
    if (tags) filter.tags = { $in: tags.split(',') };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Document.countDocuments(filter),
    ]);

    return success(res, {
      documents,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/documents/:id
 */
const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('uploadedBy', 'name email');
    if (!doc) return notFound(res, 'Document not found');
    if (req.user.role !== 'admin' && doc.uploadedBy._id.toString() !== req.user._id.toString()) {
      return notFound(res, 'Document not found');
    }
    return success(res, { document: doc });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/documents/:id  (admin only)
 */
const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return notFound(res, 'Document not found');

    // Remove chunks
    const chunkResult = await Chunk.deleteMany({ documentId: doc._id });
    logger.info(`Deleted ${chunkResult.deletedCount} chunks for document ${doc._id}`);

    // Remove file from disk
    if (fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await doc.deleteOne();
    logger.info(`Document deleted: ${doc._id} (${doc.name})`);

    return success(res, {}, `Document "${doc.name}" and all its chunks deleted`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/documents/:id/reindex  (admin only)
 * Re-process and re-embed an existing document
 */
const reindexDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return notFound(res, 'Document not found');

    if (!fs.existsSync(doc.filePath)) {
      return badRequest(res, 'Original file no longer exists. Please re-upload.');
    }

    // Mark as reindexing
    await Document.findByIdAndUpdate(doc._id, { status: 'reindexing' });

    // Delete old chunks
    await Chunk.deleteMany({ documentId: doc._id });

    res.status(202).json({
      success: true,
      message: 'Reindexing started',
      data: { documentId: doc._id },
    });

    // Re-run pipeline
    processDocumentPipeline(doc, doc.filePath, doc.name, doc.tags, req.user._id, Date.now());

  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/documents/:id/tags  (admin only)
 */
const updateTags = async (req, res, next) => {
  try {
    const tags = sanitizeTags(req.body.tags || []);
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { tags },
      { new: true }
    );
    if (!doc) return notFound(res, 'Document not found');

    // Update tags on all its chunks too
    await Chunk.updateMany({ documentId: doc._id }, { tags });

    return success(res, { document: doc }, 'Tags updated');
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
};
