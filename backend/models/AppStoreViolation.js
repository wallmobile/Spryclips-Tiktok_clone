const mongoose = require('mongoose');

const appStoreViolationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['content', 'privacy', 'security', 'guideline', 'copyright', 'other']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  platform: {
    type: String,
    required: true,
    enum: ['ios', 'android', 'both'],
    default: 'both'
  },
  description: {
    type: String,
    required: true
  },
  reportedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'dismissed'],
    default: 'pending'
  },
  actionRequired: {
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
  resolution: {
    type: String,
    default: ''
  },
  relatedContent: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedContentType',
    default: null
  },
  relatedContentType: {
    type: String,
    enum: ['Video', 'User', 'Comment', null],
    default: null
  }
}, {
  timestamps: true
});

appStoreViolationSchema.index({ status: 1, reportedDate: -1 });
appStoreViolationSchema.index({ platform: 1, severity: 1 });
appStoreViolationSchema.index({ type: 1 });

module.exports = mongoose.model('AppStoreViolation', appStoreViolationSchema);

