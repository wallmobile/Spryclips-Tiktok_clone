const mongoose = require('mongoose');

const lawEnforcementRequestSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  requestingAgency: {
    type: String,
    required: true,
    trim: true
  },
  requestType: {
    type: String,
    enum: ['data_request', 'account_information', 'content_removal', 'preservation'],
    required: true,
    default: 'data_request'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal'
  },
  affectedUsers: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  responseNotes: {
    type: String,
    default: '',
    maxlength: 1000
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better queries
lawEnforcementRequestSchema.index({ caseNumber: 1 });
lawEnforcementRequestSchema.index({ status: 1, urgency: 1 });
lawEnforcementRequestSchema.index({ createdAt: -1 });
lawEnforcementRequestSchema.index({ requestingAgency: 1 });

const LawEnforcementRequest = mongoose.model('LawEnforcementRequest', lawEnforcementRequestSchema);

module.exports = LawEnforcementRequest;

