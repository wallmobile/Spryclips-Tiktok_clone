const express = require('express');
const mongoose = require('mongoose');
const Video = require('../models/Video');
const VideoView = require('../models/VideoView');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { sendSuccess } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

/**
 * Optional auth middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('_id').lean();
        if (user) {
          req.user = { _id: user._id };
        }
      } catch (err) {
        // Token invalid or expired - continue without user
        req.user = null;
      }
    }
  } catch (err) {
    // Continue without authentication
    req.user = null;
  }
  next();
};

/**
 * Track video view - Dedicated endpoint for view tracking
 * This ensures views are tracked even if the video retrieval endpoint isn't called
 * 
 * POST /api/video-views/track
 * Body: { videoId: string, watchTime?: number, completionRate?: number }
 * Auth: Optional (works with or without authentication)
 */
router.post('/track', optionalAuth, asyncHandler(async (req, res) => {
  const { videoId, watchTime, completionRate } = req.body;
  
  console.log('📊 [VideoView] Track request received:', {
    videoId,
    watchTime,
    completionRate,
    hasUser: !!req.user,
    userId: req.user?._id || null
  });
  
  // Get user ID if authenticated (optional)
  const userId = req.user?._id || null;
  
  // Get IP address (handle various proxy scenarios)
  // Try multiple sources to get the real IP
  let userIp = 'unknown';
  if (req.ip) {
    userIp = req.ip;
  } else if (req.headers['x-forwarded-for']) {
    userIp = req.headers['x-forwarded-for'].split(',')[0].trim();
  } else if (req.headers['x-real-ip']) {
    userIp = req.headers['x-real-ip'];
  } else if (req.connection?.remoteAddress) {
    userIp = req.connection.remoteAddress;
  } else if (req.socket?.remoteAddress) {
    userIp = req.socket.remoteAddress;
  }
  
  // Remove IPv6 prefix if present
  if (userIp.startsWith('::ffff:')) {
    userIp = userIp.replace('::ffff:', '');
  }
  const userAgent = req.get('user-agent') || '';

  if (!videoId) {
    console.error('❌ [VideoView] Video ID is required');
    throw new AppError('Video ID is required', 400, { code: 'VIDEO_ID_REQUIRED' });
  }

  // Validate video exists
  const video = await Video.findById(videoId);
  if (!video) {
    console.error('❌ [VideoView] Video not found:', videoId);
    throw new AppError('Video not found', 404, { code: 'VIDEO_NOT_FOUND' });
  }
  
  console.log('✅ [VideoView] Video found:', videoId);

  // Prevent duplicate views from same user/IP within 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingView = await VideoView.findOne({
    video: videoId,
    $or: [
      ...(userId ? [{ user: userId }] : []),
      { ipAddress: userIp }
    ],
    createdAt: { $gte: oneDayAgo }
  });

  if (existingView) {
    console.log('⚠️ [VideoView] Duplicate view detected (within 24h), updating watch time');
    // Update existing view with new watch time if provided
    if (watchTime !== undefined && watchTime > 0) {
      existingView.watchTime = Math.max(existingView.watchTime || 0, watchTime);
      if (completionRate !== undefined) {
        existingView.completionRate = Math.max(existingView.completionRate || 0, completionRate);
      }
      await existingView.save();
      console.log('✅ [VideoView] Updated existing view with watch time:', watchTime);
    }
    return sendSuccess(res, { 
      viewCount: video.views,
      isNewView: false,
      message: 'View already tracked today'
    }, 'View tracked (duplicate prevented)');
  }

  // Create new view record
  const videoView = new VideoView({
    video: videoId,
    user: userId || null,
    ipAddress: userIp,
    userAgent: userAgent,
    watchTime: watchTime || 0,
    completionRate: completionRate || 0
  });

  await videoView.save();
  console.log('✅ [VideoView] New view record created:', {
    videoId,
    userId: userId || 'anonymous',
    ipAddress: userIp,
    watchTime: watchTime || 0
  });

  // Increment video view count (watchTime field doesn't exist in Video model, so only increment views)
  await Video.findByIdAndUpdate(videoId, { 
    $inc: { views: 1 }
  });
  console.log('✅ [VideoView] Video view count incremented');

  // Get updated view count
  const updatedVideo = await Video.findById(videoId).select('views').lean();
  
  console.log('✅ [VideoView] View tracking completed:', {
    videoId,
    newViewCount: updatedVideo.views,
    isNewView: true
  });
  
  sendSuccess(res, {
    viewCount: updatedVideo.views,
    isNewView: true,
    message: 'View tracked successfully'
  }, 'View tracked successfully');
}));

/**
 * Get video view statistics
 * GET /api/video-views/stats/:videoId
 */
router.get('/stats/:videoId', asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { startDate, endDate } = req.query;

  if (!videoId) {
    throw new AppError('Video ID is required', 400, { code: 'VIDEO_ID_REQUIRED' });
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new AppError('Video not found', 404, { code: 'VIDEO_NOT_FOUND' });
  }

  const query = { video: videoId };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [totalViews, uniqueViews, avgWatchTime, viewsByDate] = await Promise.all([
    VideoView.countDocuments(query),
    VideoView.distinct('user', query).then(users => users.filter(u => u !== null).length),
    VideoView.aggregate([
      { $match: query },
      { $group: { _id: null, avgWatchTime: { $avg: '$watchTime' } } }
    ]),
    VideoView.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  sendSuccess(res, {
    totalViews,
    uniqueViews: uniqueViews || 0,
    avgWatchTime: avgWatchTime[0]?.avgWatchTime || 0,
    viewsByDate: viewsByDate.map(v => ({ date: v._id, count: v.count })),
    videoViews: video.views
  }, 'View statistics retrieved successfully');
}));

/**
 * Get user's view history
 * GET /api/video-views/history
 */
router.get('/history', asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, { code: 'AUTH_REQUIRED' });
  }

  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [views, total] = await Promise.all([
    VideoView.find({ user: userId })
      .populate('video', 'url thumbnail description user')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    VideoView.countDocuments({ user: userId })
  ]);

  sendSuccess(res, {
    views,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, 'View history retrieved successfully');
}));

module.exports = router;

