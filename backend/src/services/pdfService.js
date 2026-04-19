/**
 * OpsMind AI — PDF Processing Service
 *
 * Handles:
 * - Page-by-page text extraction (memory-safe for large PDFs)
 * - Multi-column layout normalization
 * - Header/footer noise removal heuristics
 * - Returns structured pages ready for chunking
 */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { chunkPages, deduplicateChunks } = require('../utils/chunker');
const logger = require('../utils/logger');

// Max PDF pages to process (safety limit for very large documents)
const MAX_PAGES = parseInt(process.env.MAX_PDF_PAGES) || 500;

/**
 * Clean raw extracted text from a single page:
 * - Remove excessive whitespace
 * - Remove common header/footer artifacts (page numbers, document titles repeated)
 * - Normalize line breaks
 */
const cleanPageText = (text, pageNumber) => {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Collapse 3+ consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove standalone page numbers (e.g., "- 12 -" or just "12" on its own line)
    .replace(/^\s*[-–]\s*\d+\s*[-–]\s*$/gm, '')
    .replace(/^\s*\d+\s*$/gm, '')
    // Remove excessive spaces
    .replace(/[ \t]{3,}/g, '  ')
    // Trim
    .trim();
};

/**
 * Extract text from PDF file page by page.
 *
 * pdf-parse renders all pages via a single call, so we use the
 * `pagerender` callback to capture per-page text with position data,
 * which enables better column-order reconstruction than naive extraction.
 *
 * @param {string} filePath
 * @returns {{ pages: Array<{pageNumber, text}>, totalPages: number, metadata: object }}
 */
const extractPagesFromPDF = async (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  const fileSizeMB = fileBuffer.length / (1024 * 1024);

  logger.info(`PDF size: ${fileSizeMB.toFixed(2)} MB — starting extraction`);

  if (fileSizeMB > 100) {
    logger.warn(`Large PDF detected (${fileSizeMB.toFixed(1)} MB). Processing may be slow.`);
  }

  const capturedPages = [];
  let pageCounter = 0;

  const options = {
    // Called by pdf-parse for each page — we intercept to get per-page text
    pagerender: async (pageData) => {
      pageCounter++;

      if (pageCounter > MAX_PAGES) {
        logger.warn(`PDF exceeds ${MAX_PAGES} pages — truncating at page ${MAX_PAGES}`);
        return '';
      }

      try {
        const textContent = await pageData.getTextContent({ normalizeWhitespace: true });

        // Sort text items by vertical position (top→bottom), then horizontal (left→right)
        // This handles multi-column layouts better than default ordering
        const sorted = textContent.items.sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5]; // Y-axis (inverted in PDF coords)
          if (Math.abs(yDiff) > 5) return yDiff;
          return a.transform[4] - b.transform[4]; // X-axis
        });

        let pageText = '';
        let lastY = null;
        let lastX = null;

        for (const item of sorted) {
          const currentY = Math.round(item.transform[5]);
          const currentX = Math.round(item.transform[4]);

          if (lastY !== null && Math.abs(currentY - lastY) > 8) {
            // New line detected
            pageText += '\n';
          } else if (lastX !== null && currentX - lastX > 30 && lastY === currentY) {
            // Large horizontal gap = column separator
            pageText += '  ';
          }

          pageText += item.str;
          lastY = currentY;
          lastX = currentX + (item.width || 0);
        }

        capturedPages.push({
          pageNumber: pageCounter,
          text: cleanPageText(pageText, pageCounter),
        });

        return pageText;
      } catch (pageErr) {
        logger.warn(`Page ${pageCounter} extraction error: ${pageErr.message}`);
        capturedPages.push({ pageNumber: pageCounter, text: '' });
        return '';
      }
    },
  };

  let pdfData;
  try {
    pdfData = await pdfParse(fileBuffer, options);
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  }

  const totalPages = Math.min(pdfData.numpages, MAX_PAGES);

  // Fallback: if pagerender didn't fire (some encrypted/scanned PDFs),
  // fall back to the raw text split by estimated page boundaries
  if (capturedPages.length === 0 && pdfData.text) {
    logger.warn('pagerender callback did not fire — using fallback page splitting');
    const avgChars = Math.ceil(pdfData.text.length / totalPages);
    for (let i = 0; i < totalPages; i++) {
      capturedPages.push({
        pageNumber: i + 1,
        text: cleanPageText(pdfData.text.slice(i * avgChars, (i + 1) * avgChars), i + 1),
      });
    }
  }

  // Ensure pages are sorted by number (async callbacks may arrive out of order)
  capturedPages.sort((a, b) => a.pageNumber - b.pageNumber);

  const validPages = capturedPages.filter((p) => p.text.trim().length > 20);
  logger.info(`Extracted ${validPages.length}/${totalPages} pages with content`);

  return {
    pages: capturedPages, // All pages (including blank ones, for page number accuracy)
    validPages,           // Only pages with extractable text
    totalPages,
    metadata: {
      title: pdfData.info?.Title || null,
      author: pdfData.info?.Author || null,
      subject: pdfData.info?.Subject || null,
      creator: pdfData.info?.Creator || null,
      pages: totalPages,
      fileSizeMB: parseFloat(fileSizeMB.toFixed(2)),
    },
  };
};

/**
 * Full PDF processing pipeline:
 * File → Extract Pages → Chunk → Deduplicate → Return
 *
 * @param {string} filePath
 * @param {string} documentName
 * @returns {{ chunks, totalPages, totalChunks, metadata }}
 */
const processPDF = async (filePath, documentName) => {
  logger.info(`[PDF Pipeline] Starting: ${documentName}`);
  const t0 = Date.now();

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Step 1: Extract pages
  const { validPages, totalPages, metadata } = await extractPagesFromPDF(filePath);

  if (validPages.length === 0) {
    throw new Error(
      'No extractable text found in PDF. File may be scanned/image-based. OCR support coming soon.'
    );
  }

  // Step 2: Chunk all valid pages
  const rawChunks = chunkPages(validPages);
  logger.info(`[PDF Pipeline] Generated ${rawChunks.length} raw chunks`);

  // Step 3: Deduplicate (removes repeated headers/footers captured as chunks)
  const chunks = deduplicateChunks(rawChunks);
  const removed = rawChunks.length - chunks.length;
  if (removed > 0) {
    logger.info(`[PDF Pipeline] Removed ${removed} duplicate chunks`);
  }

  const elapsed = Date.now() - t0;
  logger.info(
    `[PDF Pipeline] Complete: ${chunks.length} chunks from ${totalPages} pages in ${elapsed}ms`
  );

  return {
    chunks,
    totalPages,
    totalChunks: chunks.length,
    metadata,
  };
};

module.exports = { processPDF, extractPagesFromPDF };
