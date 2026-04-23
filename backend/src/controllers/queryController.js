/**
 * OpsMind AI — Query Controller
 *
 * Orchestrates the full RAG pipeline per request:
 *
 *  1. Sanitize & validate input (prompt injection prevention)
 *  2. Cache check (skip pipeline if cached)
 *  3. Query rewriting (LLM-assisted retrieval optimization)
 *  4. Embedding (RETRIEVAL_QUERY task type)
 *  5. Hybrid retrieval (vector + keyword → RRF → LLM rerank → threshold gate)
 *  6. Anti-hallucination gate (no relevant chunks → "I don't know")
 *  7. Citation assembly (doc name, page, snippet, confidence score)
 *  8. LLM generation (standard OR SSE streaming)
 *  9. Analytics logging
 * 10. Cache write
 */
const { generateQueryEmbedding } = require('../services/embeddingService');
const { retrieveRelevantChunks } = require('../services/retrievalService');
const { generateAnswer, streamAnswer, rewriteQuery } = require('../services/llmService');
const { logQuery, logFailure } = require('../services/analyticsService');
const { sanitizeQuery } = require('../utils/sanitizer');
const cache = require('../utils/cache');
const User = require('../models/User');
const { success, badRequest } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── Constants ────────────────────────────────────────────────────────────────
const NO_ANSWER_TEXT = "I don't know based on the provided SOP documents.";
const CACHE_TTL_SECONDS = 1800; // 30 minutes

// ─── Citation Builder ─────────────────────────────────────────────────────────

/**
 * Build structured citation objects from retrieved chunks.
 * Each citation includes: doc name, page, snippet, and normalized confidence score.
 */
const buildCitations = (chunks) => {
  // Deduplicate by documentId + pageNumber (a page may produce multiple chunks)
  const seen = new Set();
  const citations = [];

  for (const chunk of chunks) {
    // Compute best available relevance score, normalize to 0-1
    const rawScore =
      chunk.rerankScore ??    // LLM rerank score (most reliable)
      chunk.vectorScore ??    // Atlas cosine similarity
      chunk.hybridScore ??    // RRF hybrid score
      0;

    const normalizedScore = Math.min(1, Math.max(0, rawScore));

    // Derive confidence label from score
    const confidence =
      normalizedScore >= 0.85 ? 'HIGH' :
      normalizedScore >= 0.65 ? 'MEDIUM' : 'LOW';

    citations.push({
      documentId: chunk.documentId,
      filename: chunk.documentName,
      page: chunk.pageNumber,
      snippet: chunk.text.slice(0, 250).trim() + (chunk.text.length > 250 ? '...' : ''),
      score: parseFloat(normalizedScore.toFixed(4)),
      confidence,
      rerankReason: chunk.rerankReason || null,
    });
  }

  // Sort by relevance, remove duplicates (keep highest-scored per doc+page)
  const deduped = new Map();
  citations.sort((a, b) => b.score - a.score);
  for (const cit of citations) {
    const key = `${cit.documentId}:${cit.page}`;
    if (!deduped.has(key)) deduped.set(key, cit);
  }

  return Array.from(deduped.values());
};

// ─── SSE Helper ───────────────────────────────────────────────────────────────

/**
 * Write a typed SSE event to the response.
 * Events: 'metadata' | 'sources' | 'chunk' | 'done' | 'error'
 */
const sseWrite = (res, type, payload) => {
  res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
};

// ─── Main Query Handler ───────────────────────────────────────────────────────

