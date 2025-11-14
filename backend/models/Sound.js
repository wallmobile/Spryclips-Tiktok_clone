const mongoose = require('mongoose');

const soundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  artist: {
    type: String,
    required: true,
    trim: true
  },
  audioUrl: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  duration: {
    type: Number, // Duration in seconds
    required: true
  },
  genre: {
    type: String,
    enum: ['trending', 'hip-hop', 'pop', 'electronic', 'rock', 'r&b', 'country', 'other'],
    default: 'other'
  },
  isOriginal: {
    type: Boolean,
    default: false
  },
  originalVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Statistics
  plays: {
    type: Number,
    default: 0
  },
  saves: {
    type: Number,
    default: 0
  },
  usedInVideos: {
    type: Number,
    default: 0
  },
  // Metadata
  bpm: {
    type: Number,
    default: null
  },
  tags: [{
    type: String
  }],
  // Trending data
  isTrending: {
    type: Boolean,
    default: false
  },
  trendingScore: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'removed', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for better search performance
soundSchema.index({ name: 'text', artist: 'text' });
soundSchema.index({ genre: 1, isTrending: -1 });
soundSchema.index({ trendingScore: -1 });
soundSchema.index({ plays: -1 });
soundSchema.index({ createdAt: -1 });

// Virtual for formatted duration
soundSchema.virtual('formattedDuration').get(function() {
  const minutes = Math.floor(this.duration / 60);
  const seconds = Math.floor(this.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to increment plays
soundSchema.methods.incrementPlays = function() {
  this.plays += 1;
  this.trendingScore += 0.1;
  return this.save();
};

// Method to increment saves
soundSchema.methods.incrementSaves = function() {
  this.saves += 1;
  this.trendingScore += 0.5;
  return this.save();
};

// Method to increment used in videos
soundSchema.methods.incrementUsed = function() {
  this.usedInVideos += 1;
  this.trendingScore += 1;
  return this.save();
};

module.exports = mongoose.model('Sound', soundSchema);

