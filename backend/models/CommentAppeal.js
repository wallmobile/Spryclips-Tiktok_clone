const mongoose = require('mongoose');

const CommentAppealSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
    index: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    index: true
  },
  restrictionType: {
    type: String,
    enum: ['comment-deleted', 'comment-hidden', 'commenting-disabled', 'comment-limited', 'account-restriction'],
    required: true,
    index: true
  },
  restrictionReason: String,
  restrictionDate: {
    type: Date,
    default: Date.now
  },
  appealReason: {
    type: String,
    required: true
  },
  appealMessage: String,
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'video-link', 'description', 'other']
    },
    url: String,
    description: String
  }],
  status: {
    type: String,
    enum: ['pending', 'under-review', 'approved', 'rejected', 'partially-approved'],
    default: 'pending',
    index: true
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  decision: {
    type: String,
    enum: ['appeal-approved', 'appeal-rejected', 'partial-lift', 'no-action', 'warning-issued', 'other']
  },
  decisionNotes: String,
  actions: [{
    action: {
      type: String,
      enum: ['comment-restored', 'comment-visible', 'commenting-enabled', 'restriction-lifted', 'restriction-maintained', 'warning-issued', 'other']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  relatedTicket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

CommentAppealSchema.index({ status: 1, createdAt: -1 });
CommentAppealSchema.index({ userId: 1, status: 1 });
CommentAppealSchema.index({ restrictionType: 1, status: 1 });

module.exports = mongoose.model('CommentAppeal', CommentAppealSchema);




