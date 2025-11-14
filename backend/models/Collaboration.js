const mongoose = require('mongoose');

const collaborationSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending',
  },
  message: {
    type: String,
    maxlength: 500,
    default: '',
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

collaborationSchema.index({ video: 1, status: 1 });
collaborationSchema.index({ requester: 1, status: 1 });
collaborationSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model('Collaboration', collaborationSchema);

