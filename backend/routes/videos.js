const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const { cache, cacheKeys } = require('../utils/cache');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { ensureAbsoluteUrl } = require('../utils/urlHelpers');
const router = express.Router();

// Helper function to create notification
const createNotification = async (data) => {
  try {
    // Don't create notification if user is notifying themselves
    if (data.userId.toString() === data.relatedUserId?.toString()) return;
    
    const notification = new Notification({
      user: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedUser: data.relatedUserId || null,
      relatedVideo: data.relatedVideoId || null,
      relatedComment: data.relatedCommentId || null,
      metadata: data.metadata || {}
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

const ensureObjectId = (id, label, code) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${label} ID`, 400, { code });
  }
};

// Get all videos with pagination and caching
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;
  const sortBy = req.query.sort || 'createdAt';
  const sortOrder = req.query.order === 'asc' ? 1 : -1;

  const cacheKey = cacheKeys.videoList({ page, limit, sortBy, sortOrder });

  // Cache will auto-expire after TTL - no need to manually invalidate

  // Filter to only show videos from spryclips server
  // Exclude videos with external URLs (YouTube, Vimeo, etc.)
  // Allow: spryclips.com, localhost, and relative paths
  // Also allow: Google sample bucket URLs used by our seeded sample data
  // IMPORTANT: Exclude videos from suspended or banned users
  const videoQuery = {
    status: 'ready',
    isPrivate: false,
    $or: [
      // Videos from spryclips.com
      { url: { $regex: /spryclips\.com/i } },
      // Videos from localhost (development)
      { url: { $regex: /localhost|127\.0\.0\.1/i } },
      // Seeded sample videos (Google Cloud Storage public bucket)
      { url: { $regex: /commondatastorage\.googleapis\.com/i } },
      // Relative paths (uploads/, processed/)
      { url: { $regex: /^(uploads|processed)\// } },
      // Videos without http/https (relative paths)
      { url: { $not: { $regex: /^https?:\/\//i } } }
    ]
  };
  
  // Exclude videos from suspended or banned users
  // We'll filter this in the populate or after query

  const videos = await cache.getOrSet(
    cacheKey,
    async () => {
      // Get active user IDs first
      const activeUsers = await User.find({ accountStatus: 'active' }).select('_id').lean();
      const activeUserIds = activeUsers.map(u => u._id);
      
      // Add user filter to exclude suspended/banned users
      const queryWithUserFilter = {
        ...videoQuery,
        user: { $in: activeUserIds }
      };
      
      const allVideos = await Video.find(queryWithUserFilter)
        .populate('user', 'username profile.avatar profile.displayName accountStatus')
        // Include music and metadata so frontend can show uploaded music info
        .select('url thumbnail description hashtags likes comments shares views createdAt user status isPrivate music metadata song')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip)
        .lean();
      
      // Double-check: filter out any videos from non-active users (safety check)
      return allVideos.filter(video => {
        if (!video.user) return false;
        return video.user.accountStatus === 'active';
      });
    },
    300 // Increased cache time to 5 minutes for better performance
  );

  // Normalize URLs to absolute paths for thumbnails and video URLs
  const normalizedVideos = videos.map(video => {
    return {
      ...video,
      url: ensureAbsoluteUrl(video.url || ''),
      thumbnail: ensureAbsoluteUrl(video.thumbnail || '')
    };
  });

  // Enrich videos with effect details when available
  try {
    const allEffectIds = Array.from(new Set(normalizedVideos.flatMap(v => (v.effects || []).filter(Boolean))));
    if (allEffectIds.length > 0) {
      const Effect = require('../models/Effect');
      const effectDocs = await Effect.find({ _id: { $in: allEffectIds } }).lean();
      const effectMap = {};
      effectDocs.forEach(e => { effectMap[e._id.toString()] = e; });
      normalizedVideos.forEach(v => {
        if (Array.isArray(v.effects) && v.effects.length > 0) {
          // attach first effect as `effect` for UI compatibility, and full list as `effectsDetailed`
          const first = v.effects[0];
          v.effect = effectMap[first] || null;
          v.effectsDetailed = v.effects.map(id => effectMap[id] || id);
        } else {
          v.effect = null;
          v.effectsDetailed = [];
        }
      });
    }
  } catch (err) {
    console.warn('Could not enrich videos with effect details:', err?.message || err);
  }

  // Count only videos from active users - use same query pattern
  const activeUsersForCount = await User.find({ accountStatus: 'active' })
    .select('_id')
    .lean()
    .limit(10000); // Safety limit
  const activeUserIdsForCount = activeUsersForCount.map(u => u._id);
  const countQuery = {
    ...videoQuery,
    user: { $in: activeUserIdsForCount }
  };
  const total = await Video.countDocuments(countQuery);

  sendPaginated(res, normalizedVideos, { page, limit, total }, 'Videos retrieved successfully');
}));

// Get video by ID with caching
router.get('/:id', asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

  const cacheKey = cacheKeys.video(videoId);

  const video = await cache.getOrSet(
    cacheKey,
    async () =>
      Video.findById(videoId)
        .populate('user', 'username profile')
        .lean(),
    600
  ); // Cache for 10 minutes

  if (!video) {
    throw new AppError('Video not found', 404, { code: 'VIDEO_NOT_FOUND' });
  }

  // Normalize URLs to absolute paths
  const normalizedVideo = {
    ...video,
    url: ensureAbsoluteUrl(video.url || ''),
    thumbnail: ensureAbsoluteUrl(video.thumbnail || '')
  };

  // Attach effect details if video has effect IDs
  try {
    const Effect = require('../models/Effect');
    if (Array.isArray(video.effects) && video.effects.length > 0) {
      const effectDocs = await Effect.find({ _id: { $in: video.effects } }).lean();
      const effectMap = {};
      effectDocs.forEach(e => { effectMap[e._id.toString()] = e; });
      const first = video.effects[0];
      normalizedVideo.effect = effectMap[first] || null;
      normalizedVideo.effectsDetailed = video.effects.map(id => effectMap[id] || id);
    } else {
      normalizedVideo.effect = null;
      normalizedVideo.effectsDetailed = [];
    }
  } catch (err) {
    console.warn('Could not attach effect details to video:', err?.message || err);
  }

  // Increment views (async, don't wait)
  Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).exec();

  // Invalidate cache after view increment
  cache.delete(cacheKey);

  sendSuccess(res, normalizedVideo, 'Video retrieved successfully');
}));

// Like/Unlike video
router.post(
  '/:id/like',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const videoId = req.params.id;
    ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

    const video = await Video.findById(videoId).populate('user', 'username');
    if (!video) {
      throw new AppError('Video not found', 404, { code: 'VIDEO_NOT_FOUND' });
    }

    const userId = req.user._id.toString();
    const isLiked = video.likedBy.some((id) => id.toString() === userId);

    if (isLiked) {
      video.likedBy = video.likedBy.filter((id) => id.toString() !== userId);
      video.likes = Math.max(0, video.likes - 1);
    } else {
      video.likedBy.push(req.user._id);
      video.likes += 1;
      
      // Create notification for video owner (only for likes, not unlikes)
      if (video.user && video.user._id.toString() !== userId) {
        const likerUser = await User.findById(req.user._id).select('username');
        await createNotification({
          userId: video.user._id,
          type: 'likes',
          title: 'New Like',
          message: `${likerUser?.username || 'Someone'} liked your video`,
          relatedUserId: req.user._id,
          relatedVideoId: video._id,
          metadata: { videoTitle: video.description?.substring(0, 50) }
        });
      }
    }

    await video.save();
    sendSuccess(res, { isLiked: !isLiked, likes: video.likes }, 'Video like state updated');
  })
);

// Get video comments with caching
router.get('/:id/comments', asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

  const cacheKey = cacheKeys.comments(videoId);

  const comments = await cache.getOrSet(
    cacheKey,
    async () =>
      Comment.find({ video: videoId, parentComment: null })
        .populate('user', 'username profile')
        .populate({
          path: 'replies',
          populate: {
            path: 'user',
            select: 'username profile'
          }
        })
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(50)
        .lean(),
    300
  ); // Cache for 5 minutes

  sendSuccess(res, comments, 'Comments retrieved successfully');
}));

// Pin/Unpin comment
router.post('/comments/:commentId/pin', authMiddleware, asyncHandler(async (req, res) => {
  const commentId = req.params.commentId;
  ensureObjectId(commentId, 'comment', 'COMMENT_INVALID_ID');

  const comment = await Comment.findById(commentId).populate('video');
  if (!comment) {
    throw new AppError('Comment not found', 404, true, { code: 'COMMENT_NOT_FOUND' });
  }

  if (!comment.video || !comment.video.user) {
    throw new AppError('Video context unavailable for comment', 409, true, { code: 'COMMENT_MISSING_VIDEO' });
  }

  if (comment.video.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to pin this comment', 403, true, { code: 'COMMENT_PIN_FORBIDDEN' });
  }

  comment.isPinned = !comment.isPinned;
  await comment.save();

  sendSuccess(res, { isPinned: comment.isPinned }, 'Comment pin state updated');
}));

// Delete comment
router.delete('/comments/:commentId', authMiddleware, asyncHandler(async (req, res) => {
  const commentId = req.params.commentId;
  ensureObjectId(commentId, 'comment', 'COMMENT_INVALID_ID');

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new AppError('Comment not found', 404, true, { code: 'COMMENT_NOT_FOUND' });
  }

  const video = await Video.findById(comment.video);
  if (!video) {
    throw new AppError('Parent video not found', 404, true, { code: 'VIDEO_NOT_FOUND' });
  }

  const requesterId = req.user?._id?.toString();
  if (!requesterId) {
    throw new AppError('User context missing', 401, true, { code: 'AUTH_CONTEXT_MISSING' });
  }

  const canDelete =
    comment.user?.toString() === requesterId ||
    video.user?.toString() === requesterId;

  if (!canDelete) {
    throw new AppError('Not authorized to delete this comment', 403, true, { code: 'COMMENT_DELETE_FORBIDDEN' });
  }

  const currentCommentCount = Number.isFinite(Number(video.comments)) ? Number(video.comments) : 0;
  video.comments = Math.max(0, currentCommentCount - 1);
  await video.save();

  await Comment.deleteMany({
    $or: [{ _id: comment._id }, { parentComment: comment._id }]
  });

  sendSuccess(res, null, 'Comment deleted successfully');
}));

// Share video (increment share count)
router.post('/:id/share', asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

  const video = await Video.findById(videoId);
  if (!video) {
    throw new AppError('Video not found', 404, true, { code: 'VIDEO_NOT_FOUND' });
  }

  video.shares = Math.max(0, (video.shares ?? 0) + 1);
  await video.save();

  sendSuccess(res, { shares: video.shares }, 'Video share count updated');
}));

// Get video embed code
router.get('/:id/embed', asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

  const video = await Video.findById(videoId)
    .populate('user', 'username profile')
    .lean();

  if (!video) {
    throw new AppError('Video not found', 404, true, { code: 'VIDEO_NOT_FOUND' });
  }

  const frontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : 'http://localhost:3000');
  const embedUrl = `${frontendUrl}/embed/${video._id}`;
  const embedCode = `<iframe src="${embedUrl}" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

  sendSuccess(
    res,
    {
      embedCode,
      embedUrl,
      video: {
        id: video._id,
        title: (video.description || '').substring(0, 100) || 'Video',
        thumbnail: ensureAbsoluteUrl(video.thumbnail || ''),
        user: video.user?.username
      }
    },
    'Embed details generated successfully'
  );
}));

// Download video
router.get('/:id/download', asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

  const video = await Video.findById(videoId);
  if (!video) {
    throw new AppError('Video not found', 404, true, { code: 'VIDEO_NOT_FOUND' });
  }

  if (video.isPrivate) {
    throw new AppError('Private videos cannot be downloaded', 403, true, { code: 'VIDEO_PRIVATE' });
  }

  if (!video.url) {
    throw new AppError('Video file unavailable', 404, true, { code: 'VIDEO_FILE_MISSING' });
  }

  // Explicitly set CORS headers for download endpoint
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://spryclips.com',
    'https://www.spryclips.com'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  const videoUrl = video.url;
  const fileName = `video-${video._id}.mp4`;
  console.log(`Download request for video ${videoId}, URL: ${videoUrl}, Origin: ${origin}`);

  // Check if it's an absolute URL (http:// or https://)
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    console.log(`Proxying external URL for download: ${videoUrl}`);
    
    try {
      // Fetch the external video and stream it to the client
      const https = require('https');
      const http = require('http');
      const protocol = videoUrl.startsWith('https://') ? https : http;
      
      // Set download headers
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'video/mp4');
      
      // Make request to external URL
      protocol.get(videoUrl, (externalRes) => {
        // Forward content length if available
        if (externalRes.headers['content-length']) {
          res.setHeader('Content-Length', externalRes.headers['content-length']);
        }
        
        // Pipe the external response to client
        externalRes.pipe(res);
        
        externalRes.on('error', (err) => {
          console.error('Error streaming external video:', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to download video' });
          }
        });
      }).on('error', (err) => {
        console.error('Error fetching external video:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Failed to fetch video' });
        }
      });
      
      return;
    } catch (err) {
      console.error('Error downloading external video:', err);
      throw new AppError('Failed to download video from external source', 500);
    }
  }

  // For local files - handle relative paths or /uploads paths
  let videoPath;
  if (videoUrl.startsWith('/uploads/')) {
    videoPath = path.join(__dirname, '..', videoUrl);
  } else if (videoUrl.startsWith('uploads/')) {
    videoPath = path.join(__dirname, '..', videoUrl);
  } else if (videoUrl.startsWith('/processed/')) {
    videoPath = path.join(__dirname, '..', videoUrl);
  } else if (videoUrl.startsWith('processed/')) {
    videoPath = path.join(__dirname, '..', videoUrl);
  } else {
    // Try to resolve relative path
    const normalizedPath = videoUrl.startsWith('/') ? videoUrl.slice(1) : videoUrl;
    videoPath = path.join(__dirname, '..', normalizedPath);
  }

  console.log(`Checking for local file at: ${videoPath}`);

  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found at path: ${videoPath}`);
    throw new AppError('Video file not found on server', 404, true, { code: 'VIDEO_FILE_NOT_FOUND' });
  }

  // Set proper headers for download
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'video/mp4');
  
  // Get file size for Content-Length header
  const stat = fs.statSync(videoPath);
  res.setHeader('Content-Length', stat.size);

  console.log(`Streaming video file: ${videoPath}`);

  // Stream the file for better memory efficiency
  const fileStream = fs.createReadStream(videoPath);
  fileStream.on('error', (err) => {
    console.error('Download stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error streaming video file' });
    }
  });
  
  fileStream.pipe(res);
}));

// Retry processing for failed video
router.post('/:id/retry-processing', authMiddleware, asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  ensureObjectId(videoId, 'video', 'VIDEO_INVALID_ID');

  const video = await Video.findById(videoId);
  if (!video) {
    throw new AppError('Video not found', 404, { code: 'VIDEO_NOT_FOUND' });
  }

  // Check if user owns the video
  if (video.user.toString() !== req.user._id.toString()) {
    throw new AppError('Unauthorized', 403, { code: 'UNAUTHORIZED' });
  }

  // Only retry if video is failed
  if (video.status !== 'failed') {
    throw new AppError('Video is not in failed state', 400, { code: 'INVALID_STATUS' });
  }

  // Check if original file exists
  const videoPath = path.join(__dirname, '../', video.url);
  if (!fs.existsSync(videoPath)) {
    throw new AppError('Original video file not found', 404, { code: 'FILE_NOT_FOUND' });
  }

  // Reset video status and clear error
  video.status = 'processing';
  video.processingError = '';
  await video.save();

  // Get video queue
  const videoQueue = require('../jobs/videoProcessing');
  
  // Add job to queue (if queue is disabled, process directly)
  if (videoQueue && !videoQueue.isDisabled) {
    try {
      await videoQueue.add({
        videoId: video._id.toString(),
        videoPath: videoPath
      });
      sendSuccess(res, { videoId: video._id, status: 'processing' }, 'Video processing retry initiated');
    } catch (error) {
      // If queue fails, mark as failed again
      video.status = 'failed';
      video.processingError = 'Failed to queue video for processing';
      await video.save();
      throw new AppError('Failed to retry processing', 500, { code: 'QUEUE_ERROR' });
    }
  } else {
    // Queue is disabled, process directly
    const { processVideo } = require('../utils/videoProcessor');
    const outputDir = '/home/reactmaster/uploads/processed';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const processingOptions = {
      trimStart: Number.isFinite(video?.cropSettings?.startTime) ? video.cropSettings.startTime : 0,
      trimEnd: Number.isFinite(video?.cropSettings?.endTime) ? video.cropSettings.endTime : undefined,
      originalDuration: Number.isFinite(video?.metadataSnapshot?.duration)
        ? video.metadataSnapshot.duration
        : undefined,
      filter: video?.filter,
      speed: Number.isFinite(video?.speed) && video.speed > 0 ? video.speed : 1
    };

    try {
      const result = await processVideo(videoPath, video._id.toString(), outputDir, processingOptions);
      await Video.findByIdAndUpdate(video._id, {
        status: 'ready',
        thumbnail: result.thumbnail,
        metadata: result.metadata,
        processedVideos: result.videos,
        processingError: ''
      });
      sendSuccess(res, { videoId: video._id, status: 'ready' }, 'Video processed successfully');
    } catch (error) {
      await Video.findByIdAndUpdate(video._id, {
        status: 'failed',
        processingError: error.message || 'Video processing failed'
      });
      throw new AppError('Video processing failed', 500, { code: 'PROCESSING_ERROR' });
    }
  }
}));

module.exports = router;
