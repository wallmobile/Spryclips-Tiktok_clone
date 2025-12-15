const express = require('express');
const Effect = require('../models/Effect');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { adminMiddleware } = require('../middleware/admin');
const router = express.Router();

// ==================== GET ALL EFFECTS ====================
router.get('/', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const isPremium = req.query.premium === 'true';
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const sortBy = req.query.sort || 'popular'; // popular, newest, featured

    const query = { isActive: true };

    if (category !== 'all') {
      query.category = category;
    }

    if (isPremium !== undefined) {
      query.isPremium = isPremium;
    }

    let sortQuery = {};
    switch (sortBy) {
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      case 'featured':
        sortQuery = { isFeatured: -1, usageCount: -1 };
        break;
      case 'popular':
      default:
        sortQuery = { usageCount: -1, favoritesCount: -1 };
        break;
    }

    const effects = await Effect.find(query)
      .populate('creator', 'username profile')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`[Effects API] Query:`, query);
    console.log(`[Effects API] Found ${effects.length} effects`);
    if (effects.length > 0) {
      console.log(`[Effects API] Categories:`, effects.map(e => e.category));
    } else {
      console.log(`[Effects API] ⚠️ No effects found in database for query:`, query);
      console.log(`[Effects API] Total effects in DB:`, await Effect.countDocuments({ isActive: true }));
    }

    res.json({
      success: true,
      effects,
      count: effects.length,
    });
  } catch (error) {
    console.error('Error fetching effects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch effects',
      error: error.message,
    });
  }
});

// ==================== GET EFFECT CATEGORIES ====================
router.get('/categories', async (req, res) => {
  try {
    const categories = await Effect.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const categoryList = categories.map(cat => ({
      category: cat._id,
      count: cat.count,
    }));

    res.json({
      success: true,
      categories: categoryList,
    });
  } catch (error) {
    console.error('Error fetching effect categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch effect categories',
      error: error.message,
    });
  }
});

// ==================== GET EFFECT BY ID ====================
router.get('/:id', async (req, res) => {
  try {
    const effectId = req.params.id;

    const effect = await Effect.findById(effectId)
      .populate('creator', 'username profile')
      .populate('favorites', 'username profile');

    if (!effect) {
      return res.status(404).json({
        success: false,
        message: 'Effect not found',
      });
    }

    // Increment usage count (for analytics)
    effect.usageCount += 1;
    await effect.save();

    res.json({
      success: true,
      effect,
    });
  } catch (error) {
    console.error('Error fetching effect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch effect',
      error: error.message,
    });
  }
});

// ==================== CREATE EFFECT (Admin/Creator) ====================
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      description,
      category,
      iconUrl,
      previewUrl,
      thumbnailUrl,
      effectUrl,
      isPremium,
      isFeatured,
      tags,
    } = req.body;

    const effect = new Effect({
      name,
      description: description || '',
      category: category || 'filter',
      iconUrl,
      previewUrl: previewUrl || '',
      thumbnailUrl: thumbnailUrl || '',
      effectUrl: effectUrl || '',
      isPremium: isPremium || false,
      isFeatured: isFeatured || false,
      creator: userId,
      tags: tags || [],
    });

    await effect.save();
    await effect.populate('creator', 'username profile');

    res.status(201).json({
      success: true,
      effect,
      message: 'Effect created successfully',
    });
  } catch (error) {
    console.error('Error creating effect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create effect',
      error: error.message,
    });
  }
});

// ==================== FAVORITE/UNFAVORITE EFFECT ====================
router.post('/:id/favorite', authMiddleware, async (req, res) => {
  try {
    const effectId = req.params.id;
    const userId = req.user._id;

    const effect = await Effect.findById(effectId);

    if (!effect) {
      return res.status(404).json({
        success: false,
        message: 'Effect not found',
      });
    }

    const isFavorited = effect.favorites.includes(userId);

    if (isFavorited) {
      effect.favorites = effect.favorites.filter(id => id.toString() !== userId.toString());
      effect.favoritesCount = Math.max(0, effect.favoritesCount - 1);
    } else {
      effect.favorites.push(userId);
      effect.favoritesCount += 1;
    }

    await effect.save();

    res.json({
      success: true,
      isFavorited: !isFavorited,
      favoritesCount: effect.favoritesCount,
    });
  } catch (error) {
    console.error('Error favoriting effect:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to favorite effect',
      error: error.message,
    });
  }
});

// ==================== GET USER'S FAVORITE EFFECTS ====================
router.get('/user/favorites', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const favoriteEffects = await Effect.find({
      favorites: userId,
      isActive: true,
    })
      .populate('creator', 'username profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      effects: favoriteEffects,
      count: favoriteEffects.length,
    });
  } catch (error) {
    console.error('Error fetching favorite effects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite effects',
      error: error.message,
    });
  }
});

// ==================== SEARCH EFFECTS ====================
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    const effects = await Effect.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
      isActive: true,
    })
      .populate('creator', 'username profile')
      .sort({ usageCount: -1, favoritesCount: -1 })
      .limit(limit);

    res.json({
      success: true,
      effects,
      count: effects.length,
    });
  } catch (error) {
    console.error('Error searching effects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search effects',
      error: error.message,
    });
  }
});

// ==================== GET TRENDING EFFECTS ====================
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const timeRange = req.query.range || '7d'; // 7d, 30d

    let dateFilter = {};
    if (timeRange !== 'all') {
      const now = new Date();
      const days = {
        '7d': 7,
        '30d': 30,
      };
      dateFilter = {
        createdAt: { $gte: new Date(now - days[timeRange] * 24 * 60 * 60 * 1000) },
      };
    }

    const trendingEffects = await Effect.find({
      ...dateFilter,
      isActive: true,
    })
      .populate('creator', 'username profile')
      .sort({ usageCount: -1, favoritesCount: -1 })
      .limit(limit);

    res.json({
      success: true,
      effects: trendingEffects,
      count: trendingEffects.length,
    });
  } catch (error) {
    console.error('Error fetching trending effects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending effects',
      error: error.message,
    });
  }
});

module.exports = router;

