const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== GET TOP PERFORMING VIDEOS ====================
// IMPORTANT: This must come BEFORE /videos/:videoId to avoid route conflicts
router.get('/videos/top', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'views'; // views, likes, engagement

    // Get user's videos
    const videos = await Video.find({ user: userId, status: 'ready' })
      .select('url thumbnail description createdAt')
      .lean();

    if (!videos || videos.length === 0) {
      return res.json({
        success: true,
        topVideos: []
      });
    }

    const videoIds = videos.map(v => v._id);
    
    // Get analytics for these videos
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } }).lean();

    const analyticsMap = {};
    allAnalytics.forEach(analytics => {
      analyticsMap[analytics.video.toString()] = analytics;
    });

    // Combine video info with analytics
    const topVideos = videos.map(video => {
      const analytics = analyticsMap[video._id.toString()] || {};
      const views = analytics.totalViews || 0;
      const likes = analytics.totalLikes || 0;
      const comments = analytics.totalComments || 0;
      const shares = analytics.totalShares || 0;
      
      const engagementRate = views > 0
        ? ((likes + comments + shares) / views) * 100
        : 0;

      return {
        video: {
          _id: video._id,
          url: video.url,
          thumbnail: video.thumbnail,
          description: video.description,
          createdAt: video.createdAt
        },
        metrics: {
          views: views,
          likes: likes,
          comments: comments,
          shares: shares,
          engagementRate: parseFloat(engagementRate.toFixed(2))
        }
      };
    });

    // Sort by requested metric
    topVideos.sort((a, b) => {
      if (sortBy === 'engagement') {
        return b.metrics.engagementRate - a.metrics.engagementRate;
      }
      return (b.metrics[sortBy] || 0) - (a.metrics[sortBy] || 0);
    });

    // Return top N videos
    res.json({
      success: true,
      topVideos: topVideos.slice(0, limit)
    });
  } catch (error) {
    console.error('Error fetching top videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top videos',
      error: error.message
    });
  }
});

// ==================== GET VIDEO ANALYTICS ====================
router.get('/videos/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId).populate('user');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if user owns the video
    if (video.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view analytics'
      });
    }

    // Get or create analytics
    let analytics = await Analytics.findOne({ video: videoId });
    
    if (!analytics) {
      analytics = new Analytics({
        video: videoId,
        views: video.views || 0,
        likes: video.likes || 0,
        comments: video.comments || 0,
        shares: video.shares || 0
      });
      await analytics.save();
    }

    // Calculate engagement rate
    const engagementRate = analytics.views > 0
      ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.views) * 100
      : 0;

    // Calculate completion rate
    const completionRate = analytics.views > 0 && analytics.averageWatchTime > 0
      ? (analytics.averageWatchTime / (video.duration || 30)) * 100
      : 0;

    res.json({
      success: true,
      analytics: {
        ...analytics.toObject(),
        engagementRate: engagementRate.toFixed(2),
        completionRate: completionRate.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching video analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video analytics',
      error: error.message
    });
  }
});

// ==================== GET VIDEO ANALYTICS SUMMARY ====================
router.get('/videos/:videoId/summary', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);

    if (!video || video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const analytics = await Analytics.findOne({ video: videoId });
    
    if (!analytics) {
      return res.json({
        success: true,
        summary: {
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          engagementRate: 0,
          completionRate: 0
        }
      });
    }

    const engagementRate = analytics.views > 0
      ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.views) * 100
      : 0;

    res.json({
      success: true,
      summary: {
        views: analytics.views,
        uniqueViews: analytics.uniqueViews,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        watchTime: analytics.watchTime,
        averageWatchTime: analytics.averageWatchTime,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        completionRate: parseFloat(analytics.completionRate.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching video summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
});

// ==================== GET VIDEO ENGAGEMENT METRICS ====================
router.get('/videos/:videoId/engagement', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);

    if (!video || video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const analytics = await Analytics.findOne({ video: videoId });

    if (!analytics) {
      return res.json({
        success: true,
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          engagementRate: 0
        }
      });
    }

    const totalEngagements = analytics.likes + analytics.comments + analytics.shares;
    const engagementRate = analytics.views > 0
      ? (totalEngagements / analytics.views) * 100
      : 0;

    res.json({
      success: true,
      engagement: {
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        totalEngagements: totalEngagements
      }
    });
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engagement metrics',
      error: error.message
    });
  }
});

