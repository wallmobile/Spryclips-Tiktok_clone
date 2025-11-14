const mongoose = require('mongoose');

const twoFactorAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  secret: {
    type: String,
    required: true,
  },
  backupCodes: [{
    code: {
      type: String,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  }],
  lastUsed: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

twoFactorAuthSchema.index({ user: 1 });

module.exports = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);

