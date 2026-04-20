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

const withRetry = async (fn, { maxRetries = 7, baseDelayMs = 500, label = 'operation' } = {}) => {
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

      let delay = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      
      // Google API intelligently tells us exactly how long to wait on 429!
      const retryMatch = err.message?.match(/Please retry in ([\d\.]+)s/);
      if (retryMatch && retryMatch[1]) {
        delay = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000; // Add 1s safety buffer
      }

      logger.warn(`[Embedding] ${label} attempt ${attempt} failed (Rate Limit/Error). Retrying in ${delay}ms...`);
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
      const modelName = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
      const model = genAI.getGenerativeModel({ model: modelName });

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
 * Uses `batchEmbedContents` for efficiency. Each request in the batch MUST include the model name.
 * Batch size is capped at 50 so a single batch only consumes 50 of the 100/min quota,
 * leaving a safe margin. A 65-second pause between batches fully resets the quota window.
 *
 * @param {string[]} texts
 * @param {number} _ignored - kept for backward compatibility
 * @param {'RETRIEVAL_DOCUMENT'|'RETRIEVAL_QUERY'} taskType
 * @returns {number[][]} embeddings in same order as input texts
 */
const batchGenerateEmbeddings = async (texts, _ignored = 5, taskType = 'RETRIEVAL_DOCUMENT') => {
  const batchSize = 50; // 50 texts per batch → uses 50/100 quota, safe margin above limit
  const results = new Array(texts.length);
  const totalBatches = Math.ceil(texts.length / batchSize);

  const genAI = getGeminiClient();
  const modelName = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
  const model = genAI.getGenerativeModel({ model: modelName });

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * batchSize;
    const end = Math.min(start + batchSize, texts.length);
    const batch = texts.slice(start, end);

    logger.debug(`[Embedding] Batch ${batchIdx + 1}/${totalBatches} (${batch.length} texts)`);

    try {
      const batchResult = await withRetry(async () => {
        const response = await model.batchEmbedContents({
          requests: batch.map(text => ({
            model: `models/${modelName}`, // REQUIRED: each sub-request must specify the model
            content: { parts: [{ text: text.trim().slice(0, 8000) }], role: 'user' },
            taskType
          }))
        });

        if (!response.embeddings || response.embeddings.length === 0) {
          throw new Error('batchEmbedContents returned empty embeddings array');
        }

        // SDK returns { embeddings: [{ values: [...] }] }
        return response.embeddings.map(e => e.values || []);
      }, { label: `batch ${batchIdx + 1}` });

      batchResult.forEach((vec, i) => { results[start + i] = vec; });

      const batchSuccess = batchResult.filter(v => v && v.length > 0 && v.some(x => x !== 0)).length;
      logger.info(`[Embedding] Batch ${batchIdx + 1} complete: ${batchSuccess}/${batch.length} valid embeddings`);
    } catch (err) {
      logger.error(`[Embedding] Entire batch ${batchIdx + 1} failed: ${err.message}`);
      for (let i = 0; i < batch.length; i++) {
        results[start + i] = new Array(3072).fill(0); // match gemini-embedding-001 dimensionality
      }
    }

    // Wait 65s between batches to fully reset the 60-second quota window
    if (batchIdx < totalBatches - 1) {
      logger.info(`[Embedding] Quota pause: waiting 65s before next batch to reset rate limit window...`);
      await sleep(65000);
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
 * Validate that an embedding is non-zero and correct dimensionality.
 * gemini-embedding-001 returns 3072-dim vectors (NOT 768).
 */
const EMBEDDING_DIM = 3072;

const isValidEmbedding = (vec, expectedDim = EMBEDDING_DIM) => {
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
