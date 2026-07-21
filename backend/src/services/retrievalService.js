/**
 * OpsMind AI — Advanced Retrieval Service
 *
 * Pipeline:
 *   1. Vector Search (MongoDB Atlas $vectorSearch — semantic)
 *   2. Keyword Search (MongoDB $text — lexical/BM25-style)
 *   3. Hybrid Fusion via Reciprocal Rank Fusion (RRF)
 *   4. LLM Re-Ranking (cross-encoder-style relevance scoring)
 *   5. Similarity Threshold Gate (anti-hallucination)
 *
 * This is a production-grade RAG retrieval stack.
 */
const Chunk = require('../models/Chunk');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

// ─── Step 1: Vector Search ───────────────────────────────────────────────────

/**
 * MongoDB Atlas Vector Search using $vectorSearch aggregation stage.
 * Returns chunks with their cosine similarity score.
 *
 * Pre-filter support allows scoping to a specific document or tags BEFORE
 * the ANN search, which improves both relevance and performance.
 *
 * @param {number[]} queryEmbedding
 * @param {object} filters
 * @returns {Array<Chunk & { vectorScore: number }>}
 */
const { cosineSimilarity } = require('./embeddingService');

/**
 * Fallback in-memory vector search using cosine similarity.
 * Used automatically if Atlas $vectorSearch index is missing, building, or returns 0 candidates.
 */
const fallbackVectorSearch = async (queryEmbedding, filters = {}) => {
  try {
    const query = {};
    if (filters.documentId) {
      const mongoose = require('mongoose');
      query.documentId = typeof filters.documentId === 'string'
        ? new mongoose.Types.ObjectId(filters.documentId)
        : filters.documentId;
    }
    if (filters.tags?.length > 0) {
      query.tags = { $in: filters.tags };
    }

    // Fetch chunks matching filter (limit 500 for memory safety)
    const chunks = await Chunk.find(query).limit(500).lean();
    if (!chunks || chunks.length === 0) return [];

    // Compute exact cosine similarity
    const scored = [];
    for (const chunk of chunks) {
      if (Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        const { embedding, ...rest } = chunk;
        scored.push({ ...rest, vectorScore: score });
      }
    }

    scored.sort((a, b) => b.vectorScore - a.vectorScore);
    const topCandidates = scored.slice(0, appConfig.rerankTopN);

    logger.info(
      `[Retrieval] Fallback in-memory vector search → ${topCandidates.length} candidates (top score: ${topCandidates[0]?.vectorScore?.toFixed(3) || 0})`
    );
    return topCandidates;
  } catch (err) {
    logger.error(`[Retrieval] Fallback vector search failed: ${err.message}`);
    return [];
  }
};

