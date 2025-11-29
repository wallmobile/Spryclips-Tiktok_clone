const mongoose = require('mongoose');

// Subscription Plan Schema (creator's tiers)
const subscriptionPlanSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Plan details
  name: {
    type: String,
    required: true,
    default: 'Supporter'
  },
  price: {
    type: Number,
    required: true,
    min: 0.99
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Benefits
  benefits: [{
    type: String
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Stats
  subscriberCount: {
    type: Number,
    default: 0
  }
  
}, { timestamps: true });

// User Subscription Schema (subscribers)
const userSubscriptionSchema = new mongoose.Schema({
  // Subscriber
  subscriber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Creator being subscribed to
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Plan subscribed to
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  
  // Subscription status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending'],
    default: 'active'
  },
  
  // Billing
  amount: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  nextBillingDate: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    default: 'card'
  }
  
}, { timestamps: true });

// Creator Subscription Settings
const subscriptionSettingsSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Is subscriptions enabled
  enabled: {
    type: Boolean,
    default: false
  },
  enabledAt: {
    type: Date
  },
  
  // Revenue stats
  totalRevenue: {
    type: Number,
    default: 0
  },
  monthlyRevenue: {
    type: Number,
    default: 0
  },
  totalSubscribers: {
    type: Number,
    default: 0
  },
  activeSubscribers: {
    type: Number,
    default: 0
  },
  
  // Monthly breakdown
  monthlyStats: [{
    month: String,
    revenue: Number,
    newSubscribers: Number,
    cancelledSubscribers: Number
  }]
  
}, { timestamps: true });

// Indexes
subscriptionPlanSchema.index({ creator: 1, isActive: 1 });
userSubscriptionSchema.index({ subscriber: 1, creator: 1 });
userSubscriptionSchema.index({ creator: 1, status: 1 });
subscriptionSettingsSchema.index({ creator: 1 });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);
const SubscriptionSettings = mongoose.model('SubscriptionSettings', subscriptionSettingsSchema);

module.exports = { SubscriptionPlan, UserSubscription, SubscriptionSettings };


