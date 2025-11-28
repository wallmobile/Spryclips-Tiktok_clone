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

  // Invalidate cache if querying first page (to show new uploads)
  if (page === 1) {
    cache.delete(cacheKey);
  }

  const videos = await cache.getOrSet(
    cacheKey,
    async () =>
      Video.find({ status: 'ready', isPrivate: false })
        .populate('user', 'username profile')
        .select('-processedVideos')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip)
        .lean(),
    60 // Reduced cache time to 1 minute for faster updates
  );

  const total = await Video.countDocuments({ status: 'ready', isPrivate: false });

  sendPaginated(res, videos, { page, limit, total }, 'Videos retrieved successfully');
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

  // Increment views (async, don't wait)
  Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }).exec();

  // Invalidate cache after view increment
  cache.delete(cacheKey);

  sendSuccess(res, video, 'Video retrieved successfully');
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
        await createNotification({
          userId: video.user._id,
          type: 'likes',
          title: 'New Like',
          message: 'liked your video',
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

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
        thumbnail: video.thumbnail,
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

  const normalizedPath = video.url.startsWith('/') ? video.url.slice(1) : video.url;
  const videoPath = path.join(__dirname, '..', normalizedPath);

  if (!fs.existsSync(videoPath)) {
    throw new AppError('Video file not found', 404, true, { code: 'VIDEO_FILE_NOT_FOUND' });
  }

  res.download(videoPath, `video-${video._id}.mp4`, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
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
    const outputDir = path.join(__dirname, '../processed');
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
