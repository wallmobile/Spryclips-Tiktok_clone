const mongoose = require('mongoose');

const partnershipSchema = new mongoose.Schema({
  // Creator who created the partnership request
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Brand/Company details
  brandName: {
    type: String,
    required: true,
    trim: true
  },
  brandEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  brandLogo: {
    type: String,
    default: ''
  },
  
  // Campaign details
  campaignName: {
    type: String,
    required: true,
    trim: true
  },
  campaignType: {
    type: String,
    enum: ['sponsored', 'affiliate', 'ambassador', 'review', 'giveaway', 'takeover'],
    default: 'sponsored'
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    default: ''
  },
  
  // Budget & Payment
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'escrow', 'partial', 'paid', 'refunded'],
    default: 'pending'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  
  // Deliverables
  totalDeliverables: {
    type: Number,
    required: true,
    min: 1
  },
  completedDeliverables: {
    type: Number,
    default: 0
  },
  deliverablesList: [{
    title: String,
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    proof: String // URL to proof of completion
  }],
  
  // Timeline
  deadline: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'active', 'in_progress', 'review', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  
  // Who can approve (for brand deals, brand approves; for creator requests, admin approves)
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  
  // Messages between creator and brand
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Contract/Agreement
  contractUrl: {
    type: String
  },
  termsAccepted: {
    type: Boolean,
    default: false
  },
  termsAcceptedAt: {
    type: Date
  }
  
}, { timestamps: true });

// Indexes
partnershipSchema.index({ creator: 1, status: 1 });
partnershipSchema.index({ brandEmail: 1 });
partnershipSchema.index({ status: 1 });
partnershipSchema.index({ deadline: 1 });

// Virtual for progress percentage
partnershipSchema.virtual('progressPercent').get(function() {
  if (this.totalDeliverables === 0) return 0;
  return Math.round((this.completedDeliverables / this.totalDeliverables) * 100);
});

// Virtual for days remaining
partnershipSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtuals are included in JSON
partnershipSchema.set('toJSON', { virtuals: true });
partnershipSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Partnership', partnershipSchema);



