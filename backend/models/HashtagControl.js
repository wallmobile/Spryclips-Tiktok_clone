const mongoose = require('mongoose');

const hashtagControlSchema = new mongoose.Schema({
  hashtag: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  visibility: {
    type: String,
    enum: ['visible', 'hidden', 'restricted', 'trending'],
    default: 'visible',
    index: true
  },
  boostLevel: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 10.0
  },
  searchable: {
    type: Boolean,
    default: true,
    index: true
  },
  trending: {
    type: Boolean,
    default: false,
    index: true
  },
  restrictionLevel: {
    type: String,
    enum: ['none', 'age_restricted', 'sensitive', 'adult'],
    default: 'none'
  },
  notes: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

hashtagControlSchema.index({ visibility: 1, trending: 1 });
hashtagControlSchema.index({ searchable: 1, visibility: 1 });

module.exports = mongoose.model('HashtagControl', hashtagControlSchema);

