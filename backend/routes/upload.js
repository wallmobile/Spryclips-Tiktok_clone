const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { uploadLimiter } = require('../utils/rateLimiter');
const { validateFile } = require('../utils/fileValidation');
const videoQueue = require('../jobs/videoProcessing');
const { processVideo, generateThumbnail } = require('../utils/videoProcessor');
const { cache, cacheKeys } = require('../utils/cache');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { PUBLIC_URL } = require('../utils/config');
const router = express.Router();

// PUBLIC UPLOADS DIRECTORY - Production configuration
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com/uploads' : `${PUBLIC_URL}/uploads`);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`✅ Created uploads directory: ${UPLOADS_DIR}`);
}

console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
console.log(`🌐 Public URL base: ${UPLOADS_BASE_URL}`);

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
  const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
  
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isValidExtension = allowedExtensions.includes(ext);
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);

  if (isValidExtension && isValidMimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, mov, avi, webm, mkv)!'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Allowed video MIME types for magic byte validation
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv'];

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return defaultValue;
};

const parseNumber = (value, defaultValue = undefined) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
};

const parseJSON = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const normalizeHashtags = (input) => {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input
      .map((tag) => (typeof tag === 'string' ? tag : String(tag)))
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag))
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[\s,#]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag))
      .filter(Boolean);
  }
  return [];
};

