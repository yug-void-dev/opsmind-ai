const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');

/**
 * Log a query event (fire-and-forget)
 */
const logQuery = async (data) => {
  try {
    await Analytics.create({
      eventType: data.answered === false ? 'no_answer' : 'query',
      userId: data.userId,
      query: data.query,
      responseTime: data.responseTime,
      chunksRetrieved: data.chunksRetrieved,
      topScore: data.topScore,
      answered: data.answered,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      tokenUsage: data.tokenUsage,
    });
  } catch (e) {
    logger.warn(`Analytics log failed: ${e.message}`);
  }
};

/**
 * Log a file upload event
 */
const logUpload = async (data) => {
  try {
    await Analytics.create({
      eventType: 'upload',
      userId: data.userId,
      documentId: data.documentId,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
    });
  } catch (e) {
    logger.warn(`Analytics upload log failed: ${e.message}`);
  }
};

/**
 * Log a failed query/error
 */
const logFailure = async (data) => {
  try {
    await Analytics.create({
      eventType: 'failed_query',
      userId: data.userId,
      query: data.query,
      errorMessage: data.errorMessage,
      ipAddress: data.ipAddress,
    });
  } catch (e) {
    logger.warn(`Analytics failure log failed: ${e.message}`);
  }
};

/**
 * Get usage metrics (admin)
 */
const getMetrics = async (days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [totals, dailyVolume, topQueries, failureRate] = await Promise.all([
    // Total event counts
    Analytics.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]),

    // Daily query volume
    Analytics.aggregate([
      { $match: { eventType: 'query', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          avgTopScore: { $avg: '$topScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Failed / unanswered queries
    Analytics.find({ eventType: 'no_answer', createdAt: { $gte: since } })
      .select('query createdAt userId')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),

    // Answer rate
    Analytics.aggregate([
      { $match: { eventType: { $in: ['query', 'no_answer'] }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          answered: { $sum: { $cond: ['$answered', 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' },
          avgTokens: { $avg: '$tokenUsage.totalTokens' },
        },
      },
    ]),
  ]);

  const summary = failureRate[0] || { total: 0, answered: 0, avgResponseTime: 0 };

  return {
    period: `Last ${days} days`,
    totals: totals.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {}),
    dailyVolume,
    unansweredQueries: topQueries,
    answerRate: summary.total > 0 ? ((summary.answered / summary.total) * 100).toFixed(1) + '%' : 'N/A',
    avgResponseTimeMs: Math.round(summary.avgResponseTime || 0),
    avgTokensPerQuery: Math.round(summary.avgTokens || 0),
  };
};

module.exports = { logQuery, logUpload, logFailure, getMetrics };
