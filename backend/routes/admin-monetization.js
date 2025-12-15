const express = require('express');
const Video = require('../models/Video');
const VideoView = require('../models/VideoView');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Earning = require('../models/Earning');
const authMiddleware = require('../middleware/auth');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { sendSuccess } = require('../utils/responseHandler');
const router = express.Router();

/**
 * Admin Monetization Routes
 * Uses VideoView model for accurate view tracking instead of video.views
 * This ensures monetization works even if regular view counting has issues
 */

// Apply auth middleware to all routes
router.use(authMiddleware);

// Check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

router.use(checkAdmin);

/**
 * Calculate earnings based on tracked views (VideoView model)
 * GET /api/admin/monetization/calculate-earnings
 */
router.get('/calculate-earnings', asyncHandler(async (req, res) => {
  const { userId, startDate, endDate, videoId } = req.query;
  
  let query = {};
  if (userId) {
    // Get user's videos
    const videos = await Video.find({ user: userId }).select('_id').lean();
    query.video = { $in: videos.map(v => v._id) };
  }
  if (videoId) {
    query.video = videoId;
  }
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Get tracked views from VideoView model (accurate)
  const trackedViews = await VideoView.countDocuments(query);
  
  // Get video.views for comparison (may be inaccurate)
  let videoViews = 0;
  if (userId) {
    const videos = await Video.find({ user: userId }).select('views').lean();
    videoViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
  } else if (videoId) {
    const video = await Video.findById(videoId).select('views').lean();
    videoViews = video?.views || 0;
  }

  // Calculate earnings based on tracked views
  // CPM: $2 per 1000 views (configurable)
  const CPM = 2;
  const earnings = (trackedViews / 1000) * CPM;
  
  // Calculate using video.views for comparison
  const earningsFromVideoViews = (videoViews / 1000) * CPM;
  const discrepancy = earnings - earningsFromVideoViews;

  sendSuccess(res, {
    trackedViews: trackedViews,
    videoViews: videoViews,
    discrepancy: discrepancy,
    earnings: {
      basedOnTrackedViews: earnings,
      basedOnVideoViews: earningsFromVideoViews,
      difference: discrepancy
    },
    cpm: CPM,
    message: trackedViews > videoViews 
      ? `Tracked views (${trackedViews}) are higher than video.views (${videoViews}). Using tracked views for accurate monetization.`
      : `Tracked views (${trackedViews}) match video.views (${videoViews}).`
  }, 'Earnings calculated successfully');
}));

/**
 * Get monetization statistics for admin dashboard
 * GET /api/admin/monetization/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Get total tracked views
  const totalTrackedViews = await VideoView.countDocuments(dateFilter);
  
  // Get total video.views for comparison
  const videos = await Video.find(dateFilter.createdAt ? {
    createdAt: dateFilter.createdAt
  } : {}).select('views').lean();
  const totalVideoViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);

  // Get unique viewers
  const uniqueViewers = await VideoView.distinct('user', dateFilter).then(
    users => users.filter(u => u !== null).length
  );

  // Get views by date
  const viewsByDate = await VideoView.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Calculate potential earnings
  const CPM = 2;
  const potentialEarnings = (totalTrackedViews / 1000) * CPM;

  sendSuccess(res, {
    totalTrackedViews,
    totalVideoViews,
    discrepancy: totalTrackedViews - totalVideoViews,
    uniqueViewers,
    viewsByDate: viewsByDate.map(v => ({ date: v._id, count: v.count })),
    potentialEarnings: {
      amount: potentialEarnings,
      cpm: CPM,
      basedOn: 'trackedViews'
    },
    recommendation: totalTrackedViews !== totalVideoViews
      ? 'Use tracked views (VideoView model) for accurate monetization calculations.'
      : 'View counts are consistent. Both methods can be used.'
  }, 'Monetization statistics retrieved successfully');
}));

/**
 * Sync video.views with tracked views (VideoView)
 * POST /api/admin/monetization/sync-views
 */
router.post('/sync-views', asyncHandler(async (req, res) => {
  const { videoId, userId } = req.body;
  
  let query = {};
  if (videoId) {
    query.video = videoId;
  } else if (userId) {
    const videos = await Video.find({ user: userId }).select('_id').lean();
    query.video = { $in: videos.map(v => v._id) };
  } else {
    throw new AppError('Either videoId or userId is required', 400, { code: 'ID_REQUIRED' });
  }

  // Get tracked view counts
  const trackedCounts = await VideoView.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$video',
        count: { $sum: 1 }
      }
    }
  ]);

  // Update video.views with tracked counts
  const updatePromises = trackedCounts.map(async (item) => {
    await Video.findByIdAndUpdate(item._id, { views: item.count });
  });

  await Promise.all(updatePromises);

  sendSuccess(res, {
    updated: trackedCounts.length,
    message: `Synced ${trackedCounts.length} video(s) with tracked view counts`
  }, 'Views synced successfully');
}));

module.exports = router;

