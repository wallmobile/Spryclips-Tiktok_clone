const mongoose = require('mongoose');

const creatorFundSchema = new mongoose.Schema({
  // Applicant
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['not_applied', 'pending', 'approved', 'rejected', 'suspended'],
    default: 'not_applied'
  },
  
  // Application Date
  appliedAt: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  
  // Eligibility metrics at time of application
  eligibilitySnapshot: {
    followers: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 },
    accountAge: { type: Number, default: 0 }, // in days
    engagementRate: { type: Number, default: 0 },
    isOriginalContent: { type: Boolean, default: true }
  },
  
  // Earnings from Creator Fund
  totalEarnings: {
    type: Number,
    default: 0
  },
  monthlyEarnings: [{
    month: String, // "2024-01"
    amount: Number,
    views: Number,
    engagement: Number,
    paidAt: Date
  }],
  
  // Current month stats
  currentMonthViews: {
    type: Number,
    default: 0
  },
  currentMonthEngagement: {
    type: Number,
    default: 0
  },
  
  // Payment settings
  paymentMethod: {
    type: String,
    enum: ['bank', 'paypal', 'stripe'],
    default: 'paypal'
  },
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Rejection reason
  rejectionReason: {
    type: String
  },
  
  // Notes
  adminNotes: {
    type: String
  }
  
}, { timestamps: true });

// Indexes
creatorFundSchema.index({ creator: 1 });
creatorFundSchema.index({ status: 1 });

module.exports = mongoose.model('CreatorFund', creatorFundSchema);


