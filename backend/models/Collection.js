const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
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
  videos: [{
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      maxlength: 500
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  coverImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

collectionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Collection', collectionSchema);
