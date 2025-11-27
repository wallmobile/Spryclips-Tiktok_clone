const express = require('express');
const { CreatorAcademy, LearningPath } = require('../models/CreatorAcademy');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Helper: Get user from token (optional auth)
const getUserFromToken = (req) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production');
    return decoded.userId;
  } catch {
    return null;
  }
};

// ==================== CONTENT ROUTES ====================

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
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const content = await CreatorAcademy.find(query)
      .sort(featured === 'true' ? { featured: -1, createdAt: -1 } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await CreatorAcademy.countDocuments(query);
    
    res.json({
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
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
    
    res.json({ content });
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

// Search content
router.get('/search/:query', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const searchQuery = req.params.query;
    
    const content = await CreatorAcademy.find({
      isPublished: true,
      $or: [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { category: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.json({ content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get categories list
router.get('/categories', async (req, res) => {
  try {
    const categories = await CreatorAcademy.distinct('category', { isPublished: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== USER PROGRESS ROUTES ====================

// Get user progress (no auth required - returns empty if not logged in)
router.get('/progress', async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.json({
        enrolledPaths: [],
        completed: [],
        totalProgress: 0
      });
    }
    
    const enrolledPaths = await LearningPath.find({
      enrolledUsers: userId,
      isPublished: true
    }).populate('courses.course');
    
    // Get completed lessons (you can add a UserProgress model for this)
    res.json({
      enrolledPaths,
      completed: [],
      totalProgress: enrolledPaths.length > 0 ? 10 : 0
    });
  } catch (error) {
    res.json({
      enrolledPaths: [],
      completed: [],
      totalProgress: 0
    });
  }
});

// ==================== LEARNING PATHS ROUTES ====================

// Get all learning paths
router.get('/paths', async (req, res) => {
  try {
    const paths = await LearningPath.find({ isPublished: true })
      .populate('courses.course')
      .sort({ createdAt: -1 });
    res.json(paths);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get enrolled paths (no auth required - returns empty if not logged in)
router.get('/paths/enrolled', async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.json([]);
    }
    
    const paths = await LearningPath.find({
      enrolledUsers: userId,
      isPublished: true
    }).populate('courses.course');
    
    res.json(paths);
  } catch (error) {
    res.json([]);
  }
});

// Enroll in learning path
router.post('/paths/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    
    if (!path) {
      return res.status(404).json({ message: 'Learning path not found' });
    }
    
    if (!path.enrolledUsers.includes(req.user._id)) {
      path.enrolledUsers.push(req.user._id);
      await path.save();
    }
    
    res.json({ message: 'Enrolled successfully!', path });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get learning path by ID
router.get('/paths/:id', async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: 'Learning path not found' });
    }
    
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

// Get path progress
router.get('/paths/:id/progress', async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    if (!userId) {
      return res.json({ completedLessons: [], progress: 0 });
    }
    
    // Return progress for this path
    res.json({
      completedLessons: [],
      progress: 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== BACKWARDS COMPATIBILITY ====================

// Support /learning-paths for backwards compatibility
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

router.get('/learning-paths/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: 'Learning path not found' });
    }
    
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
    
    res.json({ message: 'Enrolled successfully!', path });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== CONTENT INTERACTION ====================

// Mark content as completed
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const content = await CreatorAcademy.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // You can add a UserProgress model to track this properly
    res.json({ message: 'Marked as completed!', contentId: req.params.id });
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

// ==================== ADMIN ROUTES ====================

// Create content (admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const content = new CreatorAcademy(req.body);
    await content.save();
    res.status(201).json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create learning path (admin)
router.post('/paths', authMiddleware, async (req, res) => {
  try {
    const path = new LearningPath(req.body);
    await path.save();
    res.status(201).json(path);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== DYNAMIC ID ROUTE (MUST BE LAST) ====================

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    // Validate that id looks like a MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
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

module.exports = router;
