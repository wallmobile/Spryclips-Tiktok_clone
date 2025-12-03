const mongoose = require('mongoose');

const brandDealSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  brand: {
    name: String,
    email: String,
    contactPerson: String,
    companyId: mongoose.Schema.Types.ObjectId
  },
  campaign: {
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    budget: Number,
    currency: { type: String, default: 'USD' }
  },
  deliverables: [{
    type: String, // Video, Post, Story, etc.
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false }
  }],
  payment: {
    totalAmount: Number,
    currency: { type: String, default: 'USD' },
    paymentSchedule: [{
      milestone: String,
      amount: Number,
      dueDate: Date,
      paid: { type: Boolean, default: false },
      paidAt: Date
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed', 'cancelled'],
      default: 'pending'
    }
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'active', 'completed', 'rejected', 'cancelled'],
    default: 'pending_approval',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  adminNotes: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
brandDealSchema.index({ creator: 1, createdAt: -1 });
brandDealSchema.index({ status: 1, createdAt: -1 });
brandDealSchema.index({ 'campaign.startDate': 1, 'campaign.endDate': 1 });

module.exports = mongoose.model('BrandDeal', brandDealSchema);

