const mongoose = require('mongoose');

const CDNIssueSchema = new mongoose.Schema({
  // User who reported the issue
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Issue details
  issueType: {
    type: String,
    enum: ['buffering', 'quality-drop', 'connection-failure', 'slow-loading', 'video-freeze', 'audio-sync', 'other'],
    required: true
  },
  
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Video/Content details (if applicable)
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  
  // CDN/Network details
  cdnProvider: {
    type: String,
    enum: ['cloudflare', 'aws-cloudfront', 'cloudinary', 'bunny', 'custom', 'unknown'],
    default: 'unknown'
  },
  
  region: {
    type: String,
    default: ''
  },
  
  // Device/Network info
  deviceInfo: {
    type: String,
    default: ''
  },
  
  networkType: {
    type: String,
    enum: ['wifi', 'mobile-data', 'ethernet', 'unknown'],
    default: 'unknown'
  },
  
  // Issue status
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  
  // Admin response
  adminNotes: {
    type: String,
    default: ''
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  resolvedAt: {
    type: Date,
    default: null
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  // Affected users count (if multiple users report same issue)
  affectedUsersCount: {
    type: Number,
    default: 1
  },
  
  // Related issues (if admin links them)
  relatedIssues: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CDNIssue'
  }]
  
}, {
  timestamps: true
});

// Indexes for better query performance
CDNIssueSchema.index({ status: 1, createdAt: -1 });
CDNIssueSchema.index({ reportedBy: 1, createdAt: -1 });
CDNIssueSchema.index({ issueType: 1, status: 1 });
CDNIssueSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('CDNIssue', CDNIssueSchema);

