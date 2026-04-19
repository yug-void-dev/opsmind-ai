const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: Number,
    mimeType: String,
    pageCount: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed', 'reindexing'],
      default: 'processing',
    },
    processingError: String,
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ name: 'text' });
documentSchema.index({ uploadedBy: 1, status: 1 });
documentSchema.index({ tags: 1 });

module.exports = mongoose.model('Document', documentSchema);
