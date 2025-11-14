const express = require('express');
const Video = require('../models/Video');
const router = express.Router();

// ==================== GET TRENDING HASHTAGS ====================
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const timeRange = req.query.range || '24h'; // 24h, 7d, 30d

    let dateFilter = {};
    const now = new Date();
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    if (timeRange !== 'all') {
      dateFilter = {
        createdAt: { $gte: new Date(now - timeRanges[timeRange]) },
      };
    }

    // Aggregate hashtags from videos
    const hashtagStats = await Video.aggregate([
      { $match: { ...dateFilter, status: 'ready', isPrivate: false } },
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' },
          totalShares: { $sum: '$shares' },
          videos: { $push: '$_id' },
        },
      },
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          totalViews: 1,
          totalLikes: 1,
          totalComments: 1,
          totalShares: 1,
          videoCount: { $size: '$videos' },
          engagement: {
            $add: [
              { $multiply: ['$totalLikes', 2] },
              '$totalComments',
              { $multiply: ['$totalShares', 3] },
            ],
          },
        },
      },
      { $sort: { engagement: -1, count: -1 } },
      { $limit: limit },
    ]);

    res.json({
      success: true,
      hashtags: hashtagStats,
      count: hashtagStats.length,
      timeRange,
    });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending hashtags',
      error: error.message,
    });
  }
});

// ==================== GET HASHTAG DETAILS ====================
router.get('/:hashtag', async (req, res) => {
  try {
    const hashtag = req.params.hashtag.replace('#', '');
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const sortBy = req.query.sort || 'newest'; // newest, popular, trending

    // Get videos with this hashtag
    let query = Video.find({
      hashtags: { $in: [new RegExp(`^${hashtag}$`, 'i')] },
      status: 'ready',
      isPrivate: false,
    })
      .populate('user', 'username profile')
      .skip(skip)
      .limit(limit);

    // Sort videos
    switch (sortBy) {
      case 'popular':
        query = query.sort({ likes: -1, views: -1 });
        break;
      case 'trending':
        query = query.sort({ 
          createdAt: -1,
          likes: -1,
          views: -1 
        });
        break;
      case 'newest':
      default:
        query = query.sort({ createdAt: -1 });
        break;
    }

    const videos = await query;

    // Get hashtag statistics
    const stats = await Video.aggregate([
      { $match: { hashtags: { $in: [new RegExp(`^${hashtag}$`, 'i')] }, status: 'ready', isPrivate: false } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' },
          totalShares: { $sum: '$shares' },
        },
      },
    ]);

    const hashtagStats = stats[0] || {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
    };

    res.json({
      success: true,
      hashtag: `#${hashtag}`,
      videos,
      stats: {
        ...hashtagStats,
        engagement: hashtagStats.totalLikes + hashtagStats.totalComments + hashtagStats.totalShares,
      },
      count: videos.length,
    });
  } catch (error) {
    console.error('Error fetching hashtag details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hashtag details',
      error: error.message,
    });
  }
});

// ==================== SEARCH HASHTAGS ====================
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

    // Get distinct hashtags matching the query
    const hashtags = await Video.distinct('hashtags', {
      hashtags: { $in: [new RegExp(query, 'i')] },
      status: 'ready',
      isPrivate: false,
    });

    // Get stats for each hashtag
    const hashtagStats = await Promise.all(
      hashtags.slice(0, limit).map(async (hashtag) => {
        const stats = await Video.aggregate([
          {
            $match: {
              hashtags: { $in: [new RegExp(`^${hashtag}$`, 'i')] },
              status: 'ready',
              isPrivate: false,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalViews: { $sum: '$views' },
              totalLikes: { $sum: '$likes' },
            },
          },
        ]);

        return {
          hashtag: `#${hashtag}`,
          count: stats[0]?.count || 0,
          totalViews: stats[0]?.totalViews || 0,
          totalLikes: stats[0]?.totalLikes || 0,
        };
      })
    );

    res.json({
      success: true,
      hashtags: hashtagStats.sort((a, b) => b.count - a.count),
      count: hashtagStats.length,
    });
  } catch (error) {
    console.error('Error searching hashtags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search hashtags',
      error: error.message,
    });
  }
});

module.exports = router;

