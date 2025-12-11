const mongoose = require('mongoose');

const VideoProcessingSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'uploading', 'transcoding', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  uploadProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  processingStage: {
    type: String,
    enum: ['upload', 'validation', 'transcode', 'thumbnail', 'metadata', 'cdn-upload', 'complete'],
    default: 'upload'
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileFormat: {
    type: String
  },
  resolution: {
    width: Number,
    height: Number
  },
  duration: Number,
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  errorMessage: String,
  errorCode: String,
  retryCount: {
    type: Number,
    default: 0
  },
  processingTime: Number, // in milliseconds
  cdnUrl: String,
  thumbnailUrl: String,
  transcodedFormats: [{
    quality: String,
    url: String,
    size: Number
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

VideoProcessingSchema.index({ status: 1, createdAt: -1 });
VideoProcessingSchema.index({ userId: 1, status: 1 });
VideoProcessingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('VideoProcessing', VideoProcessingSchema);




