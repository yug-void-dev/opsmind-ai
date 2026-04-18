const Chunk = require('../models/Chunk');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

/**
 * Perform Atlas Vector Search
 * Requires the vector_index to be created in Atlas UI
 * @param {number[]} queryEmbedding
 * @param {object} filters - Optional: { documentId, tags }
 * @returns {Array} ranked chunks with scores
 */
const vectorSearch = async (queryEmbedding, filters = {}) => {
  const vectorSearchStage = {
    $vectorSearch: {
      index: appConfig.vectorIndexName,
      path: 'embedding',
      queryVector: queryEmbedding,
      numCandidates: appConfig.topKResults * 20, // Over-fetch for re-ranking
      limit: appConfig.topKResults * 2,
    },
  };

  // Add pre-filters if provided
  if (filters.documentId) {
    vectorSearchStage.$vectorSearch.filter = {
      documentId: { $eq: filters.documentId },
    };
  }

  if (filters.tags && filters.tags.length > 0) {
    vectorSearchStage.$vectorSearch.filter = {
      ...(vectorSearchStage.$vectorSearch.filter || {}),
      tags: { $in: filters.tags },
    };
  }

  const pipeline = [
    vectorSearchStage,
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $project: {
        embedding: 0, // Exclude large embedding array from results
      },
    },
  ];

  const results = await Chunk.aggregate(pipeline);
  logger.debug(`Vector search returned ${results.length} candidates`);
  return results;
};

/**
 * Keyword search using MongoDB text index (for hybrid search)
 * @param {string} query
 * @param {object} filters
 * @returns {Array}
 */
const keywordSearch = async (query, filters = {}) => {
  const searchQuery = {
    $text: { $search: query },
  };

  if (filters.documentId) searchQuery.documentId = filters.documentId;
  if (filters.tags?.length > 0) searchQuery.tags = { $in: filters.tags };

  const results = await Chunk.find(searchQuery, {
    score: { $meta: 'textScore' },
    embedding: 0,
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(appConfig.topKResults * 2)
    .lean();

  return results.map((r) => ({ ...r, keywordScore: r.score || 0 }));
};

/**
 * Hybrid search: combine vector + keyword results using Reciprocal Rank Fusion (RRF)
 * @param {number[]} queryEmbedding
 * @param {string} queryText
 * @param {object} filters
 * @returns {Array} deduplicated, re-ranked chunks
 */
const hybridSearch = async (queryEmbedding, queryText, filters = {}) => {
  const [vectorResults, keywordResults] = await Promise.allSettled([
    vectorSearch(queryEmbedding, filters),
    keywordSearch(queryText, filters),
  ]);

  const vectorChunks = vectorResults.status === 'fulfilled' ? vectorResults.value : [];
  const keywordChunks = keywordResults.status === 'fulfilled' ? keywordResults.value : [];

  // RRF scoring
  const k = 60; // RRF constant
  const scores = new Map();
  const chunksById = new Map();

  vectorChunks.forEach((chunk, rank) => {
    const id = chunk._id.toString();
    const rrfScore = 1 / (k + rank + 1);
    scores.set(id, (scores.get(id) || 0) + rrfScore * 0.7); // Weight vector higher
    chunksById.set(id, { ...chunk, vectorScore: chunk.score });
  });

  keywordChunks.forEach((chunk, rank) => {
    const id = chunk._id.toString();
    const rrfScore = 1 / (k + rank + 1);
    scores.set(id, (scores.get(id) || 0) + rrfScore * 0.3);
    if (!chunksById.has(id)) chunksById.set(id, chunk);
  });

  // Sort by combined RRF score
  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, appConfig.topKResults)
    .map(([id, rrf]) => ({ ...chunksById.get(id), hybridScore: rrf }));

  logger.debug(`Hybrid search: ${vectorChunks.length} vector + ${keywordChunks.length} keyword → ${ranked.length} final`);
  return ranked;
};

/**
 * Apply similarity threshold filter
 */
const filterByThreshold = (chunks, threshold = appConfig.similarityThreshold) => {
  return chunks.filter((c) => {
    const score = c.vectorScore ?? c.hybridScore ?? c.score ?? 0;
    return score >= threshold;
  });
};

/**
 * Main retrieval entry point
 * @param {number[]} queryEmbedding
 * @param {string} queryText - For hybrid search
 * @param {object} filters
 * @returns {{ chunks, hasRelevantResults }}
 */
const retrieveRelevantChunks = async (queryEmbedding, queryText, filters = {}) => {
  let chunks = await hybridSearch(queryEmbedding, queryText, filters);
  const aboveThreshold = filterByThreshold(chunks);

  logger.info(
    `Retrieved ${chunks.length} chunks, ${aboveThreshold.length} above threshold (${appConfig.similarityThreshold})`
  );

  return {
    chunks: aboveThreshold.slice(0, appConfig.topKResults),
    allChunks: chunks,
    hasRelevantResults: aboveThreshold.length > 0,
  };
};

module.exports = { retrieveRelevantChunks, vectorSearch, keywordSearch, hybridSearch };
