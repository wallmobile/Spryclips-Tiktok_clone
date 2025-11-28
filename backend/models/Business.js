const mongoose = require('mongoose');

// Business Profile Schema
const businessProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Business Info
  businessName: {
    type: String,
    trim: true,
    default: ''
  },
  businessType: {
    type: String,
    enum: ['individual', 'small_business', 'brand', 'agency', 'enterprise'],
    default: 'individual'
  },
  industry: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['not_applied', 'pending', 'approved', 'rejected'],
    default: 'not_applied'
  },
  verificationDate: Date,
  
  // Bio Link
  bioLink: {
    enabled: { type: Boolean, default: false },
    url: { type: String, default: '' },
    title: { type: String, default: '' },
    clicks: { type: Number, default: 0 }
  },
  
  // Stats
  stats: {
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    adSpend: { type: Number, default: 0 },
    productsCount: { type: Number, default: 0 }
  },
  
  // Messaging Settings
  messagingEnabled: { type: Boolean, default: false },
  unreadMessages: { type: Number, default: 0 },
  
  // Messaging Preferences
  messagingSettings: {
    notifications: { type: Boolean, default: true },
    autoReply: { type: Boolean, default: false },
    autoReplyMessage: { type: String, default: '' },
    aiAssistant: { type: Boolean, default: true },
    messageFiltering: { type: Boolean, default: true }
  }
  
}, { timestamps: true });

// Ad Campaign Schema
const adCampaignSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Campaign Details
  name: {
    type: String,
    required: true,
    trim: true
  },
  objective: {
    type: String,
    enum: ['awareness', 'traffic', 'engagement', 'conversions', 'app_installs'],
    default: 'awareness'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'completed', 'rejected'],
    default: 'draft'
  },
  
  // Budget
  budget: {
    type: Number,
    required: true,
    min: 10
  },
  dailyBudget: {
    type: Number,
    default: 0
  },
  spent: {
    type: Number,
    default: 0
  },
  
  // Targeting
  targeting: {
    ageMin: { type: Number, default: 18 },
    ageMax: { type: Number, default: 65 },
    gender: { type: String, enum: ['all', 'male', 'female'], default: 'all' },
    locations: [{ type: String }],
    interests: [{ type: String }],
    languages: [{ type: String }]
  },
  
  // Creative
  creative: {
    type: { type: String, enum: ['video', 'image', 'carousel'], default: 'video' },
    mediaUrl: { type: String, default: '' },
    headline: { type: String, default: '' },
    description: { type: String, default: '' },
    callToAction: { type: String, default: 'Learn More' },
    destinationUrl: { type: String, default: '' }
  },
  
  // Schedule
  startDate: Date,
  endDate: Date,
  
  // Performance
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 }
  }
  
}, { timestamps: true });

// Promo Code Schema
const promoCodeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  
  maxUses: {
    type: Number,
    default: 100
  },
  currentUses: {
    type: Number,
    default: 0
  },
  
  minPurchase: {
    type: Number,
    default: 0
  },
  
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  usageHistory: [{
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date, default: Date.now },
    orderAmount: Number,
    discountAmount: Number
  }]
  
}, { timestamps: true });

// Saved Audience Schema
const savedAudienceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    default: ''
  },
  
  // Demographics
  demographics: {
    ageMin: { type: Number, default: 18 },
    ageMax: { type: Number, default: 65 },
    gender: { type: String, enum: ['all', 'male', 'female'], default: 'all' }
  },
  
  // Interests
  interests: [{ type: String }],
  
  // Locations
  locations: [{ type: String }],
  
  // Languages
  languages: [{ type: String }],
  
  // Estimated Size
  estimatedSize: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 }
  },
  
  // Usage stats
  usedInCampaigns: { type: Number, default: 0 },
  lastUsed: Date,
  
  isActive: { type: Boolean, default: true }
  
}, { timestamps: true });

// Business Analytics Schema (Daily Stats)
const businessAnalyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  date: {
    type: Date,
    required: true
  },
  
  metrics: {
    profileViews: { type: Number, default: 0 },
    websiteClicks: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    videoViews: { type: Number, default: 0 },
    averageWatchTime: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  
  audience: {
    topCountries: [{ country: String, percentage: Number }],
    topCities: [{ city: String, percentage: Number }],
    ageDistribution: [{ range: String, percentage: Number }],
    genderDistribution: { male: Number, female: Number, other: Number }
  }
  
}, { timestamps: true });

// Indexes
businessProfileSchema.index({ user: 1 });
adCampaignSchema.index({ user: 1, status: 1 });
promoCodeSchema.index({ user: 1, code: 1 });
promoCodeSchema.index({ code: 1 }, { unique: true });
businessAnalyticsSchema.index({ user: 1, date: -1 });
savedAudienceSchema.index({ user: 1 });

// Brand Partnership Schema
const brandPartnershipSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  brandName: {
    type: String,
    required: true,
    trim: true
  },
  
  contactEmail: {
    type: String,
    default: ''
  },
  
  campaignType: {
    type: String,
    enum: ['sponsored_post', 'product_review', 'brand_ambassador', 'affiliate', 'event'],
    default: 'sponsored_post'
  },
  
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  budget: {
    type: Number,
    default: 0
  },
  
  description: {
    type: String,
    default: ''
  },
  
  deliverables: {
    type: String,
    default: ''
  },
  
  // Performance tracking
  performance: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    earned: { type: Number, default: 0 }
  },
  
  startDate: Date,
  endDate: Date
  
}, { timestamps: true });

brandPartnershipSchema.index({ user: 1, status: 1 });

const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema);
const AdCampaign = mongoose.model('AdCampaign', adCampaignSchema);
const PromoCode = mongoose.model('PromoCode', promoCodeSchema);
const BusinessAnalytics = mongoose.model('BusinessAnalytics', businessAnalyticsSchema);
const SavedAudience = mongoose.model('SavedAudience', savedAudienceSchema);
const BrandPartnership = mongoose.model('BrandPartnership', brandPartnershipSchema);

// Business Conversation Schema
const businessConversationSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Customer info (for display)
  customerInfo: {
    name: { type: String, default: 'Customer' },
    username: { type: String, default: '' },
    avatar: { type: String, default: '' }
  },
  
  lastMessage: {
    text: { type: String, default: '' },
    sender: { type: String, enum: ['customer', 'business'], default: 'customer' },
    timestamp: { type: Date, default: Date.now }
  },
  
  status: {
    type: String,
    enum: ['active', 'pending', 'resolved', 'archived'],
    default: 'active'
  },
  
  unreadCount: {
    type: Number,
    default: 0
  },
  
  // Messages stored in array
  messages: [{
    sender: { type: String, enum: ['customer', 'business'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }]
  
}, { timestamps: true });

businessConversationSchema.index({ business: 1, status: 1 });
businessConversationSchema.index({ business: 1, unreadCount: 1 });

const BusinessConversation = mongoose.model('BusinessConversation', businessConversationSchema);

// Quick Reply Template Schema
const quickReplySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  message: {
    type: String,
    required: true
  }
  
}, { timestamps: true });

const QuickReply = mongoose.model('QuickReply', quickReplySchema);

module.exports = { BusinessProfile, AdCampaign, PromoCode, BusinessAnalytics, SavedAudience, BrandPartnership, BusinessConversation, QuickReply };


