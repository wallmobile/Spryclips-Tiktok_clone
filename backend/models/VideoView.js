const mongoose = require('mongoose');

/**
 * VideoView Model
 * Tracks individual video views for accurate monetization and analytics
 * Prevents duplicate views from same user/IP within 24 hours
 */
const videoViewSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  watchTime: {
    type: Number,
    default: 0 // in seconds
  },
  completionRate: {
    type: Number,
    default: 0 // percentage (0-100)
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 365 * 24 * 60 * 60 // Auto-delete after 1 year
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate views
videoViewSchema.index({ video: 1, user: 1, createdAt: -1 });
videoViewSchema.index({ video: 1, ipAddress: 1, createdAt: -1 });

// Index for analytics queries
videoViewSchema.index({ createdAt: -1 });
videoViewSchema.index({ video: 1, createdAt: -1 });

const VideoView = mongoose.model('VideoView', videoViewSchema);

module.exports = VideoView;

