const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  searchType: {
    type: String,
    enum: ['all', 'videos', 'users', 'hashtags', 'music'],
    default: 'all'
  },
  resultsCount: {
    type: Number,
    default: 0
  },
  clickedResult: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  clickedResultType: {
    type: String,
    enum: ['video', 'user', 'hashtag', 'music', null],
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better performance
searchHistorySchema.index({ user: 1, createdAt: -1 });
searchHistorySchema.index({ query: 'text' });
searchHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);

