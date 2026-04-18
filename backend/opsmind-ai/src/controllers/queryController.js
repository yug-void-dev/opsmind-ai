const { generateEmbedding } = require('../services/embeddingService');
const { retrieveRelevantChunks } = require('../services/retrievalService');
const { generateAnswer, streamAnswer, rewriteQuery } = require('../services/llmService');
const { logQuery, logFailure } = require('../services/analyticsService');
const { sanitizeQuery } = require('../utils/sanitizer');
const cache = require('../utils/cache');
const User = require('../models/User');
const { success, badRequest, error } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const NO_ANSWER_RESPONSE = "I don't know based on the provided documents.";

/**
 * POST /api/query
 * Main RAG query endpoint with optional streaming
 */
const query = async (req, res, next) => {
  const startTime = Date.now();
  let sanitizedQuery = '';

  try {
    // Sanitize input
    sanitizedQuery = sanitizeQuery(req.body.query);
    const { documentId, tags, stream = false, rewriteQuery: shouldRewrite = true } = req.body;

    // Check cache (non-streaming only)
    if (!stream) {
      const cacheKey = cache.buildQueryKey(sanitizedQuery, { documentId, tags });
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for query: ${sanitizedQuery.slice(0, 50)}`);
        return success(res, { ...cached, cached: true });
      }
    }

    // Query rewriting for better retrieval
    let retrievalQuery = sanitizedQuery;
    if (shouldRewrite) {
      retrievalQuery = await rewriteQuery(sanitizedQuery);
      logger.debug(`Rewritten query: "${retrievalQuery}"`);
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(retrievalQuery);

    // Vector + keyword retrieval
    const filters = {};
    if (documentId) filters.documentId = documentId;
    if (tags?.length > 0) filters.tags = tags;

    const { chunks, hasRelevantResults } = await retrieveRelevantChunks(
      queryEmbedding,
      retrievalQuery,
      filters
    );

    // Anti-hallucination: return "I don't know" if no relevant chunks
    if (!hasRelevantResults || chunks.length === 0) {
      const responseTime = Date.now() - startTime;
      await logQuery({
        userId: req.user?._id,
        query: sanitizedQuery,
        responseTime,
        chunksRetrieved: 0,
        topScore: 0,
        answered: false,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return success(res, {
        answer: NO_ANSWER_RESPONSE,
        sources: [],
        chunksRetrieved: 0,
        queryRewritten: shouldRewrite ? retrievalQuery : null,
      });
    }

    // Format sources for citation
    const sources = chunks.map((c) => ({
      documentId: c.documentId,
      documentName: c.documentName,
      pageNumber: c.pageNumber,
      relevanceScore: parseFloat((c.vectorScore ?? c.hybridScore ?? c.score ?? 0).toFixed(4)),
      excerpt: c.text.slice(0, 200) + (c.text.length > 200 ? '...' : ''),
    }));

    const topScore = sources[0]?.relevanceScore || 0;

    // ─── Streaming Response (SSE) ────────────────────────────────────────
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Send sources first
      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

      let fullAnswer = '';
      try {
        fullAnswer = await streamAnswer(sanitizedQuery, chunks, (chunk) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        });
      } catch (streamErr) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Streaming failed' })}\n\n`);
        logger.error(`Streaming error: ${streamErr.message}`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done', answer: fullAnswer })}\n\n`);
      res.end();

      // Post-stream analytics
      const responseTime = Date.now() - startTime;
      await logQuery({
        userId: req.user?._id,
        query: sanitizedQuery,
        responseTime,
        chunksRetrieved: chunks.length,
        topScore,
        answered: true,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      if (req.user) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { queryCount: 1 } });
      }
      return;
    }

    // ─── Standard Response ───────────────────────────────────────────────
    const { text: answer, usage: tokenUsage } = await generateAnswer(sanitizedQuery, chunks);

    const responseTime = Date.now() - startTime;

    const responseData = {
      answer,
      sources,
      chunksRetrieved: chunks.length,
      responseTimeMs: responseTime,
      queryRewritten: shouldRewrite ? retrievalQuery : null,
      tokenUsage,
    };

    // Cache successful answers
    const cacheKey = cache.buildQueryKey(sanitizedQuery, { documentId, tags });
    cache.set(cacheKey, responseData, 1800); // 30min cache

    // Analytics
    await logQuery({
      userId: req.user?._id,
      query: sanitizedQuery,
      responseTime,
      chunksRetrieved: chunks.length,
      topScore,
      answered: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      tokenUsage,
    });

    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { queryCount: 1 } });
    }

    return success(res, responseData);

  } catch (err) {
    const responseTime = Date.now() - startTime;

    if (err.message.includes('disallowed content') || err.message.includes('empty')) {
      return badRequest(res, err.message);
    }

    await logFailure({
      userId: req.user?._id,
      query: sanitizedQuery,
      errorMessage: err.message,
      ipAddress: req.ip,
    });

    logger.error(`Query error: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/query/stream  (explicit SSE endpoint)
 * Forces streaming regardless of body param
 */
const streamQuery = async (req, res, next) => {
  req.body.stream = true;
  return query(req, res, next);
};

module.exports = { query, streamQuery };
