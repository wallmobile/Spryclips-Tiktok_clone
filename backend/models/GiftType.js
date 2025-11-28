const mongoose = require('mongoose');

const giftTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
    default: '',
  },
  image: {
    type: String,
    required: true,
  },
  animation: {
    type: String,
    default: '',
  },
  value: {
    type: Number,
    required: true,
    min: 1,
  },
  currency: {
    type: String,
    default: 'coins',
    enum: ['coins', 'USD'],
  },
  category: {
    type: String,
    enum: ['hearts', 'flowers', 'animals', 'sparkles', 'luxury'],
    default: 'hearts',
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

giftTypeSchema.index({ isActive: 1, category: 1, sortOrder: 1 });
giftTypeSchema.index({ value: 1 });

module.exports = mongoose.model('GiftType', giftTypeSchema);