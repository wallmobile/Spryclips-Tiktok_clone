const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      default: '❤️'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Moderation fields
  moderationStatus: {
    type: String,
    enum: ['approved', 'deleted', 'flagged', 'limited'],
    default: 'approved'
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  moderationNotes: String
}, {
  timestamps: true
});

// Indexes for performance
commentSchema.index({ video: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ video: 1, user: 1 });
// Moderation indexes
commentSchema.index({ moderationStatus: 1, createdAt: -1 });
commentSchema.index({ isHidden: 1 });
commentSchema.index({ reviewedBy: 1, reviewedAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);

