const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Video Analytics
  views: {
    type: Number,
    default: 0
  },
  uniqueViews: {
    type: Number,
    default: 0
  },
  watchTime: {
    type: Number, // Total watch time in seconds
    default: 0
  },
  averageWatchTime: {
    type: Number, // Average watch time in seconds
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  // Engagement Metrics
  engagementRate: {
    type: Number, // Percentage
    default: 0
  },
  completionRate: {
    type: Number, // Percentage
    default: 0
  },
  // Demographics
  demographics: {
    age: {
      '13-17': { type: Number, default: 0 },
      '18-24': { type: Number, default: 0 },
      '25-34': { type: Number, default: 0 },
      '35-44': { type: Number, default: 0 },
      '45+': { type: Number, default: 0 }
    },
    gender: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    location: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  // Traffic Sources
  trafficSources: {
    forYou: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    profile: { type: Number, default: 0 },
    search: { type: Number, default: 0 },
    hashtag: { type: Number, default: 0 },
    sound: { type: Number, default: 0 },
    external: { type: Number, default: 0 }
  },
  // Device Analytics
  devices: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  // Time-based Analytics
  hourlyViews: {
    type: Map,
    of: Number,
    default: {}
  },
  dailyViews: {
    type: Map,
    of: Number,
    default: {}
  },
  // Audience Retention
  retentionData: [{
    second: Number,
    viewers: Number
  }],
  // Date range
  dateRange: {
    startDate: Date,
    endDate: Date
  }
}, {
  timestamps: true
});

// Indexes
analyticsSchema.index({ video: 1, createdAt: -1 });
analyticsSchema.index({ user: 1, createdAt: -1 });
analyticsSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);

