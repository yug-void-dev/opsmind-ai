const appConfig = require('../config/appConfig');

/**
 * Splits text into overlapping chunks with metadata
 * @param {string} text - Full extracted text
 * @param {number} pageNumber - Page number this text belongs to
 * @param {object} options - Override defaults
 * @returns {Array<{text, pageNumber, chunkIndex}>}
 */
const chunkText = (text, pageNumber = 1, options = {}) => {
  const chunkSize = options.chunkSize || appConfig.chunkSize;
  const overlap = options.overlap || appConfig.chunkOverlap;

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  // Clean text: normalize whitespace
  const cleanedText = text.replace(/\s+/g, ' ').trim();

  if (!cleanedText) return chunks;

  while (start < cleanedText.length) {
    let end = start + chunkSize;

    // Avoid splitting mid-word — extend to next space
    if (end < cleanedText.length) {
      const nextSpace = cleanedText.indexOf(' ', end);
      if (nextSpace !== -1 && nextSpace - end < 100) {
        end = nextSpace;
      }
    }

    const chunkText = cleanedText.slice(start, end).trim();
    if (chunkText.length > 50) { // Skip tiny meaningless chunks
      chunks.push({
        text: chunkText,
        pageNumber,
        chunkIndex: chunkIndex++,
        charStart: start,
        charEnd: end,
      });
    }

    start = end - overlap;
    if (start >= cleanedText.length) break;
  }

  return chunks;
};

/**
 * Process multi-page PDF data into chunks
 * @param {Array<{text, pageNumber}>} pages - Array of page objects
 * @returns {Array} - All chunks across all pages
 */
const chunkPages = (pages) => {
  const allChunks = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, page.pageNumber);
    pageChunks.forEach((chunk) => {
      chunk.chunkIndex = globalChunkIndex++;
      allChunks.push(chunk);
    });
  }

  return allChunks;
};

module.exports = { chunkText, chunkPages };
