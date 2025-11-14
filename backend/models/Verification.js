const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rejectionReason: {
    type: String,
    default: '',
  },
  documents: [{
    type: {
      type: String,
      enum: ['id', 'passport', 'driving_license', 'business_license', 'other'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  additionalInfo: {
    fullName: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['individual', 'business', 'brand', 'organization'],
      default: 'individual',
    },
    website: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
  },
  notes: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

verificationSchema.index({ user: 1 });
verificationSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model('Verification', verificationSchema);