const vectorSearch = async (queryEmbedding, filters = {}) => {
  const preFilter = buildPreFilter(filters);

  const vectorSearchStage = {
    $vectorSearch: {
      index: appConfig.vectorIndexName,
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: appConfig.vectorCandidates,
      limit: appConfig.rerankTopN,
      ...(preFilter && { filter: preFilter }),
    },
  };

  const pipeline = [
    vectorSearchStage,
    {
      $addFields: {
        vectorScore: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $project: {
        embedding: 0,
      },
    },
  ];

  try {
    const results = await Chunk.aggregate(pipeline);
    logger.debug(`[Retrieval] Atlas vector search → ${results.length} candidates`);
    if (results && results.length > 0) return results;
  } catch (err) {
    logger.warn(`[Retrieval] Atlas $vectorSearch unavailable (${err.message}). Using in-memory vector search fallback.`);
  }

  // Fallback to in-memory vector search if Atlas vectorSearch returns 0 or errors
  return fallbackVectorSearch(queryEmbedding, filters);
};

// ─── Step 2: Keyword Search ──────────────────────────────────────────────────

/**
 * MongoDB full-text search using $text index (BM25-style scoring).
 * Complements vector search by catching exact keyword matches that
 * semantic search might miss (e.g., specific product codes, names, acronyms).
 *
 * @param {string} queryText
 * @param {object} filters
 * @returns {Array<Chunk & { keywordScore: number }>}
 */
const keywordSearch = async (queryText, filters = {}) => {
  const matchQuery = {
    $text: { $search: queryText },
  };

  // Apply the same filters as vector search
  if (filters.documentId) matchQuery.documentId = filters.documentId;
  if (filters.tags?.length > 0) matchQuery.tags = { $in: filters.tags };

  try {
    const results = await Chunk.find(matchQuery, {
      score: { $meta: 'textScore' },
      embedding: 0,
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(appConfig.keywordResultsLimit)
      .lean();

    logger.debug(`[Retrieval] Keyword search → ${results.length} candidates`);
    return results.map((r) => ({ ...r, keywordScore: r.score || 0 }));
  } catch (err) {
    // Text index may not exist — degrade gracefully
    if (err.message?.includes('text index')) {
      logger.warn(`[Retrieval] Text index not available, keyword search skipped`);
      return [];
    }
    throw err;
  }
};

// ─── Step 3: Reciprocal Rank Fusion ─────────────────────────────────────────

/**
 * Combine ranked lists from vector and keyword search using RRF.
 *
 * RRF formula: score(d) = Σ 1/(k + rank(d))
 * where k=60 is the standard constant that reduces the impact of high ranks.
 *
 * Vector results weighted at 70%, keyword at 30%.
 * This reflects the higher semantic quality of dense retrieval for SOP content.
 *
 * @param {Array} vectorChunks
 * @param {Array} keywordChunks
 * @param {number} topN - how many to return after fusion
 * @returns {Array}
 */
const reciprocalRankFusion = (vectorChunks, keywordChunks, topN) => {
  const k = appConfig.rrfK;
  const vectorWeight = appConfig.hybridVectorWeight;
  const keywordWeight = appConfig.hybridKeywordWeight;

  const scores = new Map();  // chunkId → accumulated RRF score
  const registry = new Map(); // chunkId → chunk object

  // Score vector results
  vectorChunks.forEach((chunk, rank) => {
    const id = chunk._id.toString();
    const rrfContrib = (1 / (k + rank + 1)) * vectorWeight;
    scores.set(id, (scores.get(id) || 0) + rrfContrib);
    registry.set(id, { ...chunk, vectorScore: chunk.vectorScore ?? chunk.score ?? 0 });
  });

  // Score keyword results
  keywordChunks.forEach((chunk, rank) => {
    const id = chunk._id.toString();
    const rrfContrib = (1 / (k + rank + 1)) * keywordWeight;
    scores.set(id, (scores.get(id) || 0) + rrfContrib);
    if (!registry.has(id)) registry.set(id, chunk);
    else {
      // Merge keyword score into existing entry
      const existing = registry.get(id);
      registry.set(id, { ...existing, keywordScore: chunk.keywordScore || 0 });
    }
  });

  // Sort by combined RRF score, take topN
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, rrfScore]) => {
      const item = registry.get(id);
      const vecScore = typeof item?.vectorScore === 'number' ? item.vectorScore : 0;
      const kwScore = typeof item?.keywordScore === 'number' ? item.keywordScore : 0;
      const bestScore = vecScore > 0 ? vecScore : (kwScore > 0 ? 0.50 : 0);

      return {
        ...item,
        hybridScore: rrfScore,
        _bestScore: bestScore,
      };
    });
};

// ─── Step 4: LLM Re-Ranking ──────────────────────────────────────────────────

/**
 * Re-rank candidate chunks using LLM relevance scoring.
 *
 * Each chunk is scored 0-10 by the LLM based on how well it answers the query.
 * This acts like a cross-encoder and dramatically improves precision.
 *
 * We use the same LLM provider as generation but with a tiny, cheap prompt.
 *
 * @param {string} query
 * @param {Array} candidates
 * @returns {Array} re-ranked candidates with rerankScore
 */
const rerankWithLLM = async (query, candidates) => {
  if (!appConfig.rerankEnabled || candidates.length <= 1) {
    return candidates;
  }

  // Inline require to avoid circular deps
  const { generateWithProvider } = require('./llmService');

  const scorePromises = candidates.map(async (chunk, idx) => {
    const prompt = appConfig.rerankPrompt
      .replace('{question}', query)
      .replace('{passage}', chunk.text.slice(0, 1000));

    try {
      const result = await generateWithProvider(prompt, { maxTokens: 60, temperature: 0 });
      // Clean JSON response — strip any markdown fences
      const cleaned = result.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const score = typeof parsed.score === 'number' ? parsed.score : 0;
      return {
        ...chunk,
        rerankScore: score / 10, // Normalize to 0-1
        rerankReason: parsed.reason || '',
      };
    } catch (err) {
      logger.warn(`[Rerank] Chunk ${idx} scoring failed: ${err.message}`);
      return { ...chunk, rerankScore: 0.5, rerankReason: 'scoring_failed' };
    }
  });

  const scored = await Promise.all(scorePromises);

  // Sort by rerank score descending
  scored.sort((a, b) => b.rerankScore - a.rerankScore);

  logger.debug(
    `[Rerank] Scores: ${scored.map((c) => `${c.rerankScore.toFixed(2)}`).join(', ')}`
  );

  return scored;
};

