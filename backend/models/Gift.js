const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  liveStream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveStream',
    default: null
  },
  giftType: {
    type: String,
    required: true
  },
  giftName: {
    type: String,
    required: true
  },
  giftImage: {
    type: String,
    default: ''
  },
  value: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  message: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
giftSchema.index({ sender: 1, createdAt: -1 });
giftSchema.index({ receiver: 1, createdAt: -1 });
giftSchema.index({ video: 1 });
giftSchema.index({ liveStream: 1 });

module.exports = mongoose.model('Gift', giftSchema);

