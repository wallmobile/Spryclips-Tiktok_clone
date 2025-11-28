const mongoose = require('mongoose');

const adsRevenueSchema = new mongoose.Schema({
  // Creator
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Ads enabled status
  adsEnabled: {
    type: Boolean,
    default: false
  },
  enabledAt: {
    type: Date
  },
  
  // Ad settings
  settings: {
    preRollAds: { type: Boolean, default: true },
    midRollAds: { type: Boolean, default: false },
    postRollAds: { type: Boolean, default: true },
    bannerAds: { type: Boolean, default: true },
    sponsoredContent: { type: Boolean, default: true },
    adFrequency: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      default: 'medium' 
    }
  },
  
  // Revenue stats
  totalEarnings: {
    type: Number,
    default: 0
  },
  currentMonthEarnings: {
    type: Number,
    default: 0
  },
  
  // Performance metrics
  totalImpressions: {
    type: Number,
    default: 0
  },
  totalClicks: {
    type: Number,
    default: 0
  },
  cpm: { // Cost per thousand impressions
    type: Number,
    default: 0
  },
  ctr: { // Click-through rate
    type: Number,
    default: 0
  },
  
  // Monthly breakdown
  monthlyStats: [{
    month: String, // "2024-01"
    earnings: Number,
    impressions: Number,
    clicks: Number,
    cpm: Number,
    paidAt: Date
  }],
  
  // Payment threshold
  paymentThreshold: {
    type: Number,
    default: 100 // Minimum $100 to withdraw
  },
  pendingPayout: {
    type: Number,
    default: 0
  }
  
}, { timestamps: true });

// Indexes
adsRevenueSchema.index({ creator: 1 });
adsRevenueSchema.index({ adsEnabled: 1 });

// Virtual for CTR calculation
adsRevenueSchema.virtual('clickThroughRate').get(function() {
  if (this.totalImpressions === 0) return 0;
  return ((this.totalClicks / this.totalImpressions) * 100).toFixed(2);
});

module.exports = mongoose.model('AdsRevenue', adsRevenueSchema);


