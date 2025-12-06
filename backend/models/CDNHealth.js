const mongoose = require('mongoose');

const CDNHealthSchema = new mongoose.Schema({
  cdnProvider: {
    type: String,
    required: true,
    enum: ['cloudflare', 'aws-cloudfront', 'cloudinary', 'bunny', 'custom']
  },
  region: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'down', 'maintenance'],
    default: 'healthy',
    index: true
  },
  qualityMetrics: {
    averageBitrate: Number,
    averageLatency: Number,
    bufferHealth: Number, // 0-100
    resolutionDropRate: Number, // percentage
    connectionFailures: Number
  },
  streamingStats: {
    totalStreams: Number,
    activeStreams: Number,
    failedStreams: Number,
    averageWatchTime: Number,
    rebufferRate: Number // percentage
  },
  videoQuality: {
    hdAvailable: Boolean,
    sdAvailable: Boolean,
    adaptiveEnabled: Boolean,
    qualityDropCount: Number,
    qualityRestoreCount: Number
  },
  bandwidth: {
    total: Number, // in MB/s
    used: Number,
    available: Number,
    utilization: Number // percentage
  },
  issues: [{
    type: {
      type: String,
      enum: ['latency', 'buffering', 'quality-drop', 'connection-failure', 'cdn-outage']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    affectedUsers: Number,
    startedAt: Date,
    resolvedAt: Date,
    resolution: String
  }],
  lastChecked: {
    type: Date,
    default: Date.now,
    index: true
  },
  nextCheck: Date
}, {
  timestamps: true
});

CDNHealthSchema.index({ status: 1, lastChecked: -1 });
CDNHealthSchema.index({ cdnProvider: 1, region: 1 });

module.exports = mongoose.model('CDNHealth', CDNHealthSchema);




