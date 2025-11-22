const mongoose = require('mongoose');

const videoQASchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  askedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answer: {
    type: String,
    default: '',
    maxlength: 1000,
  },
  answeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  answeredAt: {
    type: Date,
    default: null,
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
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

videoQASchema.index({ video: 1, createdAt: -1 });
videoQASchema.index({ askedBy: 1 });

module.exports = mongoose.model('VideoQA', videoQASchema);

