/**
 * OpsMind AI — Advanced Text Chunker
 *
 * Strategy: sentence-aware chunking with character overlap.
 * - Splits on sentence boundaries to preserve semantic coherence
 * - Overlapping windows ensure context continuity across chunk borders
 * - Filters degenerate chunks (too short, whitespace-only)
 */
const appConfig = require('../config/appConfig');

// ─── Sentence Boundary Detection ────────────────────────────────────────────
const SENTENCE_ENDINGS = /(?<=[.!?])\s+(?=[A-Z])/g;

/**
 * Split text into sentences, preserving sentence integrity
 */
const splitIntoSentences = (text) => {
  // Normalize whitespace first
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  // Split on sentence endings followed by capital letter
  const parts = normalized.split(SENTENCE_ENDINGS);
  return parts.filter((s) => s.trim().length > 0);
};

/**
 * Build overlapping chunks from a list of sentences.
 * We accumulate sentences into a window; when we exceed chunkSize,
 * we emit the current window, then slide back by overlap chars.
 *
 * @param {string[]} sentences
 * @param {number} chunkSize - max chars per chunk
 * @param {number} overlap - chars of overlap between consecutive chunks
 * @returns {string[]} raw chunk strings
 */
const buildChunksFromSentences = (sentences, chunkSize, overlap) => {
  const chunks = [];
  let buffer = '';
  let overlapBuffer = '';

  for (const sentence of sentences) {
    const candidate = buffer ? buffer + ' ' + sentence : sentence;

    if (candidate.length <= chunkSize) {
      buffer = candidate;
    } else {
      // Emit current buffer if non-empty
      if (buffer.length >= appConfig.minChunkLength) {
        chunks.push(buffer.trim());
        // Build overlap: take the tail of the current buffer
        overlapBuffer = buffer.slice(Math.max(0, buffer.length - overlap));
      }
      // Start new buffer with overlap + current sentence
      buffer = overlapBuffer ? overlapBuffer + ' ' + sentence : sentence;

      // If a single sentence exceeds chunkSize, hard-split it
      if (buffer.length > chunkSize) {
        const hardChunks = hardSplit(buffer, chunkSize, overlap);
        hardChunks.forEach((hc) => {
          if (hc.length >= appConfig.minChunkLength) chunks.push(hc);
        });
        buffer = hardChunks[hardChunks.length - 1] || '';
        overlapBuffer = buffer.slice(Math.max(0, buffer.length - overlap));
      }
    }
  }

  // Emit remaining buffer
  if (buffer.trim().length >= appConfig.minChunkLength) {
    chunks.push(buffer.trim());
  }

  return chunks;
};

/**
 * Hard character split for extremely long sentences or paragraphs
 */
const hardSplit = (text, chunkSize, overlap) => {
  const results = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    results.push(text.slice(start, end).trim());
    start = end - overlap;
    if (start >= text.length) break;
  }
  return results;
};

/**
 * Chunk a single page's text with metadata
 *
 * @param {string} text - Page text
 * @param {number} pageNumber
 * @param {object} [options]
 * @returns {Array<{text, pageNumber, chunkIndex, charStart, charEnd, wordCount}>}
 */
const chunkText = (text, pageNumber = 1, options = {}) => {
  const chunkSize = options.chunkSize || appConfig.chunkSize;
  const overlap = options.overlap || appConfig.chunkOverlap;

  if (!text || text.trim().length < appConfig.minChunkLength) return [];

  const sentences = splitIntoSentences(text);
  const rawChunks = buildChunksFromSentences(sentences, chunkSize, overlap);

  return rawChunks.map((raw, idx) => ({
    text: raw,
    pageNumber,
    chunkIndex: idx,
    charStart: text.indexOf(raw.slice(0, 40)) || 0,
    charEnd: 0, // calculated below
    wordCount: raw.split(/\s+/).length,
  })).map((c) => ({ ...c, charEnd: c.charStart + c.text.length }));
};

/**
 * Process an array of page objects into a flat, globally-indexed chunk list
 *
 * @param {Array<{pageNumber: number, text: string}>} pages
 * @returns {Array} All chunks across all pages with global chunkIndex
 */
const chunkPages = (pages) => {
  const allChunks = [];
  let globalIndex = 0;

  for (const page of pages) {
    if (!page.text || page.text.trim().length < appConfig.minChunkLength) continue;

    const pageChunks = chunkText(page.text, page.pageNumber);
    for (const chunk of pageChunks) {
      allChunks.push({ ...chunk, chunkIndex: globalIndex++ });
    }
  }

  return allChunks;
};

/**
 * Deduplicate chunks — remove near-identical chunks caused by overlapping headers
 * Uses simple normalized-text comparison (O(n) with Set)
 */
const deduplicateChunks = (chunks) => {
  const seen = new Set();
  return chunks.filter((c) => {
    const key = c.text.slice(0, 100).toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

module.exports = { chunkText, chunkPages, deduplicateChunks };
