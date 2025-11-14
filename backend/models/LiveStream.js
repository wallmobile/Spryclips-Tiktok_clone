const mongoose = require('mongoose');

const liveStreamSchema = new mongoose.Schema({
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    maxlength: 500,
    default: '',
  },
  category: {
    type: String,
    enum: ['all', 'dance', 'gaming', 'food', 'comedy', 'music', 'talk', 'beauty', 'fitness', 'fashion'],
    default: 'all',
  },
  streamUrl: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: '',
  },
  rtmpUrl: {
    type: String,
    required: true,
  },
  streamKey: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled',
  },
  scheduledStartTime: {
    type: Date,
    default: null,
  },
  actualStartTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  viewers: {
    type: Number,
    default: 0,
  },
  maxViewers: {
    type: Number,
    default: 0,
  },
  totalViews: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  gifts: {
    type: Number,
    default: 0,
  },
  giftValue: {
    type: Number,
    default: 0,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  allowedViewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  guests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  recordingUrl: {
    type: String,
    default: '',
  },
  isRecorded: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

liveStreamSchema.index({ streamer: 1, status: 1 });
liveStreamSchema.index({ status: 1, createdAt: -1 });
liveStreamSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('LiveStream', liveStreamSchema);

