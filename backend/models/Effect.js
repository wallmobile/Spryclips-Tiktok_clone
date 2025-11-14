const mongoose = require('mongoose');

const effectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  category: {
    type: String,
    enum: ['filter', 'ar', 'sticker', 'transition', '3d', 'face', 'body', 'background', 'text', 'sound'],
    default: 'filter',
  },
  iconUrl: {
    type: String,
    required: true,
  },
  previewUrl: {
    type: String,
    default: '',
  },
  thumbnailUrl: {
    type: String,
    default: '',
  },
  effectUrl: {
    type: String,
    default: '',
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  favoritesCount: {
    type: Number,
    default: 0,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

effectSchema.index({ category: 1, isActive: 1, isFeatured: -1 });
effectSchema.index({ usageCount: -1 });
effectSchema.index({ favoritesCount: -1 });

module.exports = mongoose.model('Effect', effectSchema);

