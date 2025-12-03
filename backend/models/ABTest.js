const mongoose = require('mongoose');

const abTestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['feed_algorithm', 'search_algorithm', 'recommendation', 'ui_change', 'other'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
    index: true
  },
  groups: [{
    name: {
      type: String,
      required: true
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    configuration: mongoose.Schema.Types.Mixed,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    metrics: {
      engagementRate: { type: Number, default: 0 },
      retentionRate: { type: Number, default: 0 },
      avgWatchTime: { type: Number, default: 0 },
      clickThroughRate: { type: Number, default: 0 }
    }
  }],
  startDate: Date,
  endDate: Date,
  targetAudience: {
    ageRange: { min: Number, max: Number },
    regions: [String],
    userTypes: [String]
  },
  metrics: {
    totalUsers: { type: Number, default: 0 },
    totalEngagements: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

abTestSchema.index({ status: 1, type: 1 });
abTestSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('ABTest', abTestSchema);

