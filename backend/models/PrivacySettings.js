const mongoose = require('mongoose');

const privacySettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Account Privacy
  accountType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  
  // Content Privacy
  downloadEnabled: {
    type: Boolean,
    default: true
  },
  mentionsEnabled: {
    type: Boolean,
    default: true
  },
  tagsEnabled: {
    type: Boolean,
    default: true
  },
  duetEnabled: {
    type: Boolean,
    default: true
  },
  stitchEnabled: {
    type: Boolean,
    default: true
  },
  
  // Download Preferences
  downloadPreferences: {
    requireWatermark: { type: Boolean, default: true },
    allowOriginalVideos: { type: Boolean, default: false },
    allowAudioDownload: { type: Boolean, default: true },
    shareLinkExpiry: { type: String, default: '7' } // days or 'never'
  },
  
  // Activity Status
  activityStatus: {
    type: Boolean,
    default: true
  },
  activityPreferences: {
    visibility: { 
      type: String, 
      enum: ['everyone', 'followers', 'off'], 
      default: 'followers' 
    },
    showLastSeen: { type: Boolean, default: true },
    showDevices: { type: Boolean, default: false }
  },
  
  // Comment Filters
  commentFilter: {
    type: Boolean,
    default: false
  },
  commentFilterSettings: {
    hideOffensive: { type: Boolean, default: true },
    filterSpam: { type: Boolean, default: true },
    requireApproval: { type: Boolean, default: false },
    filteredKeywords: [{ type: String }]
  },
  
  // Blocked Users
  blockedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    blockedAt: { type: Date, default: Date.now },
    reason: String
  }],
  
  // Data Requests
  dataRequests: [{
    type: {
      type: String,
      enum: ['download', 'deletion', 'report'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'pending'
    },
    requestedAt: { type: Date, default: Date.now },
    completedAt: Date,
    downloadUrl: String,
    expiresAt: Date
  }]
  
}, { timestamps: true });

// Indexes
privacySettingsSchema.index({ user: 1 });

module.exports = mongoose.model('PrivacySettings', privacySettingsSchema);


