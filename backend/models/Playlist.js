const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
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
    addedAt: {
      type: Date,
      default: Date.now
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

playlistSchema.index({ user: 1, name: 1 });
playlistSchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model('Playlist', playlistSchema);
