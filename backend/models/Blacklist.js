const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['word', 'hashtag', 'username', 'domain'],
    required: true,
    index: true
  },
  value: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  reason: {
    type: String,
    default: ''
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  notes: String
}, {
  timestamps: true
});

// Compound index
blacklistSchema.index({ type: 1, value: 1 });
blacklistSchema.index({ active: 1, severity: 1 });

module.exports = mongoose.model('Blacklist', blacklistSchema);

