const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== GET RECOMMENDED VIDEOS ====================
router.get('/videos', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user._id;

    // Get user's preferences
    const user = await User.findById(userId);

    // Get videos user has liked
    const likedVideos = await Video.find({
      _id: { $in: user.likedVideos || [] }
    }).select('hashtags user');

    // Get videos user has watched (from watch history if available)
    const watchedVideos = await Video.find({
      _id: { $in: user.watchLater?.map(w => w.video) || [] }
    }).select('hashtags user');

    // Extract hashtags from liked and watched videos
    const preferredHashtags = [];
    likedVideos.forEach(video => {
      if (video.hashtags) {
        preferredHashtags.push(...video.hashtags);
      }
    });
    watchedVideos.forEach(video => {
      if (video.hashtags) {
        preferredHashtags.push(...video.hashtags);
      }
    });

    // Get creators user follows
    const followingUserIds = user.followedUsers || [];

    // Build recommendation query
    let query = {
      status: 'ready',
      isPrivate: false,
      _id: { $nin: user.likedVideos || [] } // Exclude already liked videos
    };

    // If user has preferences, use them
    if (preferredHashtags.length > 0) {
      query.hashtags = { $in: preferredHashtags };
    }

    // Get recommended videos
    let recommendedVideos = await Video.find(query)
      .populate('user', 'username profile.avatar profile.displayName profile.followers')
      .sort({ views: -1, likes: -1, createdAt: -1 })
      .limit(limit * 2) // Get more to filter
      .select('url thumbnail description hashtags likes comments shares views createdAt user')
      .lean();

    // Score and sort videos
    recommendedVideos = recommendedVideos.map(video => {
      let score = 0;

      // Boost if from followed creators
      if (followingUserIds.includes(video.user._id.toString())) {
        score += 50;
      }

      // Boost if has preferred hashtags
      const matchingHashtags = video.hashtags?.filter(tag =>
        preferredHashtags.includes(tag)
      ).length || 0;
      score += matchingHashtags * 10;

      // Boost by engagement (likes + comments + shares)
      const engagement = (video.likes || 0) + (video.comments || 0) + (video.shares || 0);
      score += engagement / 100;

      // Boost by recency (newer videos get slight boost)
      const daysSinceCreation = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 7) {
        score += 20;
      }

      return {
        ...video,
        recommendationScore: score
      };
    });

    // Sort by recommendation score
    recommendedVideos.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Limit results
    recommendedVideos = recommendedVideos.slice(0, limit);

    res.json({
      success: true,
      videos: recommendedVideos,
      count: recommendedVideos.length
    });
  } catch (error) {
    console.error('Error fetching recommended videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended videos',
      error: error.message
    });
  }
});

// ==================== GET FOR YOU FEED ====================
router.get('/for-you', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user._id;

    // Similar to recommendations but optimized for feed
    const user = await User.findById(userId);

    // Get videos excluding those user has already interacted with
    const excludedVideoIds = [
      ...(user.likedVideos || []),
      ...(user.videos || [])
    ];

    let query = {
      status: 'ready',
      isPrivate: false,
      _id: { $nin: excludedVideoIds }
    };

    // Get trending videos (high engagement)
    const trendingVideos = await Video.find(query)
      .populate('user', 'username profile.avatar profile.displayName profile.followers')
      .sort({
        views: -1,
        likes: -1,
        createdAt: -1
      })
      .limit(limit)
      .select('url thumbnail description hashtags likes comments shares views createdAt user music')
      .lean();

    // Add recommendation scores
    const videosWithScores = trendingVideos.map(video => {
      const engagement = (video.likes || 0) + (video.comments || 0) + (video.shares || 0);
      const engagementRate = video.views > 0 ? (engagement / video.views) * 100 : 0;

      return {
        ...video,
        engagementRate: parseFloat(engagementRate.toFixed(2))
      };
    });

    res.json({
      success: true,
      videos: videosWithScores,
      count: videosWithScores.length
    });
  } catch (error) {
    console.error('Error fetching For You feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch For You feed',
      error: error.message
    });
  }
});

