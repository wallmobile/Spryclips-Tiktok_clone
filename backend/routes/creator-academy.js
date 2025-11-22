const express = require('express');
const { CreatorAcademy, LearningPath } = require('../models/CreatorAcademy');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ========== CREATOR ACADEMY CONTENT ==========

// Get all academy content
router.get('/', async (req, res) => {
  try {
    const { type, category, difficulty, featured, search, page = 1, limit = 20 } = req.query;
    const query = { isPublished: true };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (featured === 'true') query.featured = true;
    if (search) {
      query.$text = { $search: search };
    }
    
    const content = await CreatorAcademy.find(query)
      .sort(featured === 'true' ? { featured: -1, createdAt: -1 } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await CreatorAcademy.countDocuments(query);
    
    res.json({
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get content by type
router.get('/type/:type', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const content = await CreatorAcademy.find({
      type: req.params.type,
      isPublished: true
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get featured content
router.get('/featured', async (req, res) => {
  try {
    const content = await CreatorAcademy.find({
      isPublished: true,
      featured: true
    })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    const content = await CreatorAcademy.findById(req.params.id)
      .populate('learningPath');
    
    if (!content || !content.isPublished) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // Increment views
    content.views++;
    await content.save();
    
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like content
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const content = await CreatorAcademy.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    const isLiked = content.likedBy.includes(req.user._id);
    
    if (isLiked) {
      content.likedBy = content.likedBy.filter(id => id.toString() !== req.user._id.toString());
      content.likes--;
    } else {
      content.likedBy.push(req.user._id);
      content.likes++;
    }
    
    await content.save();
    res.json({ isLiked: !isLiked, likes: content.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create content (admin only - you can add admin check)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const content = new CreatorAcademy(req.body);
    await content.save();
    res.status(201).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== LEARNING PATHS ==========

// Get all learning paths
router.get('/learning-paths', async (req, res) => {
  try {
    const paths = await LearningPath.find({ isPublished: true })
      .populate('courses.course')
      .sort({ createdAt: -1 });
    res.json(paths);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get learning path by ID
router.get('/learning-paths/:id', async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id)
      .populate({
        path: 'courses.course',
        match: { isPublished: true }
      });
    
    if (!path || !path.isPublished) {
      return res.status(404).json({ message: 'Learning path not found' });
    }
    
    res.json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Enroll in learning path
router.post('/learning-paths/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    
    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }
    
    if (!path.enrolledUsers.includes(req.user._id)) {
      path.enrolledUsers.push(req.user._id);
      await path.save();
    }
    
    res.json({ message: 'Enrolled successfully', path });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create learning path
router.post('/learning-paths', authMiddleware, async (req, res) => {
  try {
    const path = new LearningPath(req.body);
    await path.save();
    res.status(201).json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
