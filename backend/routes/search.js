const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const Sound = require('../models/Sound');
const SearchHistory = require('../models/SearchHistory');
const authMiddleware = require('../middleware/auth');
const { cache, cacheKeys } = require('../utils/cache');
const router = express.Router();

// ==================== HELPER FUNCTIONS ====================
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num?.toString() || '0';
}

// ==================== GET TRENDING SEARCHES ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const timeRange = req.query.range || '24h'; // 24h, 7d, 30d

    let dateFilter = {};
    const now = new Date();
    switch (timeRange) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
    }

    // Get trending searches from search history
    const trendingSearches = await SearchHistory.aggregate([
      { $match: dateFilter },
      { $group: {
          _id: '$query',
          count: { $sum: 1 },
          searchType: { $first: '$searchType' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    // Get trending hashtags
    const trendingHashtags = await Video.aggregate([
      { $match: { status: 'ready', isPrivate: false, ...dateFilter } },
      { $unwind: '$hashtags' },
      { $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' }
        }
      },
      { $sort: { count: -1, totalViews: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      trending: {
        searches: trendingSearches.map(item => ({
          query: item._id,
          count: item.count,
          type: item.searchType
        })),
        hashtags: trendingHashtags.map(item => ({
          tag: item._id,
          count: item.count,
          views: item.totalViews,
          likes: item.totalLikes
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending searches',
      error: error.message
    });
  }
});

// ==================== GET SEARCH HISTORY ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const history = await SearchHistory.find({
      user: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('query searchType resultsCount createdAt')
      .lean();

    res.json({
      success: true,
      history: history
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search history',
      error: error.message
    });
  }
});

// ==================== CLEAR SEARCH HISTORY ====================
router.delete('/history', authMiddleware, async (req, res) => {
  try {
    await SearchHistory.deleteMany({
      user: req.user._id
    });

    res.json({
      success: true,
      message: 'Search history cleared'
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear search history',
      error: error.message
    });
  }
});

// ==================== DELETE SEARCH HISTORY ITEM ====================
router.delete('/history/:searchId', authMiddleware, async (req, res) => {
  try {
    const searchHistory = await SearchHistory.findOne({
      _id: req.params.searchId,
      user: req.user._id
    });

    if (!searchHistory) {
      return res.status(404).json({
        success: false,
        message: 'Search history item not found'
      });
    }

    await SearchHistory.findByIdAndDelete(req.params.searchId);

    res.json({
      success: true,
      message: 'Search history item deleted'
    });
  } catch (error) {
    console.error('Error deleting search history item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete search history item',
      error: error.message
    });
  }
});

// ==================== GET SEARCH SUGGESTIONS ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/suggestions/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.length < 1) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    // Get suggestions from search history
    const historySuggestions = await SearchHistory.find({
      query: { $regex: `^${query}`, $options: 'i' }
    })
      .distinct('query')
      .limit(limit);

    // Get hashtag suggestions
    const hashtagSuggestions = await Video.distinct('hashtags', {
      hashtags: { $in: [new RegExp(`^${query}`, 'i')] }
    }).limit(limit);

    // Get user suggestions
    const userSuggestions = await User.find({
      username: { $regex: `^${query}`, $options: 'i' }
    })
      .select('username profile.displayName')
      .limit(limit)
      .lean();

    const suggestions = [
      ...historySuggestions.map(q => ({ type: 'search', value: q })),
      ...hashtagSuggestions.map(tag => ({ type: 'hashtag', value: `#${tag}` })),
      ...userSuggestions.map(user => ({ type: 'user', value: `@${user.username}` }))
    ].slice(0, limit);

    res.json({
      success: true,
      query: query,
      suggestions: suggestions
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions',
      error: error.message
    });
  }
});

// ==================== SEARCH VIDEOS ONLY ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/videos/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'relevance'; // relevance, views, likes, newest

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    let sortQuery = {};
    switch (sortBy) {
      case 'views':
        sortQuery = { views: -1 };
        break;
      case 'likes':
        sortQuery = { likes: -1 };
        break;
      case 'newest':
        sortQuery = { createdAt: -1 };
        break;
      default:
        sortQuery = { views: -1, likes: -1 };
    }

    const videos = await Video.find({
      $or: [
        { description: { $regex: query, $options: 'i' } },
        { hashtags: { $in: [new RegExp(query, 'i')] } }
      ],
      status: 'ready',
      isPrivate: false
    })
      .populate('user', 'username profile.avatar profile.displayName')
      .sort(sortQuery)
      .limit(limit)
      .select('url thumbnail description hashtags likes comments shares views createdAt')
      .lean();

    res.json({
      success: true,
      query: query,
      videos: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({
      success: false,
      message: 'Video search failed',
      error: error.message
    });
  }
});