// Upload video
router.post('/', authMiddleware, uploadLimiter, upload.single('video'), asyncHandler(async (req, res) => {
  // Check if account is suspended or banned - block video upload
  if (req.user.accountStatus !== 'active') {
    let errorMessage = 'Your account access has been temporarily restricted. Please contact our support team for assistance.';
    if (req.user.accountStatus === 'suspended' && req.user.isSelfDeactivated) {
      errorMessage = 'Your account is currently deactivated. To reactivate it, please contact our support team. We\'ll be happy to assist you!';
    } else if (req.user.accountStatus === 'banned') {
      errorMessage = 'Your account has been restricted. If you believe this is an error, please contact our support team for review.';
    }
    throw new AppError(errorMessage, 403);
  }
  
  if (!req.file) {
    throw new AppError('No video file uploaded', 400);
  }

  const metadata = parseJSON(req.body.metadata, {});
  const editorSettings = metadata.editor || {};

  // Validate file with magic bytes
  const validation = await validateFile(req.file, {
    allowedMimeTypes: ALLOWED_VIDEO_TYPES,
    allowedExtensions: ALLOWED_VIDEO_EXTENSIONS,
    maxSize: 100 * 1024 * 1024, // 100MB
    requireMagicBytes: true
  });

  if (!validation.valid) {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw new AppError('File validation failed', 400, true, validation.errors);
  }

  const caption = typeof metadata.caption === 'string'
    ? metadata.caption
    : (req.body.description || '');

  const hashtags = normalizeHashtags(metadata.hashtags ?? req.body.hashtags);

  const taggedFriends = metadata.taggedFriends ?? parseJSON(req.body.taggedFriends, []);
  const mentions = Array.isArray(taggedFriends)
    ? taggedFriends.map((friend) => friend && friend.toString().trim()).filter(Boolean)
    : [];

  const privacy = metadata.privacy || req.body.privacy || 'public';
  const isPrivate = privacy === 'private'
    ? true
    : privacy === 'friends'
      ? false
      : parseBoolean(req.body.isPrivate, false);

  const musicPayload = metadata.music ?? parseJSON(req.body.music, null);
  const musicData = musicPayload
    ? {
        name: musicPayload.name || '',
        artist: musicPayload.artist || '',
        duration: musicPayload.duration || ''
      }
    : undefined;

  const cropPayload = metadata.crop || {};
  const cropStartValue = cropPayload.start ?? cropPayload.startTime ?? parseNumber(req.body.cropStart, 0) ?? 0;
  const cropEndValue = cropPayload.end ?? cropPayload.endTime ?? parseNumber(req.body.cropEnd, 0) ?? 0;

  const filterValue = editorSettings.filter || req.body.filter || 'none';

  const effectsArray = editorSettings.transitions
    ?? parseJSON(req.body.effects, []);

  const speedLabel = editorSettings.speed || req.body.speed || '1x';
  const parsedSpeed = typeof speedLabel === 'string'
    ? parseFloat(speedLabel.replace(/x/i, ''))
    : parseNumber(speedLabel, 1);

  const ageRestriction = (metadata.ageRestriction || req.body.ageRestriction || 'all') === '18+'
    ? '18+'
    : 'all';

  const autoCaptionsEnabled = parseBoolean(metadata.autoCaptions ?? req.body.autoCaptions, false);

  const shareTargets = metadata.shareTargets || {};
  const shareTo = {
    instagram: parseBoolean(shareTargets.instagram ?? req.body.shareToInstagram, false),
    whatsapp: parseBoolean(shareTargets.whatsapp ?? req.body.shareToWhatsApp, false),
    facebook: parseBoolean(shareTargets.facebook ?? req.body.shareToFacebook, false),
    twitter: parseBoolean(shareTargets.twitter ?? req.body.shareToTwitter, false)
  };

  const allowComments = parseBoolean(metadata.allowComments ?? req.body.allowComments, true);
  const allowDuet = parseBoolean(metadata.allowDuet ?? req.body.allowDuet, true);
  const allowStitch = parseBoolean(metadata.allowStitch ?? req.body.allowStitch, true);

  const cropSettings = {
    startTime: parseNumber(cropStartValue, 0) || 0
  };
  const endTimeNumeric = parseNumber(cropEndValue, 0);
  if (Number.isFinite(endTimeNumeric) && endTimeNumeric > cropSettings.startTime) {
    cropSettings.endTime = endTimeNumeric;
  }

  const processingOptions = {
    trimStart: Number.isFinite(cropSettings.startTime) ? cropSettings.startTime : 0,
    trimEnd: Number.isFinite(cropSettings.endTime) ? cropSettings.endTime : undefined,
    originalDuration: Number.isFinite(metadata?.duration) ? metadata.duration : undefined,
    filter: filterValue,
    speed: Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 1
  };

  // Generate public URL for the uploaded video
  const videoPublicUrl = `${UPLOADS_BASE_URL}/${req.file.filename}`;

  const video = new Video({
    user: req.user._id,
    url: videoPublicUrl, // Use full public URL
    description: caption,
    hashtags,
    mentions,
    isPrivate,
    duration: parseNumber(metadata?.duration, 0),
    music: musicData,
    cropSettings,
    filter: filterValue,
    effects: Array.isArray(effectsArray) ? effectsArray : [],
    speed: Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 1.0,
    ageRestriction,
    autoCaptions: autoCaptionsEnabled,
    shareTo,
    commentsDisabled: !allowComments,
    duetDisabled: !allowDuet,
    stitchDisabled: !allowStitch,
    metadataSnapshot: metadata || undefined,
    status: metadata?.status || req.body.status || 'ready' // Allow setting status (e.g., 'draft')
  });

  try {
    await video.save();
    console.log('Video saved to database:', video._id);
  } catch (saveError) {
    console.error('Error saving video:', saveError);
    throw new AppError('Failed to save video to database', 500);
  }

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: video._id }
    });
    console.log('Video added to user:', req.user._id);
  } catch (userUpdateError) {
    console.error('Error updating user:', userUpdateError);
    // Don't throw - video is saved, just log the error
  }

  // Notify followers about new video
  try {
    const Notification = require('../models/Notification');
    const videoUser = await User.findById(req.user._id).select('username followers');
    
    console.log(`📹 Video upload notification check:`, {
      userId: req.user._id.toString(),
      username: videoUser?.username,
      followersCount: videoUser?.followers?.length || 0
    });
    
    if (videoUser && videoUser.followers && Array.isArray(videoUser.followers) && videoUser.followers.length > 0) {
      console.log(`📬 Creating notifications for ${videoUser.followers.length} followers`);
      
      const notificationPromises = videoUser.followers.map(async (followerId) => {
        try {
          // Handle both ObjectId and populated user
          const followerIdStr = followerId._id ? followerId._id.toString() : followerId.toString();
          
          // Convert to ObjectId if it's a string
          const followerObjectId = mongoose.Types.ObjectId.isValid(followerIdStr) 
            ? new mongoose.Types.ObjectId(followerIdStr)
            : followerIdStr;
          
          const notification = new Notification({
            user: followerObjectId,
            type: 'video_upload',
            title: 'New Video',
            message: `${videoUser.username} posted a new video`,
            relatedUser: req.user._id,
            relatedVideo: video._id,
            metadata: { videoTitle: caption?.substring(0, 50) || '' }
          });
          
          const savedNotification = await notification.save();
          console.log(`✅ Notification created for follower ${followerIdStr}:`, {
            notificationId: savedNotification._id.toString(),
            userId: savedNotification.user.toString(),
            userIdType: typeof savedNotification.user,
            userIdIsObjectId: savedNotification.user instanceof mongoose.Types.ObjectId,
            type: savedNotification.type,
            message: savedNotification.message,
            createdAt: savedNotification.createdAt
          });
          
          // Verify notification was saved and can be queried
          const verifyNotif = await Notification.findById(savedNotification._id);
          if (verifyNotif) {
            console.log(`✅ Notification verified in database for follower ${followerIdStr}`);
            
            // Also verify it can be found by user query
            const userQueryResult = await Notification.find({
              user: followerObjectId,
              type: 'video_upload'
            }).limit(1).sort({ createdAt: -1 });
            
            console.log(`🔍 User query verification for ${followerIdStr}:`, {
              found: userQueryResult.length > 0,
              count: userQueryResult.length,
              notificationId: userQueryResult[0]?._id?.toString()
            });
          } else {
            console.error(`❌ Notification not found after save for follower ${followerIdStr}`);
          }
        } catch (err) {
          console.error(`❌ Error creating video notification for follower ${followerId}:`, {
            error: err.message,
            stack: err.stack,
            followerId: followerId.toString()
          });
        }
      });
      
      await Promise.all(notificationPromises);
      console.log(`✅ Completed notifying ${videoUser.followers.length} followers about new video`);
    } else {
      console.log(`⏭️ No followers to notify (followers: ${videoUser?.followers?.length || 0})`);
    }
  } catch (notifError) {
    console.error('❌ Error notifying followers about video:', {
      error: notifError.message,
      stack: notifError.stack
    });
    // Don't fail video upload if notification fails
  }

  // Generate a basic thumbnail synchronously for immediate display (first frame)
  let thumbnailUrl = '';
  try {
    const processedDir = path.join(__dirname, '..', 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
      console.log(`✅ Created processed directory: ${processedDir}`);
    }
    
    const thumbnailPath = path.join(processedDir, `${video._id}-thumbnail.jpg`);
    console.log(`🖼️ Generating thumbnail for video ${video._id}...`);
    console.log(`   Input: ${req.file.path}`);
    console.log(`   Output: ${thumbnailPath}`);
    
    await generateThumbnail(req.file.path, thumbnailPath, 0.01); // Use first frame (0.01s)
    
    // Verify thumbnail was created
    if (fs.existsSync(thumbnailPath)) {
      const stats = fs.statSync(thumbnailPath);
      console.log(`✅ Thumbnail generated successfully: ${stats.size} bytes`);
      thumbnailUrl = `/processed/${path.basename(thumbnailPath)}`;
      
      // Update video with the thumbnail
      await Video.findByIdAndUpdate(video._id, { thumbnail: thumbnailUrl });
      console.log(`✅ Thumbnail saved to database: ${thumbnailUrl}`);
    } else {
      console.error(`❌ Thumbnail file not found after generation: ${thumbnailPath}`);
    }
  } catch (thumbnailError) {
    console.error('❌ Failed to generate first frame thumbnail:', thumbnailError);
    console.error('   Error details:', thumbnailError.message);
    console.error('   Stack:', thumbnailError.stack);
    // Continue without thumbnail - it will be generated during full processing
  }

  let statusMessage = 'Video uploaded successfully';
  let responseVideo = {
    id: video._id,
    status: video.status,
    url: video.url,
    thumbnail: thumbnailUrl || video.thumbnail,
    processedVideos: video.processedVideos || []
  };

  // Send response FIRST - before any processing
  try {
    res.status(201).json({
      success: true,
      message: statusMessage,
      video: responseVideo
    });
    
    // Log for debugging
    console.log('Video upload response sent successfully:', {
      videoId: video._id,
      status: video.status,
      userId: req.user._id,
      responseVideo: responseVideo
    });
  } catch (responseError) {
    console.error('Error sending response:', responseError);
    // If response already sent, don't send again
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process upload response'
      });
    }
    return;
  }

  // Process video in background AFTER response is sent (non-blocking)
  /*
  const queueDisabled = Boolean(videoQueue?.isDisabled);
  const canEnqueue = typeof videoQueue?.add === 'function' && !queueDisabled;

  // Use setImmediate to ensure response is sent before processing starts
  setImmediate(async () => {
    if (canEnqueue) {
      try {
        await videoQueue.add({
          videoId: video._id.toString(),
          videoPath: req.file.path
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        });
        console.log('Video processing job enqueued:', video._id);
      } catch (error) {
        console.error('Failed to enqueue video processing job:', error);
        // Update video status to failed
        await Video.findByIdAndUpdate(video._id, {
          status: 'failed',
          processingError: error.message
        }).catch(err => console.error('Failed to update video status:', err));
      }
    } else {
      const processedDir = path.join(__dirname, '..', 'processed');
      if (!fs.existsSync(processedDir)) {
        fs.mkdirSync(processedDir, { recursive: true });
      }

      try {
        // Process video asynchronously with timeout (25 minutes)
        const PROCESSING_TIMEOUT = 25 * 60 * 1000; // 25 minutes
        let timeoutId;
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Video processing timed out after 25 minutes'));
          }, PROCESSING_TIMEOUT);
        });

        try {
          const processPromise = processVideo(
            req.file.path,
            video._id.toString(),
            processedDir,
            processingOptions
          );

          // Race between processing and timeout
          const result = await Promise.race([processPromise, timeoutPromise]);
          
          // Clear timeout if processing completed
          clearTimeout(timeoutId);

          // Update video with processed data but keep status as 'ready'
          await Video.findByIdAndUpdate(
            video._id,
            {
              thumbnail: result.thumbnail,
              metadata: result.metadata,
              processedVideos: result.videos,
              processingError: ''
              // Don't change status - keep it as 'ready'
            },
            { new: false }
          );

          // Invalidate cache for this video and video lists
          cache.delete(cacheKeys.video(video._id.toString()));
          // Invalidate first page of video list to show updated thumbnails
          cache.delete(cacheKeys.videoList({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: -1 }));

          console.log('Video processing completed:', video._id);
        } catch (backgroundErr) {
          // Clear timeout if error occurred
          if (timeoutId) clearTimeout(timeoutId);
          
          console.error('Inline video processing failed:', backgroundErr);
          // Only mark as failed if processing actually fails
          await Video.findByIdAndUpdate(video._id, {
            status: 'failed',
            processingError: backgroundErr.message || 'Video processing failed or timed out'
          });
        }
      } catch (error) {
        console.error('Error starting video processing:', error);
        // Only mark as failed if there's an error
        await Video.findByIdAndUpdate(video._id, {
          status: 'failed',
          processingError: error.message || 'Video processing failed'
        }).catch(err => console.error('Failed to update video status:', err));
      }
    }
  });
  */
}));

