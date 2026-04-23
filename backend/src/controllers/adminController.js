/**
 * OpsMind AI — Admin Controller
 */
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { getMetrics } = require('../services/analyticsService');
const { runProcessingPipeline } = require('./documentController');
const cache = require('../utils/cache');
const { success, notFound, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const fs = require('fs');

// ─── Analytics & Stats ────────────────────────────────────────────────────────

/** GET /api/admin/analytics */
const getAnalytics = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    const metrics = await getMetrics(days);
    return success(res, metrics);
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/stats */
const getStats = async (req, res, next) => {
  try {
    const [docStats, totalChunks, totalUsers, queryStats, cacheStats] = await Promise.all([
      Document.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Chunk.countDocuments(),
      User.countDocuments({ isActive: true }),
      Analytics.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $cond: [{ $in: ['$eventType', ['query', 'no_answer']] }, 1, 0] } },
            answered: { $sum: { $cond: ['$answered', 1, 0] } },
            avgResponseMs: { $avg: { $cond: [{ $eq: ['$eventType', 'query'] }, '$responseTime', null] } },
          },
        },
      ]),
      Promise.resolve(cache.stats()),
    ]);

    const docStatusMap = docStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
    const qs = queryStats[0] || { total: 0, answered: 0, avgResponseMs: 0 };

    return success(res, {
      documents: {
        ready: docStatusMap.ready || 0,
        processing: docStatusMap.processing || 0,
        failed: docStatusMap.failed || 0,
        reindexing: docStatusMap.reindexing || 0,
        total: Object.values(docStatusMap).reduce((a, b) => a + b, 0),
      },
      chunks: totalChunks,
      users: totalUsers,
      queries: {
        total: qs.total,
        answered: qs.answered,
        unanswered: qs.total - qs.answered,
        answerRate: qs.total > 0 ? `${((qs.answered / qs.total) * 100).toFixed(1)}%` : 'N/A',
        avgResponseMs: Math.round(qs.avgResponseMs || 0),
      },
      cache: cacheStats,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Reindex All ─────────────────────────────────────────────────────────────

/** POST /api/admin/reindex — re-embed all ready documents */
const reindexAll = async (req, res, next) => {
  try {
    const documents = await Document.find({
      status: { $in: ['ready', 'failed'] },
    }).select('_id name filePath tags');

    const validDocs = documents.filter((d) => d.filePath && fs.existsSync(d.filePath));
    const missingFiles = documents.length - validDocs.length;

    if (validDocs.length === 0) {
      return badRequest(res, 'No documents with accessible files to reindex');
    }

    res.status(202).json({
      success: true,
      message: `Reindexing ${validDocs.length} documents in background${missingFiles > 0 ? ` (${missingFiles} skipped — files missing)` : ''}.`,
      data: { scheduled: validDocs.length, skipped: missingFiles },
    });

    // Run sequentially to avoid overwhelming embedding API rate limits
    ;(async () => {
      for (const doc of validDocs) {
        try {
          logger.info(`[ReindexAll] Processing: "${doc.name}" [${doc._id}]`);
          await Chunk.deleteMany({ documentId: doc._id });
          await Document.findByIdAndUpdate(doc._id, { status: 'reindexing' });
          await runProcessingPipeline(doc, doc.tags, req.user._id, Date.now());
          // Small delay between documents to avoid rate limits
          await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          logger.error(`[ReindexAll] Failed for "${doc.name}": ${err.message}`);
        }
      }
      logger.info(`[ReindexAll] ✅ Complete`);
    })();

  } catch (err) {
    if (!res.headersSent) next(err);
  }
};

// ─── User Management ─────────────────────────────────────────────────────────

/** GET /api/admin/users */
const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return success(res, users);
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/admin/users/:id/toggle */
const toggleUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return badRequest(res, 'You cannot deactivate your own account');
    }
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    logger.info(`[Admin] User ${user.email} → isActive: ${user.isActive} (by ${req.user.email})`);
    return success(res, { userId: user._id, email: user.email, isActive: user.isActive });
  } catch (err) {
    next(err);
  }
};

// ─── Cache Management ─────────────────────────────────────────────────────────

/** DELETE /api/admin/cache */
const clearCache = (req, res) => {
  const statsBefore = cache.stats();
  cache.flush();
  logger.info(`[Admin] Cache cleared by ${req.user.email} (was: ${statsBefore.keys} keys)`);
  return success(res, { cleared: statsBefore.keys }, 'Cache cleared');
};

// ─── Failed Queries ───────────────────────────────────────────────────────────

/** GET /api/admin/failed-queries */
const getFailedQueries = async (req, res, next) => {
  try {
    const { days = 7, limit = 50 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [noAnswers, errors] = await Promise.all([
      Analytics.find({ eventType: 'no_answer', createdAt: { $gte: since } })
        .select('query rewrittenQuery chunksRetrieved topScore createdAt userId')
        .populate('userId', 'email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean(),
      Analytics.find({ eventType: 'failed_query', createdAt: { $gte: since } })
        .select('query errorMessage createdAt userId')
        .populate('userId', 'email')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return success(res, {
      period: `Last ${days} days`,
      noAnswerQueries: noAnswers,
      errorQueries: errors,
      summary: {
        totalNoAnswer: noAnswers.length,
        totalErrors: errors.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Document Management (Admin View) ────────────────────────────────────────

/** GET /api/admin/documents — all documents across all users */
const listAllDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
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
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return badRequest(res, 'Invalid role. Must be "user" or "admin".');
    }

    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return notFound(res, 'User not found');

    logger.info(`[Admin] Role updated for ${user.email} to ${role}`);
    return success(res, user, `User role updated to ${role}`);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/users/:id/reset-password
 */
const resetUserPassword = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');

    // Default reset password
    const defaultPass = 'Welcome@123';
    user.password = defaultPass;
    await user.save();

    logger.info(`[Admin] Password reset for user ${user.email}`);
    return success(res, null, `Password has been reset to default: ${defaultPass}`);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return badRequest(res, 'You cannot delete your own administrative account.');
    }

    const User = require('../models/User');
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return notFound(res, 'User not found');

    logger.info(`[Admin] User deleted: ${user.email}`);
    return success(res, { id: user._id }, `User ${user.email} permanently deleted`);
  } catch (err) {
    next(err);
  }
};

const listActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Filter out 'upload' events that have a null documentId
    const filter = {
      $or: [
        { eventType: { $ne: 'upload' } },
        { eventType: 'upload', documentId: { $ne: null } }
      ]
    };

    const [activities, total] = await Promise.all([
      Analytics.find(filter)
        .populate('userId', 'name email avatar')
        .populate('documentId', 'name originalName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Analytics.countDocuments(filter),
    ]);

    return success(res, {
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnalytics,
  getStats,
  listActivities,
  reindexAll,
  listUsers,
  toggleUser,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  clearCache,
  getFailedQueries,
  listAllDocuments,
};
