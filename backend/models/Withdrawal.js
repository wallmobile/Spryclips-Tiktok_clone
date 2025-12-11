const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'stripe', 'crypto', 'other'],
    required: true
  },
  paymentDetails: {
    accountNumber: String,
    bankName: String,
    routingNumber: String,
    paypalEmail: String,
    stripeAccountId: String,
    cryptoAddress: String,
    cryptoType: String,
    other: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  transactionId: String,
  taxDocumentRequired: {
    type: Boolean,
    default: false
  },
  taxDocument: {
    uploaded: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    documentUrl: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
withdrawalSchema.index({ user: 1, createdAt: -1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);

