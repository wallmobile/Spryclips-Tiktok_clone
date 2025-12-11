const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    enum: [
      'all',
      'users',
      'content',
      'moderation',
      'monetization',
      'reports',
      'compliance',
      'analytics',
      'system',
      'security',
      'settings'
    ]
  }],
  description: {
    type: String,
    default: ''
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
roleSchema.index({ name: 1 });
roleSchema.index({ isSystem: 1 });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;

