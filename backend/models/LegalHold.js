const mongoose = require('mongoose');

const legalHoldSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  affectedContent: [{
    type: String,
    trim: true
  }],
  expiryDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'released'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  releasedAt: {
    type: Date,
    default: null
  },
  releasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: '',
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes for better queries
legalHoldSchema.index({ caseId: 1 });
legalHoldSchema.index({ status: 1, expiryDate: 1 });
legalHoldSchema.index({ createdAt: -1 });

// Auto-update status based on expiry date
legalHoldSchema.pre('save', function(next) {
  if (this.expiryDate && new Date(this.expiryDate) < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

const LegalHold = mongoose.model('LegalHold', legalHoldSchema);

module.exports = LegalHold;

