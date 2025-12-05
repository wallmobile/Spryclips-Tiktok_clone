const mongoose = require('mongoose');

const regionalLawSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
    unique: true,
    enum: ['US', 'EU', 'UK', 'CA', 'AU', 'IN', 'CN'],
    uppercase: true
  },
  regionName: {
    type: String,
    required: true
  },
  dataRetention: {
    type: Number,
    required: true,
    default: 365,
    min: 0,
    max: 3650
  },
  gdprCompliant: {
    type: Boolean,
    default: false
  },
  contentRestrictions: [{
    type: String,
    trim: true
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
regionalLawSchema.index({ region: 1 });

const RegionalLaw = mongoose.model('RegionalLaw', regionalLawSchema);

module.exports = RegionalLaw;

