const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'video', 'text'],
    required: true,
  },
  mediaUrl: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: '',
  },
  text: {
    type: String,
    maxlength: 500,
    default: '',
  },
  textColor: {
    type: String,
    default: '#FFFFFF',
  },
  textBackground: {
    type: String,
    default: 'transparent',
  },
  textPositionX: {
    type: Number,
    default: 50, // Percentage from left
  },
  textPositionY: {
    type: Number,
    default: 50, // Percentage from top
  },
  music: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sound',
    default: null,
  },
  views: {
    type: Number,
    default: 0,
  },
  viewedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    emoji: {
      type: String,
      default: '❤️',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  replies: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isPrivate: {
    type: Boolean,
    default: false,
  },
  allowedViewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired stories
storySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);

