const mongoose = require('mongoose');

const VideoUploadIssueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    index: true
  },
  uploadId: String,
  issueType: {
    type: String,
    enum: ['upload-failed', 'processing-failed', 'file-too-large', 'unsupported-format', 'network-error', 'timeout', 'storage-full', 'virus-detected', 'copyright-flag', 'other'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  errorCode: String,
  errorMessage: String,
  fileDetails: {
    filename: String,
    fileSize: Number,
    fileType: String,
    duration: Number,
    resolution: {
      width: Number,
      height: Number
    }
  },
  uploadAttempts: {
    type: Number,
    default: 1
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  serverLogs: String,
  browserLogs: String,
  networkInfo: {
    connectionType: String,
    bandwidth: Number,
    ipAddress: String
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: String,
  fixReason: String,
  actions: [{
    action: {
      type: String,
      enum: ['file-reprocessed', 'format-converted', 'upload-retried', 'storage-cleared', 'limit-increased', 'manual-upload', 'issue-identified', 'workaround-provided', 'other']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  relatedTicket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

VideoUploadIssueSchema.index({ status: 1, lastAttemptAt: -1 });
VideoUploadIssueSchema.index({ issueType: 1, status: 1 });
VideoUploadIssueSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('VideoUploadIssue', VideoUploadIssueSchema);