// ─── Step 5: Threshold Gate ──────────────────────────────────────────────────

/**
 * Filter chunks that don't meet the minimum similarity threshold.
 * Anti-hallucination gate with realistic thresholds for Enterprise RAG.
 */
const applyThresholdGate = (chunks, threshold = appConfig.similarityThreshold) => {
  return chunks.filter((c) => {
    // If LLM reranking scored the chunk < 0.20, reject as irrelevant
    if (c.rerankScore !== undefined && c.rerankScore < 0.20) return false;

    const vecScore = typeof c.vectorScore === 'number' ? c.vectorScore : undefined;
    const bestScore = typeof c._bestScore === 'number' && c._bestScore > 0 ? c._bestScore : undefined;
    const hybridScore = typeof c.hybridScore === 'number' ? c.hybridScore : undefined;

    const validScores = [vecScore, bestScore, hybridScore].filter((s) => s !== undefined);
    const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0;

    return maxScore >= threshold || (typeof c.keywordScore === 'number' && c.keywordScore > 0);
  });
};

// ─── Helper Utilities ────────────────────────────────────────────────────────

const buildPreFilter = (filters) => {
  if (!filters || Object.keys(filters).length === 0) return null;
  const filter = {};
  if (filters.documentId) {
    // Must use ObjectId format for Atlas pre-filters
    const mongoose = require('mongoose');
    filter.documentId = { $eq: new mongoose.Types.ObjectId(filters.documentId) };
  }
  if (filters.tags?.length > 0) {
    filter.tags = { $in: filters.tags };
  }
  return Object.keys(filter).length > 0 ? filter : null;
};

// ─── Main Retrieval Orchestrator ─────────────────────────────────────────────

/**
 * Full retrieval pipeline:
 * Vector + Keyword → RRF → LLM Re-rank → Threshold Gate
 *
 * @param {number[]} queryEmbedding
 * @param {string} queryText - Rewritten/expanded query for retrieval
 * @param {object} filters
 * @param {string} originalQuery - Original user question for re-ranking
 * @returns {{ chunks, hasRelevantResults, debug }}
 */
const retrieveRelevantChunks = async (queryEmbedding, queryText, filters = {}, originalQuery = null) => {
  const debug = { stages: {} };
  const queryForRerank = originalQuery || queryText;

  // ── Stage 1 & 2: Run vector + keyword search in parallel ──
  const [vectorResult, keywordResult] = await Promise.allSettled([
    vectorSearch(queryEmbedding, filters),
    keywordSearch(queryText, filters),
  ]);

  const vectorChunks = vectorResult.status === 'fulfilled' ? vectorResult.value : [];
  const keywordChunks = keywordResult.status === 'fulfilled' ? keywordResult.value : [];

  debug.stages.vector = vectorChunks.length;
  debug.stages.keyword = keywordChunks.length;

  if (vectorResult.status === 'rejected') {
    logger.error(`[Retrieval] Vector search rejected: ${vectorResult.reason}`);
  }

  // ── Stage 3: Hybrid fusion via RRF ──
  const fusedChunks = reciprocalRankFusion(
    vectorChunks,
    keywordChunks,
    appConfig.rerankTopN
  );
  debug.stages.afterRRF = fusedChunks.length;

  // ── Stage 4: LLM Re-Ranking ──
  let rerankedChunks = fusedChunks;
  if (appConfig.rerankEnabled && fusedChunks.length > 0) {
    rerankedChunks = await rerankWithLLM(queryForRerank, fusedChunks);
    rerankedChunks = rerankedChunks.slice(0, appConfig.rerankFinalN);
  } else {
    rerankedChunks = fusedChunks.slice(0, appConfig.topKResults);
  }
  debug.stages.afterRerank = rerankedChunks.length;

  // ── Stage 5: Threshold Gate ──
  const passedChunks = applyThresholdGate(rerankedChunks);
  debug.stages.afterThreshold = passedChunks.length;
  debug.threshold = appConfig.similarityThreshold;

  logger.info(
    `[Retrieval] Pipeline: vector(${debug.stages.vector}) + keyword(${debug.stages.keyword}) ` +
    `→ RRF(${debug.stages.afterRRF}) → rerank(${debug.stages.afterRerank}) ` +
    `→ threshold(${debug.stages.afterThreshold})`
  );

  return {
    chunks: passedChunks,
    hasRelevantResults: passedChunks.length > 0,
    debug,
  };
};

module.exports = {
  retrieveRelevantChunks,
  vectorSearch,
  keywordSearch,
  reciprocalRankFusion,
  rerankWithLLM,
  applyThresholdGate,
};
