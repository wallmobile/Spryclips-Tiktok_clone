const mongoose = require('mongoose');

const APIRequestSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'timeout', 'error'],
    required: true,
    index: true
  },
  statusCode: {
    type: Number,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  responseTime: {
    type: Number, // in milliseconds
    required: true,
    index: true
  },
  requestSize: Number, // in bytes
  responseSize: Number, // in bytes
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  errorMessage: String,
  errorCode: String,
  ipAddress: String,
  userAgent: String,
  apiVersion: String,
  rateLimited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for analytics
APIRequestSchema.index({ endpoint: 1, status: 1, timestamp: -1 });
APIRequestSchema.index({ method: 1, status: 1, timestamp: -1 });
APIRequestSchema.index({ timestamp: -1 });

module.exports = mongoose.model('APIRequest', APIRequestSchema);




