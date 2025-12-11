const mongoose = require('mongoose');

const warningMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  violationType: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['sent', 'pending', 'failed'],
    default: 'pending'
  },
  sentAt: {
    type: Date,
    default: null
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
warningMessageSchema.index({ userId: 1, createdAt: -1 });
warningMessageSchema.index({ severity: 1 });
warningMessageSchema.index({ status: 1 });

module.exports = mongoose.model('WarningMessage', warningMessageSchema);

