const mongoose = require('mongoose');

const creatorAcademySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  type: {
    type: String,
    enum: ['tutorial', 'best-practice', 'case-study', 'learning-path'],
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: '' // For text-based content or markdown
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  tags: [{
    type: String
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  learningPath: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningPath'
  },
  order: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

creatorAcademySchema.index({ type: 1, category: 1, isPublished: 1, createdAt: -1 });
creatorAcademySchema.index({ learningPath: 1, order: 1 });
creatorAcademySchema.index({ tags: 1 });
creatorAcademySchema.index({ title: 'text', description: 'text', content: 'text' });

const learningPathSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  thumbnail: {
    type: String,
    default: ''
  },
  courses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreatorAcademy'
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  estimatedDuration: {
    type: Number, // in hours
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  enrolledUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPublished: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const CreatorAcademy = mongoose.model('CreatorAcademy', creatorAcademySchema);
const LearningPath = mongoose.model('LearningPath', learningPathSchema);

module.exports = { CreatorAcademy, LearningPath };
