/**
 * OpsMind AI — Embedding Service
 *
 * Responsibilities:
 * - Generate 768-dim embeddings via Gemini text-embedding-004
 * - Batch processing with rate-limit-aware delays
 * - Retry logic with exponential backoff
 * - Cosine similarity utility for fallback scoring
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let geminiClient = null;

const getGeminiClient = () => {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

// ─── Retry Utility ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (fn, { maxRetries = 3, baseDelayMs = 500, label = 'operation' } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.message?.includes('429') ||
        err.message?.includes('503') ||
        err.message?.includes('RESOURCE_EXHAUSTED') ||
        err.message?.includes('network');

      if (!isRetryable || attempt === maxRetries) break;

      const delay = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      logger.warn(`[Embedding] ${label} attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
};

// ─── Gemini Embedding ────────────────────────────────────────────────────────

/**
 * Generate a single embedding vector using Gemini text-embedding-004
 * Produces 768-dimensional float32 vectors.
 *
 * @param {string} text
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {number[]} 768-dim vector
 */
const generateEmbedding = async (text, taskType = 'RETRIEVAL_DOCUMENT') => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Gemini text-embedding-004 token limit ~2048 tokens ≈ ~8000 chars
  const truncated = text.trim().slice(0, 8000);

  return withRetry(
    async () => {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

      const result = await model.embedContent({
        content: { parts: [{ text: truncated }], role: 'user' },
        taskType, // RETRIEVAL_DOCUMENT for indexing, RETRIEVAL_QUERY for queries
      });

      const values = result.embedding?.values;
      if (!values || values.length === 0) {
        throw new Error('Embedding API returned empty vector');
      }

      return values;
    },
    { label: `embed(${text.slice(0, 40)})` }
  );
};

/**
 * Generate embedding specifically for a user query (uses RETRIEVAL_QUERY task type
 * which is optimized for asymmetric search — query vs. document)
 */
const generateQueryEmbedding = (text) => generateEmbedding(text, 'RETRIEVAL_QUERY');

/**
 * Batch generate embeddings for multiple texts.
 * Processes in small batches with inter-batch delay to respect rate limits.
 *
 * @param {string[]} texts
 * @param {number} batchSize - concurrent requests per batch
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {number[][]} embeddings in same order as input texts
 */
const batchGenerateEmbeddings = async (texts, batchSize = 5, taskType = 'RETRIEVAL_DOCUMENT') => {
  const results = new Array(texts.length);
  const totalBatches = Math.ceil(texts.length / batchSize);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, texts.length);
    const batch = texts.slice(start, end);

    logger.debug(`[Embedding] Batch ${batchIdx + 1}/${totalBatches} (${batch.length} texts)`);

    // Process batch concurrently
    const batchResults = await Promise.all(
      batch.map((text, i) =>
        generateEmbedding(text, taskType).catch((err) => {
          logger.error(`[Embedding] Failed for chunk ${start + i}: ${err.message}`);
          // Return zero-vector on failure to not block the entire pipeline
          return new Array(768).fill(0);
        })
      )
    );

    batchResults.forEach((vec, i) => { results[start + i] = vec; });

    // Inter-batch delay to avoid rate limiting (skip after last batch)
    if (batchIdx < totalBatches - 1) {
      await sleep(300);
    }
  }

  const failed = results.filter((v) => v && v.every((x) => x === 0)).length;
  if (failed > 0) {
    logger.warn(`[Embedding] ${failed}/${texts.length} chunks failed embedding (zero-vector stored)`);
  }

  logger.info(`[Embedding] Completed ${texts.length} embeddings`);
  return results;
};

// ─── Math Utilities ──────────────────────────────────────────────────────────

/**
 * Cosine similarity between two vectors.
 * Used for client-side threshold checks and fallback scoring.
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

/**
 * Validate that an embedding is non-zero and correct dimensionality
 */
const isValidEmbedding = (vec, expectedDim = 768) => {
  return Array.isArray(vec) &&
    vec.length === expectedDim &&
    vec.some((v) => v !== 0);
};

module.exports = {
  generateEmbedding,
  generateQueryEmbedding,
  batchGenerateEmbeddings,
  cosineSimilarity,
  isValidEmbedding,
};