// Get user's uploaded videos
router.get('/my-videos', authMiddleware, asyncHandler(async (req, res) => {
  const videos = await Video.find({ user: req.user._id })
    .populate('user', 'username profile')
    .sort({ createdAt: -1 });

  // Prevent caching to ensure fresh data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.json({
    success: true,
    count: videos.length,
    videos: videos
  });
}));

// Get single uploaded video
router.get('/my-videos/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid video ID', 400);
  }
  
  const video = await Video.findOne({
    _id: req.params.id,
    user: req.user._id
  }).populate('user', 'username profile');

  if (!video) {
    throw new AppError('Video not found or unauthorized', 404);
  }

  res.json({
    success: true,
    video: video
  });
}));

// Update video details
router.put('/my-videos/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid video ID', 400);
  }
  
  const video = await Video.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!video) {
    throw new AppError('Video not found or unauthorized', 404);
  }

  const {
    description,
    hashtags,
    isPrivate,
    taggedFriends,
    ageRestriction,
    autoCaptions,
    filter,
    effects,
    speed
  } = req.body;

  if (description !== undefined) video.description = description;
  if (hashtags !== undefined) {
    video.hashtags = typeof hashtags === 'string' 
      ? hashtags.split(',').map(tag => tag.trim()) 
      : hashtags;
  }
  if (isPrivate !== undefined) {
    video.isPrivate = isPrivate === 'true' || isPrivate === true;
  }
  if (taggedFriends !== undefined) {
    if (typeof taggedFriends === 'string') {
      try {
        video.mentions = JSON.parse(taggedFriends);
      } catch (e) {
        video.mentions = [];
      }
    } else {
      video.mentions = taggedFriends;
    }
  }
  if (ageRestriction !== undefined) video.ageRestriction = ageRestriction;
  if (autoCaptions !== undefined) {
    video.autoCaptions = autoCaptions === 'true' || autoCaptions === true;
  }
  if (filter !== undefined) video.filter = filter;
  if (effects !== undefined) {
    if (typeof effects === 'string') {
      try {
        video.effects = JSON.parse(effects);
      } catch (e) {
        video.effects = [];
      }
    } else {
      video.effects = effects;
    }
  }
  if (speed !== undefined) video.speed = parseFloat(speed);

  await video.save();

  res.json({
    success: true,
    message: 'Video updated successfully',
    video: video
  });
}));

