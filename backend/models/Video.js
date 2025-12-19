const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for filtering videos by user
  },
  category: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'general',
    index: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 0
  },
  processedVideos: [{
    quality: { type: String, default: '' },
    url: { type: String, default: '' },
    path: { type: String, default: '' }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  processingError: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 2200,
    default: ''
  },
  hashtags: [{
    type: String
  }],
  mentions: [{
    type: String
  }],
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  scheduledPublishDate: {
    type: Date,
    default: null
  },
  music: {
    name: { type: String, default: '' },
    artist: { type: String, default: '' },
    duration: { type: String, default: '' }
  },
  cropSettings: {
    startTime: { type: Number, default: 0 },
    endTime: { type: Number, default: 0 }
  },
  filter: {
    type: String,
    default: 'none'
  },
  effects: [{
    type: String
  }],
  speed: {
    type: Number,
    default: 1.0
  },
  ageRestriction: {
    type: String,
    enum: ['all', '18+'],
    default: 'all'
  },
  autoCaptions: {
    type: Boolean,
    default: false
  },
  captions: {
    text: { type: String, default: '' },
    translatedText: { type: Map, of: String, default: {} },
    language: { type: String, default: 'en' }
  },
  shareTo: {
    instagram: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    facebook: { type: Boolean, default: false },
    twitter: { type: Boolean, default: false }
  },
  metadataSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Advanced video features
  isMultiClip: {
    type: Boolean,
    default: false
  },
  clips: [{
    url: { type: String, required: true },
    startTime: { type: Number, default: 0 },
    endTime: { type: Number },
    transition: { type: String, default: 'cut' },
    speed: { type: Number, default: 1.0 },
    filter: { type: String, default: 'none' },
    effects: [{ type: String }]
  }],
  greenScreen: {
    enabled: { type: Boolean, default: false },
    backgroundUrl: { type: String, default: '' },
    backgroundColor: { type: String, default: '' },
    chromaKey: { type: String, default: '#00ff00' }
  },
  timeEffects: [{
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    effect: { type: String, enum: ['slow-mo', 'fast-forward', 'reverse', 'freeze'], required: true },
    speed: { type: Number, default: 1.0 }
  }],
  transitions: [{
    type: { type: String, enum: ['fade', 'slide', 'zoom', 'blur', 'circle', 'wipe'], default: 'fade' },
    duration: { type: Number, default: 0.5 },
    position: { type: Number, required: true }
  }],
  template: {
    id: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  // Product tagging
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    timestamp: { type: Number, default: 0 },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    }
  }],
  warningLabel: {
    type: {
      type: String,
      enum: ['sensitive', 'violence', 'nudity', 'language', 'drugs', 'other']
    },
    reason: { type: String },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: { type: Date }
  },
  // Collaborators
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Duet/Stitch
  originalVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  videoType: {
    type: String,
    enum: ['original', 'duet', 'stitch'],
    default: 'original'
  },
  commentsDisabled: {
    type: Boolean,
    default: false
  },
  duetDisabled: {
    type: Boolean,
    default: false
  },
  stitchDisabled: {
    type: Boolean,
    default: false
  },
  duets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  stitches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  status: {
    type: String,
    enum: ['processing', 'ready', 'failed', 'draft', 'scheduled'],
    default: 'processing'
  },
  // Moderation fields
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged', 'under_review'],
    default: 'pending'
  },
  isSensitive: {
    type: Boolean,
    default: false
  },
  copyrightDispute: {
    type: {
      type: String,
      enum: ['dmca', 'trademark', 'other']
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: Date,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolution: String,
    isResolved: {
      type: Boolean,
      default: false
    }
  },
  aiFlags: {
    nudity: { confidence: Number, flagged: Boolean, reviewed: Boolean },
    hate: { confidence: Number, flagged: Boolean, reviewed: Boolean },
    violence: { confidence: Number, flagged: Boolean, reviewed: Boolean },
    spam: { confidence: Number, flagged: Boolean, reviewed: Boolean }
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
videoSchema.index({ user: 1, createdAt: -1 });
videoSchema.index({ status: 1, createdAt: -1 });
videoSchema.index({ isPrivate: 1, status: 1, createdAt: -1 });
// Compound index for common feed queries (user + status + isPrivate)
videoSchema.index({ user: 1, status: 1, isPrivate: 1, createdAt: -1 });
videoSchema.index({ hashtags: 1 });
videoSchema.index({ createdAt: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ likes: -1 });
// Moderation indexes
videoSchema.index({ moderationStatus: 1, createdAt: -1 });
videoSchema.index({ isSensitive: 1 });
videoSchema.index({ 'copyrightDispute.isResolved': 1 });
videoSchema.index({ 'aiFlags.nudity.flagged': 1 });
videoSchema.index({ 'aiFlags.hate.flagged': 1 });
videoSchema.index({ 'aiFlags.violence.flagged': 1 });
videoSchema.index({ 'aiFlags.spam.flagged': 1 });
videoSchema.index({ reviewedBy: 1, reviewedAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
