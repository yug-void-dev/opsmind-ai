const fs = require('fs');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');
const { chunkPages } = require('../utils/chunker');

/**
 * Extract text from a PDF file, page by page
 * @param {string} filePath - Path to the PDF file
 * @returns {{ pages: Array, totalPages: number, rawText: string }}
 */
const extractPDFPages = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const pages = [];

  let currentPage = 0;
  const pageTexts = [];

  const data = await pdfParse(dataBuffer, {
    // Called for each page
    pagerender: function (pageData) {
      return pageData.getTextContent().then((textContent) => {
        let pageText = '';
        let lastY = null;

        for (const item of textContent.items) {
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          }
          pageText += item.str + ' ';
          lastY = item.transform[5];
        }

        pageTexts.push({ pageNumber: ++currentPage, text: pageText.trim() });
        return pageText;
      });
    },
  });

  logger.info(`PDF parsed: ${data.numpages} pages, ${data.text.length} characters`);

  // Fallback: if pagerender didn't fire (some PDFs), split evenly
  if (pageTexts.length === 0) {
    const approxCharsPerPage = Math.ceil(data.text.length / (data.numpages || 1));
    for (let i = 0; i < data.numpages; i++) {
      pageTexts.push({
        pageNumber: i + 1,
        text: data.text.slice(i * approxCharsPerPage, (i + 1) * approxCharsPerPage),
      });
    }
  }

  return {
    pages: pageTexts,
    totalPages: data.numpages,
    rawText: data.text,
    info: data.info,
  };
};

/**
 * Full PDF processing pipeline: parse → chunk → return with metadata
 */
const processPDF = async (filePath, documentName) => {
  try {
    logger.info(`Starting PDF processing: ${documentName}`);
    const { pages, totalPages, rawText } = await extractPDFPages(filePath);

    // Filter out empty pages
    const validPages = pages.filter((p) => p.text && p.text.trim().length > 20);

    logger.info(`Valid pages with content: ${validPages.length}/${totalPages}`);

    const chunks = chunkPages(validPages);
    logger.info(`Generated ${chunks.length} chunks from ${documentName}`);

    return {
      chunks,
      totalPages,
      totalChunks: chunks.length,
      rawTextLength: rawText.length,
    };
  } catch (error) {
    logger.error(`PDF processing error for ${documentName}: ${error.message}`);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
};

module.exports = { processPDF, extractPDFPages };
