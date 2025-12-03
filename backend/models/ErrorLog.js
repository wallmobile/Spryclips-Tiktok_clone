const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['error', 'critical', 'warning', 'info'],
    default: 'error',
    index: true
  },
  type: {
    type: String,
    enum: ['app-crash', 'api-error', 'database-error', 'authentication-error', 'validation-error', 'third-party-error', 'network-error', 'timeout', 'memory-error'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  message: {
    type: String,
    required: true
  },
  stack: String,
  errorCode: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: String,
  endpoint: String,
  method: String,
  requestBody: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  requestHeaders: {
    type: Map,
    of: String
  },
  responseStatus: Number,
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  },
  serverId: String,
  serverType: {
    type: String,
    enum: ['api', 'media', 'websocket', 'worker']
  },
  browser: String,
  os: String,
  device: String,
  userAgent: String,
  ipAddress: String,
  affectedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  occurrenceCount: {
    type: Number,
    default: 1
  },
  firstOccurred: {
    type: Date,
    default: Date.now
  },
  lastOccurred: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: String,
  tags: [String],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

ErrorLogSchema.index({ type: 1, lastOccurred: -1 });
ErrorLogSchema.index({ severity: 1, resolved: 1 });
ErrorLogSchema.index({ environment: 1, lastOccurred: -1 });
ErrorLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ErrorLog', ErrorLogSchema);



