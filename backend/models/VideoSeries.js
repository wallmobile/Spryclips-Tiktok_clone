const mongoose = require('mongoose');

const videoSeriesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  videos: [{
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    episodeNumber: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      maxlength: 200
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalEpisodes: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'paused'],
    default: 'ongoing'
  },
  views: {
    type: Number,
    default: 0
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

videoSeriesSchema.index({ user: 1, createdAt: -1 });
videoSeriesSchema.index({ isPublic: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('VideoSeries', videoSeriesSchema);
