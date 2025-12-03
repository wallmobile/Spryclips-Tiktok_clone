const mongoose = require('mongoose');

const ShadowbanCaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: String,
  caseType: {
    type: String,
    enum: ['reported-shadowban', 'suspected-shadowban', 'confirmed-shadowban', 'false-alarm'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'confirmed', 'not-shadowbanned', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reportReason: String,
  userReport: {
    description: String,
    evidence: [{
      type: {
        type: String,
        enum: ['screenshot', 'video-link', 'description']
      },
      url: String,
      description: String
    }],
    reportedAt: {
      type: Date,
      default: Date.now
    }
  },
  investigation: {
    startedAt: Date,
    investigatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    findings: {
      videoVisibility: {
        type: String,
        enum: ['normal', 'reduced', 'hidden', 'unknown']
      },
      hashtagReach: {
        type: String,
        enum: ['normal', 'reduced', 'zero', 'unknown']
      },
      searchVisibility: {
        type: String,
        enum: ['visible', 'hidden', 'unknown']
      },
      feedDistribution: {
        type: String,
        enum: ['normal', 'reduced', 'stopped', 'unknown']
      },
      shadowbanConfirmed: Boolean,
      reason: String,
      affectedMetrics: [String]
    },
    metrics: {
      previousViews: Number,
      currentViews: Number,
      previousLikes: Number,
      currentLikes: Number,
      previousFollowers: Number,
      currentFollowers: Number,
      engagementDrop: Number
    }
  },
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['shadowban-removed', 'account-restored', 'no-action-needed', 'manual-review-required', 'policy-violation-found', 'other']
    },
    notes: String,
    shadowbanLiftedAt: Date
  },
  relatedTicket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'high'
  }
}, {
  timestamps: true
});

ShadowbanCaseSchema.index({ status: 1, createdAt: -1 });
ShadowbanCaseSchema.index({ userId: 1, status: 1 });
ShadowbanCaseSchema.index({ caseType: 1, status: 1 });

module.exports = mongoose.model('ShadowbanCase', ShadowbanCaseSchema);



