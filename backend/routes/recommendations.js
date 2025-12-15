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

    // Get active user IDs (exclude suspended/banned users)
    const activeUsers = await User.find({ accountStatus: 'active' }).select('_id').lean();
    const activeUserIds = activeUsers.map(u => u._id);
    
    // Add user filter to exclude suspended/banned users
    const queryWithActiveUsers = {
      ...query,
      user: { $in: activeUserIds }
    };
    
    // Get recommended videos (only from active users) - optimized query
    let recommendedVideos = await Video.find(queryWithActiveUsers)
      .populate('user', 'username profile.avatar profile.displayName accountStatus')
      .select('url thumbnail description hashtags likes comments shares views createdAt user')
      .sort({ views: -1, likes: -1, createdAt: -1 })
      .limit(limit * 2) // Get more to filter
      .lean();
    
    // Double-check: filter out any videos from non-active users
    recommendedVideos = recommendedVideos.filter(video => {
      if (!video.user) return false;
      return video.user.accountStatus === 'active';
    });

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

    // Get active user IDs (exclude suspended/banned users)
    const activeUsers = await User.find({ accountStatus: 'active' }).select('_id').lean();
    const activeUserIds = activeUsers.map(u => u._id);
    
    // Add user filter to exclude suspended/banned users
    const queryWithActiveUsers = {
      ...query,
      user: { $in: activeUserIds }
    };
    
    // Get trending videos (high engagement) - only from active users - optimized query
    const trendingVideos = await Video.find(queryWithActiveUsers)
      .populate('user', 'username profile.avatar profile.displayName accountStatus')
      .select('url thumbnail description hashtags likes comments shares views createdAt user music')
      .sort({ 
        views: -1,
        likes: -1,
        createdAt: -1
      })
      .limit(limit)
      .lean();
    
    // Double-check: filter out any videos from non-active users
    const filteredVideos = trendingVideos.filter(video => {
      if (!video.user) return false;
      return video.user.accountStatus === 'active';
    });

    // Add recommendation scores
    const videosWithScores = filteredVideos.map(video => {
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

    // Get active user IDs (exclude suspended/banned users)
    const activeUsers = await User.find({ accountStatus: 'active' }).select('_id').lean();
    const activeUserIds = activeUsers.map(u => u._id);
    
    // Filter followingUserIds to only include active users
    const activeFollowingUserIds = followingUserIds.filter(id => 
      activeUserIds.some(activeId => activeId.toString() === id.toString())
    );
    
    if (activeFollowingUserIds.length === 0) {
      return res.json({
        success: true,
        videos: [],
        count: 0,
        message: 'Follow users to see their videos'
      });
    }
    
    const videos = await Video.find({
      user: { $in: activeFollowingUserIds },
      status: 'ready',
      isPrivate: false
    })
      .populate('user', 'username profile.avatar profile.displayName _id accountStatus')
      .select('url thumbnail description hashtags likes comments shares views createdAt user music _id')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Double-check: filter out any videos from non-active users
    const filteredVideos = videos.filter(video => {
      if (!video.user) return false;
      return video.user.accountStatus === 'active';
    });

    // Log thumbnail info for debugging
    console.log(`[Following Feed] Found ${filteredVideos.length} videos (after filtering suspended users)`);
    filteredVideos.forEach((video, idx) => {
      console.log(`[Following Feed] Video ${idx + 1}:`, {
        id: video._id,
        hasThumbnail: !!(video.thumbnail && video.thumbnail.trim() !== ''),
        thumbnail: video.thumbnail || 'MISSING',
        url: video.url ? 'EXISTS' : 'MISSING'
      });
    });

    res.json({
      success: true,
      videos: filteredVideos,
      count: filteredVideos.length
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
    const timeRange = req.query.range || null; // null means no date filter, 24h, 7d, 30d
    console.log('[Trending] Request query params:', { 
      range: req.query.range, 
      timeRange, 
      limit: req.query.limit,
      allQuery: req.query 
    });
    const categoryFilter = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : null;
    const contentType = typeof req.query.contentType === 'string' ? req.query.contentType.trim().toLowerCase() : 'video';
    const sortBy = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : null;

    let dateFilter = {};
    // Only apply date filter if timeRange is explicitly provided
    if (timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
        break;
        case '24h':
          dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
          break;
      default:
          // No date filter for 'all' or invalid values
          dateFilter = {};
      }
    }
    // If no timeRange provided, show all videos (no date restriction)

    // Build base query - simplified to show all public videos
    // Only exclude videos that are explicitly private or rejected
    const baseQuery = {
      isPrivate: { $ne: true }, // Include videos where isPrivate is false or doesn't exist
      $or: [
        { moderationStatus: { $in: [null, 'approved', 'pending'] } },
        { moderationStatus: { $exists: false } },
        { moderationStatus: { $ne: 'rejected' } }
      ],
      ...dateFilter
    };
    
    // Don't filter by status - show all videos regardless of status
    // This ensures all uploaded videos appear in Explore page

    if (categoryFilter && categoryFilter !== 'all') {
      // More flexible category matching - case insensitive and partial match
      const categoryLower = categoryFilter.toLowerCase();
      const categoryRegex = new RegExp(categoryLower, 'i');
      const hashtagRegex = new RegExp(`#?${categoryLower}`, 'i');
      
      // Initialize $and if it doesn't exist
      if (!baseQuery.$and) {
        baseQuery.$and = [];
      }
      baseQuery.$and.push({
        $or: [
          { category: categoryLower }, // Exact lowercase match
          { category: { $regex: categoryRegex } }, // Regex match
          { category: categoryFilter }, // Original case match
          { hashtags: { $elemMatch: { $regex: new RegExp(categoryLower, 'i') } } },
          { hashtags: { $in: [categoryLower, categoryFilter] } }, // Direct hashtag match
        { description: { $regex: hashtagRegex } }
        ]
      });
      console.log(`[Trending] Category filter applied: ${categoryFilter} (searching for: ${categoryLower})`);
    }

    // Determine sort order based on sort parameter
    let sortOrder = { 
      views: -1,
      likes: -1,
      shares: -1,
      createdAt: -1
    };
    
    if (sortBy === 'trending') {
      // For trending, we'll calculate score and sort by it after
      sortOrder = {
        views: -1,
        likes: -1,
        shares: -1,
        createdAt: -1
      };
    }

    const videos = await Video.find(baseQuery)
      .populate('user', 'username profile.avatar profile.displayName profile.followers')
      .sort(sortOrder)
      .limit(limit)
      .select('url thumbnail description hashtags likes comments shares views createdAt user music category transcoded processedUrl duration metadata cropSettings status isPrivate moderationStatus')
      .lean();

    console.log(`[Trending Videos] Query params:`, { limit, timeRange, categoryFilter, contentType, sortBy });
    console.log(`[Trending Videos] Base query:`, JSON.stringify(baseQuery, null, 2));
    console.log(`[Trending Videos] Found ${videos.length} videos`);
    if (videos.length > 0) {
      console.log(`[Trending Videos] First video sample:`, {
        id: videos[0]._id,
        description: videos[0].description?.substring(0, 50),
        views: videos[0].views,
        likes: videos[0].likes,
        url: videos[0].url ? 'Yes' : 'No'
      });
    }

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
      const baseUrl = process.env.API_URL || process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : `http://localhost:${process.env.PORT || 5000}`);
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
      timeRange: timeRange || null // Return null if no timeRange was provided
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

