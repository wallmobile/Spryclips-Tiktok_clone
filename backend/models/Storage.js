const mongoose = require('mongoose');

const StorageSchema = new mongoose.Schema({
  storageType: {
    type: String,
    enum: ['local', 's3', 'cloudinary', 'azure', 'gcp'],
    required: true,
    index: true
  },
  bucketName: String,
  region: String,
  totalCapacity: {
    type: Number, // in GB
    required: true
  },
  used: {
    type: Number, // in GB
    required: true
  },
  available: {
    type: Number, // in GB
    required: true
  },
  utilization: {
    type: Number, // percentage
    min: 0,
    max: 100,
    required: true,
    index: true
  },
  files: {
    total: Number,
    videos: Number,
    images: Number,
    thumbnails: Number,
    audio: Number,
    documents: Number,
    other: Number
  },
  sizeByType: {
    videos: Number, // in GB
    images: Number,
    thumbnails: Number,
    audio: Number,
    documents: Number,
    other: Number
  },
  uploads: {
    today: Number,
    thisWeek: Number,
    thisMonth: Number,
    total: Number
  },
  deletions: {
    today: Number,
    thisWeek: Number,
    thisMonth: Number,
    total: Number
  },
  alerts: [{
    type: {
      type: String,
      enum: ['capacity-warning', 'capacity-critical', 'quota-exceeded', 'storage-error']
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
  health: {
    status: {
      type: String,
      enum: ['healthy', 'warning', 'critical'],
      default: 'healthy'
    },
    lastBackup: Date,
    backupFrequency: String,
    redundancy: Boolean
  },
  costs: {
    monthly: Number,
    daily: Number,
    perGB: Number
  },
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

StorageSchema.index({ storageType: 1, lastChecked: -1 });
StorageSchema.index({ utilization: 1, health: 1 });

module.exports = mongoose.model('Storage', StorageSchema);



