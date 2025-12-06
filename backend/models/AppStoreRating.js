const mongoose = require('mongoose');

const appStoreRatingSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    required: true,
    enum: ['ios', 'android'],
    default: 'ios'
  },
  userName: {
    type: String,
    default: 'Anonymous'
  },
  userEmail: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  version: {
    type: String,
    default: ''
  },
  device: {
    type: String,
    default: ''
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  responded: {
    type: Boolean,
    default: false
  },
  response: {
    type: String,
    default: ''
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

appStoreRatingSchema.index({ platform: 1, date: -1 });
appStoreRatingSchema.index({ rating: 1 });
appStoreRatingSchema.index({ date: -1 });

module.exports = mongoose.model('AppStoreRating', appStoreRatingSchema);

