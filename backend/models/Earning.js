const mongoose = require('mongoose');

const earningSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['ad_revenue', 'gifts', 'brand_deal', 'subscription', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  source: {
    type: String, // Video ID, Brand Deal ID, etc.
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'rejected'],
    default: 'pending',
    index: true
  },
  period: {
    start: Date,
    end: Date
  },
  taxDocument: {
    uploaded: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    documentUrl: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
earningSchema.index({ user: 1, createdAt: -1 });
earningSchema.index({ type: 1, status: 1, createdAt: -1 });
earningSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Earning', earningSchema);