// ==================== SEARCH USERS ONLY ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/users/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { 'profile.displayName': { $regex: query, $options: 'i' } }
      ]
    })
      .select('username profile.avatar profile.displayName profile.bio profile.followers profile.following profile.isVerified')
      .sort({ 'profile.followers': -1 })
      .limit(limit)
      .lean();

    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      displayName: user.profile?.displayName || user.username,
      avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=ff0050&color=fff`,
      bio: user.profile?.bio || '',
      followers: user.profile?.followers || 0,
      following: user.profile?.following || 0,
      isVerified: user.profile?.isVerified || false
    }));

    res.json({
      success: true,
      query: query,
      users: formattedUsers,
      count: formattedUsers.length
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'User search failed',
      error: error.message
    });
  }
});

// ==================== SEARCH HASHTAGS ONLY ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/hashtags/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Hashtag query required'
      });
    }

    const videos = await Video.find({
      hashtags: { $in: [new RegExp(query, 'i')] },
      status: 'ready',
      isPrivate: false
    })
      .select('hashtags views likes comments shares')
      .lean();

    const hashtagCounts = {};
    videos.forEach(video => {
      video.hashtags?.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          if (!hashtagCounts[tag]) {
            hashtagCounts[tag] = {
              tag: tag,
              count: 0,
              views: 0,
              likes: 0
            };
          }
          hashtagCounts[tag].count += 1;
          hashtagCounts[tag].views += video.views || 0;
          hashtagCounts[tag].likes += video.likes || 0;
        }
      });
    });

    const hashtags = Object.values(hashtagCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    res.json({
      success: true,
      query: query,
      hashtags: hashtags,
      count: hashtags.length
    });
  } catch (error) {
    console.error('Error searching hashtags:', error);
    res.status(500).json({
      success: false,
      message: 'Hashtag search failed',
      error: error.message
    });
  }
});

// ==================== SEARCH MUSIC/SOUNDS ====================
// IMPORTANT: This must come BEFORE /:query route
router.get('/music/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Use existing music search from music.js
    const sounds = await Sound.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      status: 'active'
    })
      .select('name artist coverImage duration genre plays saves usedInVideos')
      .populate('createdBy', 'username profile.avatar')
      .sort({ plays: -1, trendingScore: -1 })
      .limit(limit)
      .lean();

    const formattedSounds = sounds.map(sound => ({
      ...sound,
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays)
    }));

    res.json({
      success: true,
      query: query,
      music: formattedSounds,
      count: formattedSounds.length
    });
  } catch (error) {
    console.error('Error searching music:', error);
    res.status(500).json({
      success: false,
      message: 'Music search failed',
      error: error.message
    });
  }
});

// ==================== GLOBAL SEARCH ====================
// IMPORTANT: This MUST be the LAST route as it catches all patterns
router.get('/:query', async (req, res) => {
  try {
    // Try to get user from token if present (optional auth)
    let userId = null;
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findById(decoded.userId).select('_id');
        if (user) userId = user._id;
      }
    } catch (e) {
      // Token not valid or no token - continue without auth
    }

    const query = decodeURIComponent(req.params.query);
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type || 'all'; // all, videos, users, hashtags, music

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Check cache first
    const cacheKey = cacheKeys.search(`${query}:${type}:${limit}`);
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      return res.json(cachedResults);
    }

    const results = {
      videos: [],
      users: [],
      hashtags: [],
      music: []
    };

    // Search Videos
    if (type === 'all' || type === 'videos') {
      const videos = await Video.find({
        $or: [
          { description: { $regex: query, $options: 'i' } },
          { hashtags: { $in: [new RegExp(query, 'i')] } }
        ],
        status: 'ready',
        isPrivate: false
      })
        .populate('user', 'username profile.avatar profile.displayName profile.followers')
        .sort({ views: -1, likes: -1 })
        .limit(limit)
        .select('url thumbnail description hashtags likes comments shares views createdAt user music category')
        .lean();

      // Ensure absolute URLs for videos
      const ensureAbsoluteUrl = (url) => {
        if (!url || typeof url !== 'string') return '';
        if (/^(https?:|data:|blob:)/i.test(url)) return url;
        const baseUrl = process.env.API_URL || process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : `http://localhost:${process.env.PORT || 5000}`);
        return `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
      };

      results.videos = videos.map(video => ({
        ...video,
        videoUrl: ensureAbsoluteUrl(video.url || video.videoUrl || ''),
        thumbnail: ensureAbsoluteUrl(video.thumbnail || ''),
        _id: video._id,
        id: video._id
      }));
    }

    // Search Users
    if (type === 'all' || type === 'users') {
      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { 'profile.displayName': { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      })
        .select('username profile.avatar profile.displayName profile.bio profile.followers profile.following')
        .limit(limit)
        .lean();

      results.users = users.map(user => ({
        _id: user._id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=ff0050&color=fff`,
        bio: user.profile?.bio || '',
        followers: user.profile?.followers || 0,
        following: user.profile?.following || 0
      }));
    }

    // Search Hashtags
    if (type === 'all' || type === 'hashtags') {
      const videosWithHashtags = await Video.find({
        hashtags: { $in: [new RegExp(query, 'i')] },
        status: 'ready',
        isPrivate: false
      })
        .select('hashtags')
        .lean();

      const hashtagCounts = {};
      videosWithHashtags.forEach(video => {
        video.hashtags?.forEach(tag => {
          if (tag.toLowerCase().includes(query.toLowerCase())) {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
          }
        });
      });

      results.hashtags = Object.entries(hashtagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }

    // Search Music/Sounds
    if (type === 'all' || type === 'music') {
      const sounds = await Sound.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { artist: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ],
        status: 'active'
      })
        .select('name artist coverImage duration genre plays saves usedInVideos')
        .populate('createdBy', 'username profile.avatar')
        .sort({ plays: -1, trendingScore: -1 })
        .limit(limit)
        .lean();

      results.music = sounds.map(sound => ({
        ...sound,
        formattedDuration: formatDuration(sound.duration),
        plays: formatNumber(sound.plays)
      }));
    }

    // Save search history if user is logged in
    if (userId) {
      const totalResults = results.videos.length + results.users.length + 
                          results.hashtags.length + results.music.length;
      
      await SearchHistory.create({
        user: userId,
        query: query,
        searchType: type,
        resultsCount: totalResults
      });
    }

    const response = {
      success: true,
      query: query,
      type: type,
      results: results,
      counts: {
        videos: results.videos.length,
        users: results.users.length,
        hashtags: results.hashtags.length,
        music: results.music.length
      }
    };

    // Cache results for 5 minutes
    cache.set(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

module.exports = router;
