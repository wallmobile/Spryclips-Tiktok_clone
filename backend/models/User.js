const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'local';
    },
    minlength: 8
  },
  passwordHistory: [{
    password: String,
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  emailVerified: {
    type: Boolean,
    default: false
  },
  identityVerified: {
    type: Boolean,
    default: false
  },
  identityVerificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_submitted'],
    default: 'not_submitted'
  },
  identityVerificationSubmittedAt: {
    type: Date,
    default: null
  },
  warningStrikes: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  warningHistory: [{
    reason: String,
    issuedAt: {
      type: Date,
      default: Date.now
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  loginHistory: [{
    ipAddress: String,
    userAgent: String,
    device: String,
    browser: String,
    os: String,
    location: String,
    loginAt: {
      type: Date,
      default: Date.now
    },
    logoutAt: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    isUnusual: { type: Boolean, default: false },
    riskScore: { type: Number, default: 0, min: 0, max: 10 },
    browserFingerprint: String
  }],
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationCode: {
    type: String,
    default: null,
    index: true
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  deactivatedAt: {
    type: Date,
    default: null
  },
  isSelfDeactivated: {
    type: Boolean,
    default: false
  },
  // Safety & Security
  isBot: {
    type: Boolean,
    default: false,
    index: true
  },
  botScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  accountTakeoverRisk: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  unusualLoginAlerts: [{
    timestamp: Date,
    ipAddress: String,
    location: String,
    riskScore: Number,
    actionTaken: String,
    reviewed: { type: Boolean, default: false }
  }],
  childSafetyFlag: {
    type: Boolean,
    default: false,
    index: true
  },
  reportCount: {
    type: Number,
    default: 0
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin', 'creator'],
    default: 'user'
  },
  // Monetization
  creatorStatus: {
    type: String,
    enum: ['not_applied', 'pending', 'approved', 'rejected', 'suspended'],
    default: 'not_applied',
    index: true
  },
  creatorEarnings: {
    totalEarned: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    pendingWithdrawal: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    adRevenueShare: { type: Number, default: 50, min: 0, max: 100 } // Percentage
  },
  taxInfo: {
    taxId: String,
    taxCountry: String,
    documents: [{
      type: String, // W-9, W-8, etc.
      documentUrl: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date
    }]
  },
  authProvider: {
    type: String,
    enum: ['local', 'oidc', 'google', 'facebook'],
    default: 'local'
  },
  providerId: {
    type: String
  },
  profile: {
    displayName: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500
    },
    avatar: {
      type: String,
      default: ''
    },
    banner: {
      type: String,
      default: ''
    },
    website: {
      type: String,
      default: '',
      trim: true
    },
    followers: {
      type: Number,
      default: 0
    },
    following: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    pinnedVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    qrScans: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    }
  },
  privacy: {
    accountType: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    showActivityStatus: {
      type: Boolean,
      default: true
    },
    allowDirectMessages: {
      type: String,
      enum: ['everyone', 'following', 'none'],
      default: 'everyone'
    },
    commentFilter: {
      type: Boolean,
      default: false
    },
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
    filteredKeywords: [{
      type: String,
      trim: true
    }],
    blockedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      blockedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  notificationSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  notificationFrequency: {
    type: String,
    enum: ['instant', 'bundled', 'daily'],
    default: 'instant'
  },
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    from: {
      type: String,
      default: '22:00'
    },
    to: {
      type: String,
      default: '08:00'
    }
  },
  appSettings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  preferredLanguage: {
    type: String,
    default: 'English'
  },
  preferredRegion: {
    type: String,
    default: 'United States'
  },
  videos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  likedVideos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  followedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Video Collections
  watchLater: [{
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  collections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  }],
  playlists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  videoSeries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoSeries'
  }],
  // Saved Sounds/Music
  savedSounds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sound'
  }],
  experience: {
    language: {
      type: String,
      default: 'English (US)'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  // Wallet for monetization
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    pendingPayout: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  // Stats for creator fund eligibility
  stats: {
    followers: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.authProvider !== 'local') return next();
  
  try {
    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d@$!%*?&#\-_.]{8,}$/;
    if (!passwordRegex.test(this.password)) {
      return next(new Error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'));
    }

    // Check password history (prevent reuse of last 5 passwords)
    if (this.passwordHistory && this.passwordHistory.length > 0) {
      const last5Passwords = this.passwordHistory.slice(-5);
      for (const oldPassword of last5Passwords) {
        const isMatch = await bcrypt.compare(this.password, oldPassword.password);
        if (isMatch) {
          return next(new Error('Password cannot be one of your last 5 passwords'));
        }
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    // Add to password history (keep last 5) - only for password changes, not initial signup
    if (this.isModified('password') && !this.isNew) {
      // This is a password change, not initial signup
      if (!this.passwordHistory) {
        this.passwordHistory = [];
      }
      // Note: We can't access old password here, so we'll handle this in the route
      // For now, just add the new password to history
      this.passwordHistory.push({
        password: hashedPassword,
        changedAt: new Date()
      });
      // Keep only last 5 passwords
      if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(-5);
      }
    }
    // For new users (signup), don't add to password history yet
    
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.authProvider !== 'local') return false;
  if (!this.password || !candidatePassword) return false;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment failed login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  const updates = { $inc: { failedLoginAttempts: 1 } };
  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema);
