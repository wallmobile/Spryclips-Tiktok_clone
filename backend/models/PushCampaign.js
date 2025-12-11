const mongoose = require('mongoose');

const pushCampaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['all', 'active', 'premium', 'new'],
    default: 'all'
  },
  type: {
    type: String,
    enum: ['promotional', 'update', 'announcement', 'reminder'],
    default: 'promotional'
  },
  scheduledTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['sent', 'scheduled', 'failed', 'pending'],
    default: 'pending'
  },
  recipients: {
    type: Number,
    default: 0
  },
  sentAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
pushCampaignSchema.index({ createdBy: 1, createdAt: -1 });
pushCampaignSchema.index({ status: 1 });

module.exports = mongoose.model('PushCampaign', pushCampaignSchema);

