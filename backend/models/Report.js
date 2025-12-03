const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedContent: {
    type: {
      type: String,
      enum: ['user', 'video', 'comment', 'story', 'live_stream'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reason: {
    type: String,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'nudity',
      'child_safety',
      'copyright',
      'impersonation',
      'fake_account',
      'self_harm',
      'illegal_content',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed', 'escalated'],
    default: 'pending',
    index: true
  },
  screenshots: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  evidence: {
    timestamps: [Date],
    metadata: mongoose.Schema.Types.Mixed
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  resolution: {
    action: {
      type: String,
      enum: ['warning', 'content_removed', 'account_suspended', 'account_banned', 'no_action', 'escalated']
    },
    notes: String,
    resolvedAt: Date
  },
  relatedReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  }],
  isSpamReport: {
    type: Boolean,
    default: false
  },
  childSafetyConcern: {
    type: Boolean,
    default: false,
    index: true
  },
  isBotReport: {
    type: Boolean,
    default: false
  },
  severity: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  }
}, {
  timestamps: true
});

// Indexes for performance
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ reportedContent: { type: 1, id: 1 } });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ reason: 1 });
reportSchema.index({ childSafetyConcern: 1, status: 1 });
reportSchema.index({ isBotReport: 1, status: 1 });
reportSchema.index({ priority: -1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);