// ==================== GET FOLLOWING FEED ====================
router.get('/following', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const followingUserIds = user.followedUsers || [];

    if (followingUserIds.length === 0) {
      return res.json({
        success: true,
        videos: [],
        count: 0,
        message: 'Follow users to see their videos'
      });
    }

    const videos = await Video.find({
      user: { $in: followingUserIds },
      status: 'ready',
      isPrivate: false
    })
      .populate('user', 'username profile.avatar profile.displayName profile.followers')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('url thumbnail description hashtags likes comments shares views createdAt user music')
      .lean();

    res.json({
      success: true,
      videos: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Error fetching Following feed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Following feed',
      error: error.message
    });
  }
});

// ==================== GET TRENDING VIDEOS ====================
router.get('/trending', async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const timeRange = req.query.range || '24h'; // 24h, 7d, 30d
    const categoryFilter = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : null;
    const contentType = typeof req.query.contentType === 'string' ? req.query.contentType.trim().toLowerCase() : 'video';

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

    const baseQuery = {
      status: 'ready',
      isPrivate: false,
      ...dateFilter
    };

    if (categoryFilter && categoryFilter !== 'all') {
      const categoryRegex = new RegExp(`^${categoryFilter}$`, 'i');
      const hashtagRegex = new RegExp(`#?${categoryFilter}`, 'i');
      baseQuery.$or = [
        { category: categoryFilter },
        { category: categoryRegex },
        { hashtags: { $elemMatch: { $regex: categoryRegex } } },
        { description: { $regex: hashtagRegex } }
      ];
    }

    const videos = await Video.find(baseQuery)
      .populate('user', 'username profile.avatar profile.displayName profile.followers')
      .sort({
        views: -1,
        likes: -1,
        shares: -1
      })
      .limit(limit)
      .select('url thumbnail description hashtags likes comments shares views createdAt user music category')
      .lean();

    // Helper function to ensure absolute URL
    const ensureAbsoluteUrl = (url) => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      // Already absolute
      if (/^(https?:)?\/\//i.test(trimmed)) {
        if (/^\/\//.test(trimmed)) {
          const protocol = process.env.PROTOCOL || 'http:';
          return `${protocol}${trimmed}`;
        }
        return trimmed;
      }
      // Data or blob URL
      if (/^(data:|blob:)/i.test(trimmed)) {
        return trimmed;
      }
      // Make relative URL absolute
      const baseUrl = "https://spryclips.com/";
      //process.env.API_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const normalizedBase = baseUrl.replace(/\/+$/, '');
      const normalizedPath = trimmed.replace(/^\/+/, '');
      return `${normalizedBase}/${normalizedPath}`;
    };

    // Calculate trending score
    const videosWithTrendingScore = videos.map((video) => {
      const engagement = (video.likes || 0) + (video.comments || 0) + (video.shares || 0);
      const trendingScore = (video.views || 0) * 0.3 + engagement * 0.7;

      const rawPlaybackUrl =
        video?.transcoded?.playbackUrl ||
        video?.processedUrl ||
        video?.url ||
        '';
      const playbackUrl = ensureAbsoluteUrl(rawPlaybackUrl);

      const derivedDuration =
        video?.duration ||
        video?.transcoded?.duration ||
        video?.metadata?.duration ||
        (typeof video?.cropSettings?.endTime === 'number' && typeof video?.cropSettings?.startTime === 'number'
          ? Math.max(video.cropSettings.endTime - video.cropSettings.startTime, 0)
          : undefined);

      const rawThumbnail =
        video?.thumbnail ||
        video?.transcoded?.thumbnailUrl ||
        video?.coverImage ||
        '';
      const thumbnail = ensureAbsoluteUrl(rawThumbnail);

      const normalizedCategory =
        typeof video.category === 'string' && video.category.length > 0 ? video.category.toLowerCase() : 'general';

      const normalizedVideo = {
        ...video,
        thumbnail,
        playbackUrl,
        videoUrl: playbackUrl,
        duration: derivedDuration,
        category: normalizedCategory,
        trendingScore: Number.parseFloat(trendingScore.toFixed(2))
      };

      return normalizedVideo;
    });

    res.json({
      success: true,
      videos: videosWithTrendingScore,
      count: videosWithTrendingScore.length,
      timeRange: timeRange
    });
  } catch (error) {
    console.error('Error fetching trending videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending videos',
      error: error.message
    });
  }
});

module.exports = router;