// ==================== GET VIDEO DEMOGRAPHICS ====================
router.get('/videos/:videoId/demographics', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);

    if (!video || video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const analytics = await Analytics.findOne({ video: videoId });

    if (!analytics || !analytics.demographics) {
      return res.json({
        success: true,
        demographics: {
          age: {},
          gender: {},
          location: {}
        }
      });
    }

    res.json({
      success: true,
      demographics: analytics.demographics
    });
  } catch (error) {
    console.error('Error fetching demographics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demographics',
      error: error.message
    });
  }
});

// ==================== GET CREATOR ANALYTICS OVERVIEW ====================
router.get('/creator', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const videos = await Video.find({ user: userId });

    // Get all analytics for user's videos
    const videoIds = videos.map(v => v._id);
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } });

    // Calculate totals
    const totals = {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalWatchTime: 0,
      totalVideos: videos.length
    };

    allAnalytics.forEach(analytics => {
      totals.totalViews += analytics.views || 0;
      totals.totalLikes += analytics.likes || 0;
      totals.totalComments += analytics.comments || 0;
      totals.totalShares += analytics.shares || 0;
      totals.totalWatchTime += analytics.watchTime || 0;
    });

    // Calculate average engagement rate
    const totalEngagements = totals.totalLikes + totals.totalComments + totals.totalShares;
    const avgEngagementRate = totals.totalViews > 0
      ? (totalEngagements / totals.totalViews) * 100
      : 0;

    res.json({
      success: true,
      overview: {
        ...totals,
        averageEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
        averageViewsPerVideo: totals.totalVideos > 0
          ? Math.round(totals.totalViews / totals.totalVideos)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching creator analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch creator analytics',
      error: error.message
    });
  }
});

// ==================== GET CREATOR ANALYTICS SUMMARY ====================
router.get('/creator/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const videos = await Video.find({ user: userId });
    const videoIds = videos.map(v => v._id);
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } });

    const summary = {
      profile: {
        followers: user.profile?.followers || 0,
        following: user.profile?.following || 0,
        totalVideos: videos.length
      },
      content: {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0
      },
      engagement: {
        totalEngagements: 0,
        engagementRate: 0
      }
    };

    allAnalytics.forEach(analytics => {
      summary.content.totalViews += analytics.views || 0;
      summary.content.totalLikes += analytics.likes || 0;
      summary.content.totalComments += analytics.comments || 0;
      summary.content.totalShares += analytics.shares || 0;
    });

    summary.engagement.totalEngagements = 
      summary.content.totalLikes + 
      summary.content.totalComments + 
      summary.content.totalShares;

    summary.engagement.engagementRate = summary.content.totalViews > 0
      ? (summary.engagement.totalEngagements / summary.content.totalViews) * 100
      : 0;

    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Error fetching creator summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch creator summary',
      error: error.message
    });
  }
});

// ==================== GET ALL VIDEOS ANALYTICS ====================
router.get('/videos', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const videos = await Video.find({ user: userId })
      .sort({ createdAt: -1 })
      .select('url thumbnail description views likes comments shares createdAt');

    const videoIds = videos.map(v => v._id);
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } });

    const analyticsMap = {};
    allAnalytics.forEach(analytics => {
      analyticsMap[analytics.video.toString()] = analytics;
    });

    const videosWithAnalytics = videos.map(video => {
      const analytics = analyticsMap[video._id.toString()] || {};
      const engagementRate = video.views > 0
        ? ((video.likes + video.comments + video.shares) / video.views) * 100
        : 0;

      return {
        video: {
          _id: video._id,
          url: video.url,
          thumbnail: video.thumbnail,
          description: video.description,
          createdAt: video.createdAt
        },
        metrics: {
          views: analytics.views || video.views || 0,
          likes: analytics.likes || video.likes || 0,
          comments: analytics.comments || video.comments || 0,
          shares: analytics.shares || video.shares || 0,
          engagementRate: parseFloat(engagementRate.toFixed(2)),
          watchTime: analytics.watchTime || 0
        }
      };
    });

    res.json({
      success: true,
      videos: videosWithAnalytics
    });
  } catch (error) {
    console.error('Error fetching all videos analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos analytics',
      error: error.message
    });
  }
});

