const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['user_registered', 'document_indexed', 'document_failed', 'system'],
      default: 'system',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    recipientRole: {
      type: String,
      enum: ['admin', 'user'],
      default: 'admin',
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // If null, it's a broadcast to all users of that role
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
notificationSchema.index({ recipientRole: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
