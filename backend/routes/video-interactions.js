const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== CREATE DUET ====================
router.post('/duet', authMiddleware, async (req, res) => {
  try {
    const { originalVideoId, videoUrl, thumbnail, description, hashtags, isPrivate } = req.body;

    if (!originalVideoId || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Original video ID and video URL are required'
      });
    }

    // Get original video
    const originalVideo = await Video.findById(originalVideoId);

    if (!originalVideo) {
      return res.status(404).json({
        success: false,
        message: 'Original video not found'
      });
    }

    // Check if duet is allowed
    if (originalVideo.duetDisabled === true) {
      return res.status(403).json({
        success: false,
        message: 'Duet is disabled for this video'
      });
    }

    // Create duet video
    const duetVideo = new Video({
      user: req.user._id,
      url: videoUrl,
      thumbnail: thumbnail || '',
      description: description || '',
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(tag => tag.trim())) : [],
      isPrivate: isPrivate === true || isPrivate === 'true',
      originalVideo: originalVideoId,
      videoType: 'duet',
      status: 'ready'
    });

    await duetVideo.save();

    // Add to user's videos
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: duetVideo._id }
    });

    // Increment duet count on original video
    if (!originalVideo.duets) {
      originalVideo.duets = [];
    }
    originalVideo.duets.push(duetVideo._id);
    await originalVideo.save();

    res.status(201).json({
      success: true,
      message: 'Duet created successfully',
      video: duetVideo
    });
  } catch (error) {
    console.error('Error creating duet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create duet',
      error: error.message
    });
  }
});

// ==================== CREATE STITCH ====================
router.post('/stitch', authMiddleware, async (req, res) => {
  try {
    const { originalVideoId, videoUrl, thumbnail, description, hashtags, isPrivate, clipStart, clipEnd } = req.body;

    if (!originalVideoId || !videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Original video ID and video URL are required'
      });
    }

    // Get original video
    const originalVideo = await Video.findById(originalVideoId);

    if (!originalVideo) {
      return res.status(404).json({
        success: false,
        message: 'Original video not found'
      });
    }

    // Check if stitch is allowed
    if (originalVideo.stitchDisabled === true) {
      return res.status(403).json({
        success: false,
        message: 'Stitch is disabled for this video'
      });
    }

    // Create stitch video
    const stitchVideo = new Video({
      user: req.user._id,
      url: videoUrl,
      thumbnail: thumbnail || '',
      description: description || '',
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(tag => tag.trim())) : [],
      isPrivate: isPrivate === true || isPrivate === 'true',
      originalVideo: originalVideoId,
      videoType: 'stitch',
      clipSettings: {
        startTime: clipStart || 0,
        endTime: clipEnd || 0
      },
      status: 'ready'
    });

    await stitchVideo.save();

    // Add to user's videos
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: stitchVideo._id }
    });

    // Increment stitch count on original video
    if (!originalVideo.stitches) {
      originalVideo.stitches = [];
    }
    originalVideo.stitches.push(stitchVideo._id);
    await originalVideo.save();

    res.status(201).json({
      success: true,
      message: 'Stitch created successfully',
      video: stitchVideo
    });
  } catch (error) {
    console.error('Error creating stitch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stitch',
      error: error.message
    });
  }
});

// ==================== GET DUETS OF VIDEO ====================
router.get('/:videoId/duets', async (req, res) => {
  try {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const duets = await Video.find({
      originalVideo: videoId,
      videoType: 'duet',
      status: 'ready',
      isPrivate: false
    })
      .populate('user', 'username profile.avatar profile.displayName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('url thumbnail description hashtags likes comments shares views createdAt')
      .lean();

    res.json({
      success: true,
      duets: duets,
      count: duets.length,
      originalVideo: {
        _id: video._id,
        description: video.description,
        user: video.user
      }
    });
  } catch (error) {
    console.error('Error fetching duets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch duets',
      error: error.message
    });
  }
});

// ==================== GET STITCHES OF VIDEO ====================
router.get('/:videoId/stitches', async (req, res) => {
  try {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const stitches = await Video.find({
      originalVideo: videoId,
      videoType: 'stitch',
      status: 'ready',
      isPrivate: false
    })
      .populate('user', 'username profile.avatar profile.displayName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('url thumbnail description hashtags likes comments shares views createdAt clipSettings')
      .lean();

    res.json({
      success: true,
      stitches: stitches,
      count: stitches.length,
      originalVideo: {
        _id: video._id,
        description: video.description,
        user: video.user
      }
    });
  } catch (error) {
    console.error('Error fetching stitches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stitches',
      error: error.message
    });
  }
});

// ==================== TOGGLE DUET PERMISSION ====================
router.put('/:videoId/duet-permission', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { duetDisabled } = req.body;

    const video = await Video.findOne({
      _id: videoId,
      user: req.user._id
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or unauthorized'
      });
    }

    video.duetDisabled = duetDisabled === true || duetDisabled === 'true';
    await video.save();

    res.json({
      success: true,
      message: `Duet ${video.duetDisabled ? 'disabled' : 'enabled'}`,
      duetDisabled: video.duetDisabled
    });
  } catch (error) {
    console.error('Error toggling duet permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle duet permission',
      error: error.message
    });
  }
});

// ==================== TOGGLE STITCH PERMISSION ====================
router.put('/:videoId/stitch-permission', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { stitchDisabled } = req.body;

    const video = await Video.findOne({
      _id: videoId,
      user: req.user._id
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found or unauthorized'
      });
    }

    video.stitchDisabled = stitchDisabled === true || stitchDisabled === 'true';
    await video.save();

    res.json({
      success: true,
      message: `Stitch ${video.stitchDisabled ? 'disabled' : 'enabled'}`,
      stitchDisabled: video.stitchDisabled
    });
  } catch (error) {
    console.error('Error toggling stitch permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle stitch permission',
      error: error.message
    });
  }
});

module.exports = router;

