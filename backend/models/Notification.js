const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'like',
      'likes',
      'comment',
      'comments',
      'follow',
      'follows',
      'mention',
      'mentions',
      'video_upload',
      'story_upload',
      'comment_reply',
      'video_shared',
      'video_liked',
      'follow_request',
      'follow_request_accepted',
      'video_comment',
      'system',
      'message',
      'live',
      'shares'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  // Related entities
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  relatedVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  relatedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  // Status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

// Emit real-time socket notification after a notification is saved
try {
  const { emitNotification } = require('../socket/socketServer');
  notificationSchema.post('save', function(doc) {
    try {
      if (!emitNotification) return;
      const payload = {
        _id: doc._id,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        relatedUser: doc.relatedUser || null,
        relatedVideo: doc.relatedVideo || null,
        relatedComment: doc.relatedComment || null,
        metadata: doc.metadata || {},
        createdAt: doc.createdAt
      };
      // user may be an ObjectId
      const userId = doc.user && doc.user.toString ? doc.user.toString() : doc.user;
      emitNotification(userId, payload);
    } catch (err) {
      // Non-fatal - just log
      console.error('Error emitting socket notification:', err?.message || err);
    }
  });
} catch (e) {
  // If socket server isn't available during model initialization, skip emitting
  // This prevents startup crashes in environments where socket server isn't initialized yet
  console.warn('Socket emit hookup skipped for Notification model:', e?.message || e);
}

