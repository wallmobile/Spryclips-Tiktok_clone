const mongoose = require('mongoose');

const LoginIssueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  email: {
    type: String,
    index: true
  },
  username: String,
  issueType: {
    type: String,
    enum: ['forgot-password', 'account-locked', 'two-factor-failed', 'email-not-verified', 'suspicious-login', 'session-expired', 'wrong-password', 'account-suspended', 'other'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  description: String,
  errorMessage: String,
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    browser: String,
    os: String
  },
  attempts: {
    type: Number,
    default: 1
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: String,
  actions: [{
    action: {
      type: String,
      enum: ['password-reset-sent', 'account-unlocked', 'email-verified', 'two-factor-disabled', 'session-cleared', 'warning-issued', 'account-verified', 'other']
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

LoginIssueSchema.index({ status: 1, lastAttemptAt: -1 });
LoginIssueSchema.index({ issueType: 1, status: 1 });
LoginIssueSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('LoginIssue', LoginIssueSchema);



