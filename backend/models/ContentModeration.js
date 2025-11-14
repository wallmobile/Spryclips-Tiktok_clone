const mongoose = require('mongoose');

const moderationRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['auto-moderation', 'content-filter', 'spam-detection', 'comment-filter'],
    required: true
  },
  keywords: [{
    type: String,
    lowercase: true
  }],
  patterns: [{
    type: String // regex patterns
  }],
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  action: {
    type: String,
    enum: ['flag', 'hide', 'delete', 'warn', 'restrict'],
    default: 'flag'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const moderationLogSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentType: {
    type: String,
    enum: ['video', 'comment', 'user', 'profile'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModerationRule'
  },
  reason: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['flagged', 'hidden', 'deleted', 'warned', 'restricted', 'approved'],
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1
  }
}, {
  timestamps: true
});

const ageVerificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  verificationMethod: {
    type: String,
    enum: ['id-upload', 'age-declaration', 'payment-verification'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  verifiedAge: {
    type: Number,
    min: 0,
    max: 120
  },
  verificationDocument: {
    type: String, // URL to uploaded document
    default: ''
  },
  verifiedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const ModerationRule = mongoose.model('ModerationRule', moderationRuleSchema);
const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);
const AgeVerification = mongoose.model('AgeVerification', ageVerificationSchema);

module.exports = { ModerationRule, ModerationLog, AgeVerification };
