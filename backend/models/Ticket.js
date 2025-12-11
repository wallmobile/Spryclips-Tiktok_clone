const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'account', 'content', 'payment', 'other'],
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed', 'pending-user'],
    default: 'open',
    index: true
  },
  attachments: [{
    url: String,
    filename: String,
    fileType: String,
    uploadedAt: Date
  }],
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin', 'system'],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    attachments: [{
      url: String,
      filename: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  tags: [String],
  resolution: String,
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  firstResponseAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  satisfactionFeedback: String,
  relatedTickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }]
}, {
  timestamps: true
});

TicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ assignedTo: 1, status: 1 });

// Generate ticket ID before save
TicketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await mongoose.model('Ticket').countDocuments();
    this.ticketId = `TK-${Date.now()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', TicketSchema);




