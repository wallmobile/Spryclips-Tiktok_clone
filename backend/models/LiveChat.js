const mongoose = require('mongoose');

const liveChatSchema = new mongoose.Schema({
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LiveStream',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  type: {
    type: String,
    enum: ['text', 'gift', 'system', 'join', 'leave'],
    default: 'text',
  },
  gift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gift',
    default: null,
  },
  isModerator: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

liveChatSchema.index({ stream: 1, createdAt: -1 });
liveChatSchema.index({ user: 1 });

module.exports = mongoose.model('LiveChat', liveChatSchema);

