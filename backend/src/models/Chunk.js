const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    charStart: Number,
    charEnd: Number,
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Regular indexes
chunkSchema.index({ documentId: 1 });
chunkSchema.index(
  { documentName: 'text', text: 'text' },
  { weights: { documentName: 10, text: 1 }, name: 'TextIndex' }
); // Keyword search
chunkSchema.index({ tags: 1 });

/**
 * NOTE: The vector search index MUST be created in MongoDB Atlas UI or via Atlas CLI.
 * 
 * Atlas Vector Search Index Definition (JSON):
 * {
 *   "fields": [
 *     {
 *       "type": "vector",
 *       "path": "embedding",
 *       "numDimensions": 768,          // 768 for Gemini text-embedding-004
 *       "similarity": "cosine"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "documentId"
 *     },
 *     {
 *       "type": "filter",
 *       "path": "tags"
 *     }
 *   ]
 * }
 * 
 * Index Name: "vector_index"
 * Collection: chunks
 */

module.exports = mongoose.model('Chunk', chunkSchema);
