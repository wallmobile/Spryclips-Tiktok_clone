const mongoose = require('mongoose');

const ServerHealthSchema = new mongoose.Schema({
  serverId: {
    type: String,
    required: true,
    index: true
  },
  serverName: {
    type: String,
    required: true
  },
  serverType: {
    type: String,
    enum: ['api', 'media', 'websocket', 'worker', 'database', 'cache'],
    required: true
  },
  status: {
    type: String,
    enum: ['healthy', 'warning', 'critical', 'down'],
    default: 'healthy',
    index: true
  },
  cpu: {
    usage: {
      type: Number,
      min: 0,
      max: 100
    },
    cores: Number,
    loadAverage: [Number], // 1min, 5min, 15min
    processes: Number
  },
  memory: {
    total: Number, // in MB
    used: Number,
    free: Number,
    usage: {
      type: Number,
      min: 0,
      max: 100
    },
    cached: Number,
    buffers: Number
  },
  disk: {
    total: Number, // in GB
    used: Number,
    free: Number,
    usage: {
      type: Number,
      min: 0,
      max: 100
    },
    iops: Number,
    readSpeed: Number, // MB/s
    writeSpeed: Number // MB/s
  },
  network: {
    inbound: Number, // MB/s
    outbound: Number, // MB/s
    connections: Number,
    packetsDropped: Number,
    latency: Number // ms
  },
  traffic: {
    requestsPerSecond: Number,
    totalRequests: Number,
    activeConnections: Number,
    peakConnections: Number,
    bandwidth: Number // MB/s
  },
  uptime: Number, // in seconds
  responseTime: {
    average: Number, // ms
    p50: Number,
    p95: Number,
    p99: Number,
    max: Number
  },
  alerts: [{
    type: {
      type: String,
      enum: ['cpu', 'memory', 'disk', 'network', 'traffic', 'response-time']
    },
    severity: {
      type: String,
      enum: ['warning', 'critical']
    },
    message: String,
    threshold: Number,
    currentValue: Number,
    triggeredAt: Date,
    resolvedAt: Date
  }],
  lastChecked: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

ServerHealthSchema.index({ status: 1, lastChecked: -1 });
ServerHealthSchema.index({ serverType: 1, status: 1 });
ServerHealthSchema.index({ serverId: 1, lastChecked: -1 });

module.exports = mongoose.model('ServerHealth', ServerHealthSchema);