// ==================== GET AUDIENCE OVERVIEW ====================
router.get('/audience', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // Aggregate demographics from all videos
    const videos = await Video.find({ user: userId });
    const videoIds = videos.map(v => v._id);
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } });

    const aggregatedDemographics = {
      age: {
        '13-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45+': 0
      },
      gender: {
        male: 0,
        female: 0,
        other: 0
      },
      location: {}
    };

    allAnalytics.forEach(analytics => {
      if (analytics.demographics) {
        // Aggregate age
        Object.keys(aggregatedDemographics.age).forEach(ageGroup => {
          aggregatedDemographics.age[ageGroup] += 
            analytics.demographics.age?.[ageGroup] || 0;
        });

        // Aggregate gender
        Object.keys(aggregatedDemographics.gender).forEach(gender => {
          aggregatedDemographics.gender[gender] += 
            analytics.demographics.gender?.[gender] || 0;
        });

        // Aggregate location
        if (analytics.demographics.location) {
          analytics.demographics.location.forEach((count, location) => {
            aggregatedDemographics.location[location] = 
              (aggregatedDemographics.location[location] || 0) + count;
          });
        }
      }
    });

    res.json({
      success: true,
      audience: {
        followers: user.profile?.followers || 0,
        demographics: aggregatedDemographics
      }
    });
  } catch (error) {
    console.error('Error fetching audience overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audience overview',
      error: error.message
    });
  }
});

// ==================== GET AUDIENCE GROWTH ====================
router.get('/audience/growth', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    // This would typically track follower growth over time
    // For now, return current follower count
    res.json({
      success: true,
      growth: {
        currentFollowers: user.profile?.followers || 0,
        growthRate: 0, // Would calculate from historical data
        growthData: [] // Would contain daily/weekly growth data
      }
    });
  } catch (error) {
    console.error('Error fetching audience growth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audience growth',
      error: error.message
    });
  }
});

// ==================== GET AUDIENCE DEMOGRAPHICS ====================
router.get('/audience/demographics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const videos = await Video.find({ user: userId });
    const videoIds = videos.map(v => v._id);
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } });

    const demographics = {
      age: {},
      gender: {},
      location: {}
    };

    allAnalytics.forEach(analytics => {
      if (analytics.demographics) {
        // Merge age data
        Object.keys(analytics.demographics.age || {}).forEach(ageGroup => {
          demographics.age[ageGroup] = 
            (demographics.age[ageGroup] || 0) + analytics.demographics.age[ageGroup];
        });

        // Merge gender data
        Object.keys(analytics.demographics.gender || {}).forEach(gender => {
          demographics.gender[gender] = 
            (demographics.gender[gender] || 0) + analytics.demographics.gender[gender];
        });

        // Merge location data
        if (analytics.demographics.location) {
          analytics.demographics.location.forEach((count, location) => {
            demographics.location[location] = 
              (demographics.location[location] || 0) + count;
          });
        }
      }
    });

    res.json({
      success: true,
      demographics: demographics
    });
  } catch (error) {
    console.error('Error fetching audience demographics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audience demographics',
      error: error.message
    });
  }
});

// ==================== GET AUDIENCE ACTIVITY ====================
router.get('/audience/activity', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const videos = await Video.find({ user: userId });
    const videoIds = videos.map(v => v._id);
    const allAnalytics = await Analytics.find({ video: { $in: videoIds } });

    // Aggregate hourly activity
    const hourlyActivity = {};
    allAnalytics.forEach(analytics => {
      if (analytics.hourlyViews) {
        analytics.hourlyViews.forEach((count, hour) => {
          hourlyActivity[hour] = (hourlyActivity[hour] || 0) + count;
        });
      }
    });

    res.json({
      success: true,
      activity: {
        hourly: hourlyActivity,
        daily: {} // Would contain daily activity data
      }
    });
  } catch (error) {
    console.error('Error fetching audience activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audience activity',
      error: error.message
    });
  }
});

module.exports = router;

