const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    eventType: {
      type: String,
      enum: ['query', 'no_answer', 'failed_query', 'upload', 'reindex'],
      required: true,
      index: true,
    },

    // Query data
    query: String,
    rewrittenQuery: String,      // LLM-rewritten version of query
    answered: Boolean,

    // Retrieval pipeline telemetry
    chunksRetrieved: Number,
    topScore: Number,            // Best similarity score among retrieved chunks
    retrievalDebug: {            // Stage-by-stage counts for debugging
      stages: {
        vector: Number,
        keyword: Number,
        afterRRF: Number,
        afterRerank: Number,
        afterThreshold: Number,
      },
      threshold: Number,
    },

    // Performance
    responseTime: Number,        // Total pipeline time in ms

    // LLM token usage
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },

    // File upload tracking
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    // Error tracking
    errorMessage: String,

    // Request metadata
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for time-range queries by event type (most common pattern)
analyticsSchema.index({ eventType: 1, createdAt: -1 });
analyticsSchema.index({ userId: 1, createdAt: -1 });
analyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
