const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { getMetrics } = require('../services/analyticsService');
const cache = require('../utils/cache');
const { success, notFound, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /api/admin/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const metrics = await getMetrics(days);
    return success(res, metrics);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/stats
 * System-wide counts
 */
const getStats = async (req, res, next) => {
  try {
    const [totalDocs, totalChunks, totalUsers, totalQueries, cacheStats] = await Promise.all([
      Document.countDocuments({ status: 'ready' }),
      Chunk.countDocuments(),
      User.countDocuments({ isActive: true }),
      Analytics.countDocuments({ eventType: 'query' }),
      cache.stats(),
    ]);

    return success(res, {
      documents: totalDocs,
      chunks: totalChunks,
      users: totalUsers,
      totalQueries,
      cache: cacheStats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/reindex  — reindex ALL documents
 */
const reindexAll = async (req, res, next) => {
  try {
    const documents = await Document.find({ status: 'ready' }).select('_id name filePath tags');

    if (documents.length === 0) return badRequest(res, 'No documents to reindex');

    res.status(202).json({
      success: true,
      message: `Reindex started for ${documents.length} documents`,
      data: { count: documents.length },
    });

    // Fire reindex for each document via its controller logic
    const { reindexDocument } = require('./documentController');
    for (const doc of documents) {
      try {
        await Document.findByIdAndUpdate(doc._id, { status: 'reindexing' });
        const Chunk = require('../models/Chunk');
        await Chunk.deleteMany({ documentId: doc._id });

        const { processDocumentPipeline } = require('./documentController');
        // We call the internal pipeline directly
        const { processPDF } = require('../services/pdfService');
        const { batchGenerateEmbeddings } = require('../services/embeddingService');
        const fs = require('fs');

        if (!fs.existsSync(doc.filePath)) {
          await Document.findByIdAndUpdate(doc._id, {
            status: 'failed',
            processingError: 'File not found on disk',
          });
          continue;
        }

        const { chunks, totalPages } = await processPDF(doc.filePath, doc.name);
        const embeddings = await batchGenerateEmbeddings(chunks.map((c) => c.text), 5);
        const chunkDocs = chunks.map((chunk, i) => ({
          documentId: doc._id,
          documentName: doc.name,
          text: chunk.text,
          embedding: embeddings[i],
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          tags: doc.tags,
        }));

        await Chunk.insertMany(chunkDocs, { ordered: false });
        await Document.findByIdAndUpdate(doc._id, {
          status: 'ready',
          pageCount: totalPages,
          chunkCount: chunks.length,
        });

        logger.info(`Reindexed document: ${doc.name}`);
      } catch (docErr) {
        logger.error(`Reindex failed for ${doc.name}: ${docErr.message}`);
        await Document.findByIdAndUpdate(doc._id, {
          status: 'failed',
          processingError: docErr.message,
        });
      }
    }

    logger.info('Full reindex complete');
  } catch (err) {
    if (!res.headersSent) next(err);
  }
};

/**
 * GET /api/admin/users
 */
const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(),
    ]);

    return success(res, {
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/toggle
 * Activate/deactivate a user
 */
const toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');
    if (user._id.toString() === req.user._id.toString()) {
      return badRequest(res, 'Cannot deactivate your own account');
    }

    user.isActive = !user.isActive;
    await user.save();

    return success(res, { userId: user._id, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/cache
 */
const clearCache = async (req, res) => {
  cache.flush();
  return success(res, {}, 'Cache cleared successfully');
};

/**
 * GET /api/admin/failed-queries
 */
const getFailedQueries = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const failed = await Analytics.find({
      eventType: { $in: ['failed_query', 'no_answer'] },
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .lean();

    return success(res, { queries: failed });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnalytics,
  getStats,
  reindexAll,
  listUsers,
  toggleUser,
  clearCache,
  getFailedQueries,
};
