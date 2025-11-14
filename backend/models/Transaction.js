const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earnings', 'payout', 'gift_sent', 'gift_received', 'subscription', 'tip'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Related entities
  relatedVideo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Payment details
  paymentMethod: {
    type: String,
    default: ''
  },
  paymentId: {
    type: String,
    default: ''
  },
  // Payout details
  payoutMethod: {
    type: String,
    enum: ['bank', 'paypal', 'crypto', 'other'],
    default: null
  },
  payoutDetails: {
    accountNumber: String,
    bankName: String,
    paypalEmail: String,
    cryptoAddress: String
  },
  // Metadata
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

