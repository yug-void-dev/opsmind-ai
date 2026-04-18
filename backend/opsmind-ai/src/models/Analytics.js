const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    eventType: {
      type: String,
      enum: ['query', 'upload', 'failed_query', 'no_answer', 'reindex'],
      required: true,
    },
    query: String,
    documentId: mongoose.Schema.Types.ObjectId,
    responseTime: Number, // ms
    chunksRetrieved: Number,
    topScore: Number,
    answered: Boolean,
    errorMessage: String,
    ipAddress: String,
    userAgent: String,
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
  },
  {
    timestamps: true,
  }
);

analyticsSchema.index({ eventType: 1, createdAt: -1 });
analyticsSchema.index({ userId: 1, createdAt: -1 });
analyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
