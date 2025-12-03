const mongoose = require('mongoose');

const boostedContentSchema = new mongoose.Schema({
  contentType: {
    type: String,
    enum: ['video', 'hashtag', 'user', 'trend'],
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  boostType: {
    type: String,
    enum: ['search', 'recommendation', 'trending', 'both'],
    default: 'both',
    index: true
  },
  boostLevel: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 10.0
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10,
    index: true
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  reason: String,
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Compound indexes
boostedContentSchema.index({ contentType: 1, contentId: 1, active: 1 });
boostedContentSchema.index({ boostType: 1, active: 1, priority: -1 });
boostedContentSchema.index({ active: 1, priority: -1, startDate: -1 });

module.exports = mongoose.model('BoostedContent', boostedContentSchema);