// Delete video
router.delete('/my-videos/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid video ID', 400);
  }
  
  const video = await Video.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!video) {
    throw new AppError('Video not found or unauthorized', 404);
  }

  const videoUrlPath = video.url.startsWith('/') ? video.url.substring(1) : video.url;
  const videoPath = path.join(__dirname, '..', videoUrlPath);
  if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { videos: video._id }
  });

  await Video.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Video deleted successfully'
  });
}));

// Get video analytics
router.get('/my-videos/:id/analytics', authMiddleware, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid video ID', 400);
  }
  
  const video = await Video.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!video) {
    throw new AppError('Video not found or unauthorized', 404);
  }

  const engagementRate = video.views > 0 
    ? ((video.likes + video.comments + video.shares) / video.views) * 100 
    : 0;

  res.json({
    success: true,
    analytics: {
      views: video.views,
      likes: video.likes,
      comments: video.comments,
      shares: video.shares,
      engagementRate: engagementRate.toFixed(2),
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    }
  });
}));

// Search user's videos
router.get('/my-videos/search/:query', authMiddleware, asyncHandler(async (req, res) => {
  const query = req.params.query;
  
  const videos = await Video.find({
    user: req.user._id,
    $or: [
      { description: { $regex: query, $options: 'i' } },
      { hashtags: { $regex: query, $options: 'i' } }
    ]
  })
  .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: videos.length,
    videos: videos
  });
}));

// Promote video (add special badge or boost)
router.post('/my-videos/:id/promote', authMiddleware, asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new AppError('Invalid video ID', 400);
  }
  
  const video = await Video.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!video) {
    throw new AppError('Video not found or unauthorized', 404);
  }

  video.status = 'ready';

  await video.save();

  res.json({
    success: true,
    message: 'Video promoted successfully',
    video: video
  });
}));

module.exports = router;
