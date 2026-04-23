/**
 * OpsMind AI — Analytics Service
 *
 * Tracks every pipeline event:
 *  - query       : successful answer with retrieval debug
 *  - no_answer   : threshold gate blocked (anti-hallucination triggered)
 *  - failed_query: pipeline error
 *  - upload      : document processed
 *  - reindex     : document re-embedded
 *
 * All log calls are fire-and-forget (errors silently suppressed)
 * to never block the query response path.
 */
const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const socketService = require('./socketService');

// ─── Event Loggers ─────────────────────────────────────────────────────────

/**
 * Log a query event (answered or no_answer)
 */
const logQuery = async (data) => {
  try {
    const activity = await Analytics.create({
      eventType: data.answered ? 'query' : 'no_answer',
      userId: data.userId,
      query: data.query,
      rewrittenQuery: data.rewrittenQuery,
      answered: data.answered,
      chunksRetrieved: data.chunksRetrieved,
      topScore: data.topScore,
      retrievalDebug: data.retrievalDebug,
      responseTime: data.responseTime,
      tokenUsage: data.tokenUsage,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    // Populate and emit for real-time dashboard
    const populated = await Analytics.findById(activity._id)
      .populate('userId', 'name email avatar')
      .lean();
    socketService.emitActivity(populated);

  } catch (err) {
    logger.warn(`[Analytics] logQuery failed: ${err.message}`);
  }
};

/**
 * Log a pipeline error (embedding fail, LLM timeout, etc.)
 */
const logFailure = async (data) => {
  try {
    const activity = await Analytics.create({
      eventType: 'failed_query',
      userId: data.userId,
      query: data.query,
      errorMessage: data.errorMessage,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
    });

    const populated = await Analytics.findById(activity._id)
      .populate('userId', 'name email avatar')
      .lean();
    socketService.emitActivity(populated);

  } catch (err) {
    logger.warn(`[Analytics] logFailure failed: ${err.message}`);
  }
};

/**
 * Log a document upload completion
 */
const logUpload = async (data) => {
  try {
    const activity = await Analytics.create({
      eventType: 'upload',
      userId: data.userId,
      documentId: data.documentId,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
    });

    const populated = await Analytics.findById(activity._id)
      .populate('userId', 'name email avatar')
      .populate('documentId', 'name originalName')
      .lean();
    socketService.emitActivity(populated);

  } catch (err) {
    logger.warn(`[Analytics] logUpload failed: ${err.message}`);
  }
};

// ─── Metrics Aggregations ──────────────────────────────────────────────────

/**
 * Full analytics report for the admin dashboard.
 * @param {number} days - look-back window
 */
const getMetrics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    eventTotals,
    dailyVolume,
    answerRateAgg,
    topNoAnswerQueries,
    avgRetrievalDebug,
    tokenSummary,
  ] = await Promise.all([

    // 1. Total counts by event type
    Analytics.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),

    // 2. Daily query volume + avg response time
    Analytics.aggregate([
      {
        $match: {
          eventType: { $in: ['query', 'no_answer'] },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalQueries: { $sum: 1 },
          answered: { $sum: { $cond: ['$answered', 1, 0] } },
          avgResponseMs: { $avg: '$responseTime' },
          avgTopScore: { $avg: '$topScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 3. Overall answer rate + performance
    Analytics.aggregate([
      {
        $match: {
          eventType: { $in: ['query', 'no_answer'] },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          answered: { $sum: { $cond: ['$answered', 1, 0] } },
          avgResponseMs: { $avg: '$responseTime' },
          p95ResponseMs: { $push: '$responseTime' },
          avgTopScore: { $avg: '$topScore' },
          avgChunksRetrieved: { $avg: '$chunksRetrieved' },
        },
      },
    ]),

    // 4. Most-failed (no_answer) queries — useful for improving the corpus
    Analytics.aggregate([
      { $match: { eventType: 'no_answer', createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          lastSeen: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),

    // 5. Average retrieval pipeline stage counts
    Analytics.aggregate([
      {
        $match: {
          eventType: 'query',
          'retrievalDebug.stages': { $exists: true },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          avgVector: { $avg: '$retrievalDebug.stages.vector' },
          avgKeyword: { $avg: '$retrievalDebug.stages.keyword' },
          avgAfterRRF: { $avg: '$retrievalDebug.stages.afterRRF' },
          avgAfterRerank: { $avg: '$retrievalDebug.stages.afterRerank' },
          avgAfterThreshold: { $avg: '$retrievalDebug.stages.afterThreshold' },
        },
      },
    ]),

    // 6. Token usage summary
    Analytics.aggregate([
      {
        $match: {
          eventType: 'query',
          'tokenUsage.totalTokens': { $gt: 0 },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          avgPromptTokens: { $avg: '$tokenUsage.promptTokens' },
          avgCompletionTokens: { $avg: '$tokenUsage.completionTokens' },
          avgTotalTokens: { $avg: '$tokenUsage.totalTokens' },
          totalTokensConsumed: { $sum: '$tokenUsage.totalTokens' },
        },
      },
    ]),
  ]);

  // Compute P95 response time (sort and pick 95th percentile)
  const agg = answerRateAgg[0] || {};
  const responseTimes = (agg.p95ResponseMs || []).filter(Boolean).sort((a, b) => a - b);
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p95ResponseMs = responseTimes[p95Index] || 0;

  const totalCounts = eventTotals.reduce((acc, e) => ({ ...acc, [e._id]: e.count }), {});

  return {
    period: `Last ${days} days`,
    overview: {
      totalQueries: (totalCounts.query || 0) + (totalCounts.no_answer || 0),
      answeredQueries: totalCounts.query || 0,
      unansweredQueries: totalCounts.no_answer || 0,
      failedQueries: totalCounts.failed_query || 0,
      uploads: totalCounts.upload || 0,
      answerRate: agg.total > 0
        ? `${((agg.answered / agg.total) * 100).toFixed(1)}%`
        : 'N/A',
    },
    performance: {
      avgResponseMs: Math.round(agg.avgResponseMs || 0),
      p95ResponseMs: Math.round(p95ResponseMs),
      avgTopScore: parseFloat((agg.avgTopScore || 0).toFixed(4)),
      avgChunksRetrieved: parseFloat((agg.avgChunksRetrieved || 0).toFixed(1)),
    },
    retrievalPipeline: avgRetrievalDebug[0]
      ? {
          avgVectorCandidates: Math.round(avgRetrievalDebug[0].avgVector || 0),
          avgKeywordCandidates: Math.round(avgRetrievalDebug[0].avgKeyword || 0),
          avgAfterRRF: Math.round(avgRetrievalDebug[0].avgAfterRRF || 0),
          avgAfterRerank: Math.round(avgRetrievalDebug[0].avgAfterRerank || 0),
          avgPassedThreshold: Math.round(avgRetrievalDebug[0].avgAfterThreshold || 0),
        }
      : null,
    tokenUsage: tokenSummary[0]
      ? {
          avgPromptTokens: Math.round(tokenSummary[0].avgPromptTokens || 0),
          avgCompletionTokens: Math.round(tokenSummary[0].avgCompletionTokens || 0),
          avgTotalTokens: Math.round(tokenSummary[0].avgTotalTokens || 0),
          totalTokensConsumed: tokenSummary[0].totalTokensConsumed || 0,
        }
      : null,
    dailyVolume,
    topUnansweredQueries: topNoAnswerQueries,
  };
};

module.exports = { logQuery, logFailure, logUpload, getMetrics };
