const { GoogleGenerativeAI } = require('@google/generative-ai');
const appConfig = require('../config/appConfig');
const logger = require('../utils/logger');

let geminiClient = null;

const getGeminiClient = () => {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
};

/**
 * Generate embedding vector for a single text using Gemini
 * @param {string} text
 * @returns {number[]} embedding vector
 */
const generateEmbedding = async (text) => {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const provider = appConfig.embeddingProvider;

  if (provider === 'gemini') {
    return generateGeminiEmbedding(text);
  }

  throw new Error(`Unsupported embedding provider: ${provider}`);
};

/**
 * Retry a function with exponential backoff on 429 errors
 */
const retryWithBackoff = async (fn, retries = 5, baseDelayMs = 3000) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      
      return await fn();
    } catch (error) {
      const is429 = error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'));
      if (is429 && attempt < retries) {
        // Extract retryDelay from error or use exponential backoff
        const retryMatch = error.message.match(/retry in (\d+)/i);
        const waitMs = retryMatch
          ? (parseInt(retryMatch[1]) + 2) * 1000   // server-suggested delay + 2s buffer
          : baseDelayMs * Math.pow(2, attempt);      // exponential backoff: 3s, 6s, 12s, 24s…
        logger.warn(`Rate limit hit. Retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        throw error;
      }
    }
  }
};

/**
 * Gemini embedding — uses gemini-embedding-001 (768 dimensions)
 */
const generateGeminiEmbedding = async (text) => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    // Truncate if too long (Gemini limit is ~2048 tokens)
    const truncated = text.slice(0, 8000);

    const result = await retryWithBackoff(() => model.embedContent(truncated));
    return result.embedding.values;
  } catch (error) {
    logger.error(`Gemini embedding error: ${error.message}`);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
};

/**
 * Batch embed multiple texts with rate limiting
 * @param {string[]} texts
 * @param {number} batchSize
 * @returns {number[][]}
 */
const batchGenerateEmbeddings = async (texts, batchSize = 5) => {
  const embeddings = [];
  let processed = 0;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    logger.debug(`Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);

    const batchEmbeddings = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );

    embeddings.push(...batchEmbeddings);
    processed += batch.length;

    // Rate limiting: generous delay between batches to stay under 100 req/min free tier
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  logger.info(`Generated ${processed} embeddings`);
  return embeddings;
};

/**
 * Compute cosine similarity between two vectors (for fallback)
 */
const cosineSimilarity = (a, b) => {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return magA && magB ? dot / (magA * magB) : 0;
};

module.exports = { generateEmbedding, batchGenerateEmbeddings, cosineSimilarity };