const query = async (req, res, next) => {
  const startTime = Date.now();
  let sanitizedQuery = '';
  let rewrittenQuery = '';

  try {
    // ── Step 1: Sanitize ───────────────────────────────────────────────────
    sanitizedQuery = sanitizeQuery(req.body.query);
    const {
      documentId,
      tags,
      stream = false,
      rewriteQuery: shouldRewrite = true,
    } = req.body;

    logger.info(`[Query] User: ${req.user?._id} | Query: "${sanitizedQuery.slice(0, 80)}"`);

    // ── Step 2: Cache Check (non-streaming only) ───────────────────────────
    if (!stream) {
      const cacheKey = cache.buildQueryKey(sanitizedQuery, { documentId, tags });
      const cached = cache.get(cacheKey);
      if (cached) {
        logger.debug(`[Query] Cache HIT`);
        return success(res, { ...cached, cached: true, responseTimeMs: Date.now() - startTime });
      }
    }

    // ── Step 3: Query Rewriting ────────────────────────────────────────────
    rewrittenQuery = sanitizedQuery;
    if (shouldRewrite && appConfig.pipeline.rewrite) {
      rewrittenQuery = await rewriteQuery(sanitizedQuery);
    }

    // ── Step 4: Generate Query Embedding ──────────────────────────────────
    const queryEmbedding = await generateQueryEmbedding(rewrittenQuery);

    // ── Step 5: Hybrid Retrieval ───────────────────────────────────────────
    const filters = {};
    if (documentId) filters.documentId = documentId;
    if (tags?.length > 0) filters.tags = Array.isArray(tags) ? tags : [tags];

    const { chunks, hasRelevantResults, debug: retrievalDebug } =
      await retrieveRelevantChunks(queryEmbedding, rewrittenQuery, filters);

    // ── Step 6: Anti-Hallucination Gate ───────────────────────────────────
    if (!hasRelevantResults || chunks.length === 0) {
      const responseTime = Date.now() - startTime;

      logger.info(`[Query] No relevant chunks above threshold → returning "I don't know"`);

      await logQuery({
        userId: req.user?._id,
        query: sanitizedQuery,
        rewrittenQuery,
        responseTime,
        chunksRetrieved: 0,
        topScore: 0,
        answered: false,
        retrievalDebug,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // SSE no-answer
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // Send metadata first to signal blocked hallucination
        sseWrite(res, 'metadata', {
          answered: false,
          chunksRetrieved: 0,
        });

        sseWrite(res, 'sources', { sources: [] });
        sseWrite(res, 'chunk', { content: NO_ANSWER_TEXT });
        sseWrite(res, 'done', {
          answer: NO_ANSWER_TEXT,
          sources: [],
          answered: false,
          responseTimeMs: responseTime,
        });
        return res.end();
      }

      return success(res, {
        answer: NO_ANSWER_TEXT,
        sources: [],
        chunksRetrieved: 0,
        answered: false,
        queryRewritten: rewrittenQuery !== sanitizedQuery ? rewrittenQuery : null,
        retrievalDebug,
        responseTimeMs: responseTime,
      });
    }

    // ── Step 7: Build Citations ────────────────────────────────────────────
    const sources = buildCitations(chunks);
    const topScore = chunks[0]?.rerankScore ?? chunks[0]?.vectorScore ?? 0;

    // ── Step 8a: SSE Streaming Response ───────────────────────────────────
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
      res.flushHeaders();

      // 1. Send metadata (pipeline info, query info)
      sseWrite(res, 'metadata', {
        queryRewritten: rewrittenQuery !== sanitizedQuery ? rewrittenQuery : null,
        chunksRetrieved: chunks.length,
        pipeline: retrievalDebug,
      });

      // 2. Send sources immediately (UI can render citations while text streams)
      sseWrite(res, 'sources', { sources });

      // 3. Stream LLM tokens
      let fullAnswer = '';
      let tokenUsage = {};
      try {
        const streamResult = await streamAnswer(sanitizedQuery, chunks, (token) => {
          sseWrite(res, 'chunk', { content: token });
        });
        fullAnswer = streamResult.text;
        tokenUsage = streamResult.usage || {};
      } catch (streamErr) {
        logger.error(`[Query] Streaming error: ${streamErr.message}`);
        sseWrite(res, 'error', { message: 'Streaming interrupted. Please retry.' });
      }

      // 4. Send completion event with full answer for client-side state
      const responseTime = Date.now() - startTime;
      const isAnswered = fullAnswer && !fullAnswer.startsWith("I don't know");
      sseWrite(res, 'done', {
        answer: fullAnswer,
        sources: isAnswered ? sources : [],
        answered: isAnswered,
        responseTimeMs: responseTime,
        tokenUsage,
      });
      res.end();

      // Post-stream analytics
      await _postQueryAnalytics({
        userId: req.user?._id,
        query: sanitizedQuery,
        rewrittenQuery,
        responseTime,
        chunks,
        topScore,
        tokenUsage,
        answered: true,
        retrievalDebug,
        req,
      });

      return;
    }

    // ── Step 8b: Standard JSON Response ───────────────────────────────────
    const { text: answer, usage: tokenUsage } = await generateAnswer(sanitizedQuery, chunks);
    const responseTime = Date.now() - startTime;

    const responseData = {
      answer,
      sources,
      answered: true,
      chunksRetrieved: chunks.length,
      queryRewritten: rewrittenQuery !== sanitizedQuery ? rewrittenQuery : null,
      responseTimeMs: responseTime,
      tokenUsage,
      retrievalDebug,
    };

    // Cache write
    const cacheKey = cache.buildQueryKey(sanitizedQuery, { documentId, tags });
    cache.set(cacheKey, responseData, CACHE_TTL_SECONDS);

    await _postQueryAnalytics({
      userId: req.user?._id,
      query: sanitizedQuery,
      rewrittenQuery,
      responseTime,
      chunks,
      topScore,
      tokenUsage,
      answered: true,
      retrievalDebug,
      req,
    });

    return success(res, responseData);

  } catch (err) {
    const responseTime = Date.now() - startTime;

    // Prompt injection / validation errors → 400
    if (
      err.message?.includes('disallowed content') ||
      err.message?.includes('cannot be empty') ||
      err.message?.includes('too long')
    ) {
      return badRequest(res, err.message);
    }

    // Log failure for analytics
    await logFailure({
      userId: req.user?._id,
      query: sanitizedQuery,
      errorMessage: err.message,
      responseTime,
      ipAddress: req.ip,
    }).catch(() => {});

    logger.error(`[Query] Unhandled error: ${err.message}`, { stack: err.stack });
    next(err);
  }
};

// ─── Private Helpers ──────────────────────────────────────────────────────────

const appConfig = require('../config/appConfig');

const _postQueryAnalytics = async ({
  userId, query, rewrittenQuery, responseTime, chunks,
  topScore, tokenUsage, answered, retrievalDebug, req,
}) => {
  await Promise.allSettled([
    logQuery({
      userId,
      query,
      rewrittenQuery,
      responseTime,
      chunksRetrieved: chunks.length,
      topScore,
      answered,
      tokenUsage,
      retrievalDebug,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }),
    userId
      ? User.findByIdAndUpdate(userId, { $inc: { queryCount: 1 } })
      : Promise.resolve(),
  ]);
};

/**
 * POST /api/query/stream — explicit SSE endpoint (always streams)
 */
const streamQuery = (req, res, next) => {
  req.body.stream = true;
  return query(req, res, next);
};

module.exports = { query, streamQuery };
