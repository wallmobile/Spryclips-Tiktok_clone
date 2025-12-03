const mongoose = require('mongoose');

const PaymentIssueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  paymentId: {
    type: String,
    required: true,
    index: true
  },
  transactionId: String,
  orderId: String,
  paymentMethod: {
    type: String,
    enum: ['credit-card', 'debit-card', 'paypal', 'stripe', 'razorpay', 'coin', 'gift', 'other'],
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
  issueType: {
    type: String,
    enum: ['payment-failed', 'refund-request', 'double-charge', 'payment-pending', 'transaction-not-found', 'incorrect-amount', 'payment-gateway-error', 'card-declined', 'insufficient-funds', 'other'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'refunded', 'dismissed'],
    default: 'pending',
    index: true
  },
  description: String,
  errorCode: String,
  errorMessage: String,
  gatewayResponse: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  originalTransaction: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: String,
  refundAmount: Number,
  refundTransactionId: String,
  refundedAt: Date,
  actions: [{
    action: {
      type: String,
      enum: ['refund-processed', 'payment-retried', 'transaction-verified', 'manual-adjustment', 'gateway-contacted', 'payment-cancelled', 'other']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    amount: Number
  }],
  relatedTicket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'high'
  }
}, {
  timestamps: true
});

PaymentIssueSchema.index({ status: 1, requestedAt: -1 });
PaymentIssueSchema.index({ paymentId: 1 });
PaymentIssueSchema.index({ userId: 1, status: 1 });
PaymentIssueSchema.index({ issueType: 1, status: 1 });

module.exports = mongoose.model('PaymentIssue', PaymentIssueSchema);



