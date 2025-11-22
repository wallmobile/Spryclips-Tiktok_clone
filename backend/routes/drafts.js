const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== SAVE VIDEO AS DRAFT ====================
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const {
      description,
      hashtags,
      music,
      filter,
      effects,
      speed,
      thumbnail,
      videoUrl,
      isPrivate
    } = req.body;

    // Create draft video
    const draft = new Video({
      user: req.user._id,
      url: videoUrl || '',
      thumbnail: thumbnail || '',
      description: description || '',
      hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(tag => tag.trim())) : [],
      isPrivate: isPrivate === true || isPrivate === 'true',
      music: music || undefined,
      filter: filter || 'none',
      effects: effects || [],
      speed: speed || 1.0,
      status: 'draft' // Draft status
    });

    await draft.save();

    res.status(201).json({
      success: true,
      message: 'Video saved as draft',
      draft: draft
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message
    });
  }
});

// ==================== GET ALL DRAFTS ====================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const drafts = await Video.find({
      user: req.user._id,
      status: 'draft'
    })
      .sort({ updatedAt: -1 })
      .select('url thumbnail description hashtags music filter effects speed isPrivate createdAt updatedAt')
      .lean();

    res.json({
      success: true,
      drafts: drafts,
      count: drafts.length
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drafts',
      error: error.message
    });
  }
});

// ==================== GET DRAFT BY ID ====================
router.get('/:draftId', authMiddleware, async (req, res) => {
  try {
    const draft = await Video.findOne({
      _id: req.params.draftId,
      user: req.user._id,
      status: 'draft'
    }).lean();

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    res.json({
      success: true,
      draft: draft
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch draft',
      error: error.message
    });
  }
});

// ==================== UPDATE DRAFT ====================
router.put('/:draftId', authMiddleware, async (req, res) => {
  try {
    const draft = await Video.findOne({
      _id: req.params.draftId,
      user: req.user._id,
      status: 'draft'
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    // Update draft fields
    if (req.body.description !== undefined) draft.description = req.body.description;
    if (req.body.hashtags !== undefined) {
      draft.hashtags = Array.isArray(req.body.hashtags)
        ? req.body.hashtags
        : req.body.hashtags.split(',').map(tag => tag.trim());
    }
    if (req.body.music !== undefined) draft.music = req.body.music;
    if (req.body.filter !== undefined) draft.filter = req.body.filter;
    if (req.body.effects !== undefined) draft.effects = req.body.effects;
    if (req.body.speed !== undefined) draft.speed = req.body.speed;
    if (req.body.thumbnail !== undefined) draft.thumbnail = req.body.thumbnail;
    if (req.body.isPrivate !== undefined) draft.isPrivate = req.body.isPrivate === true || req.body.isPrivate === 'true';

    await draft.save();

    res.json({
      success: true,
      message: 'Draft updated',
      draft: draft
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update draft',
      error: error.message
    });
  }
});

// ==================== DELETE DRAFT ====================
router.delete('/:draftId', authMiddleware, async (req, res) => {
  try {
    const draft = await Video.findOne({
      _id: req.params.draftId,
      user: req.user._id,
      status: 'draft'
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    await Video.findByIdAndDelete(req.params.draftId);

    res.json({
      success: true,
      message: 'Draft deleted'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete draft',
      error: error.message
    });
  }
});

// ==================== PUBLISH DRAFT ====================
router.post('/:draftId/publish', authMiddleware, async (req, res) => {
  try {
    const draft = await Video.findOne({
      _id: req.params.draftId,
      user: req.user._id,
      status: 'draft'
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    if (!draft.url) {
      return res.status(400).json({
        success: false,
        message: 'Draft must have a video URL to publish'
      });
    }

    // Update draft to ready status
    draft.status = 'ready';
    await draft.save();

    // Add to user's videos
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videos: draft._id }
    });

    res.json({
      success: true,
      message: 'Draft published successfully',
      video: draft
    });
  } catch (error) {
    console.error('Error publishing draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish draft',
      error: error.message
    });
  }
});

// ==================== SCHEDULE VIDEO ====================
router.post('/schedule', authMiddleware, async (req, res) => {
  try {
    const {
      videoId,
      scheduledPublishDate,
      description,
      hashtags,
      isPrivate
    } = req.body;

    if (!scheduledPublishDate) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled publish date is required'
      });
    }

    const publishDate = new Date(scheduledPublishDate);
    if (publishDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    let video;
    if (videoId) {
      // Update existing video
      video = await Video.findOne({
        _id: videoId,
        user: req.user._id
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      if (req.body.description !== undefined) video.description = description || video.description;
      if (req.body.hashtags !== undefined) {
        video.hashtags = hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(tag => tag.trim())) : video.hashtags;
      }
      if (req.body.isPrivate !== undefined) video.isPrivate = isPrivate === true || isPrivate === 'true';
    } else {
      // Create new scheduled video
      video = new Video({
        user: req.user._id,
        url: req.body.videoUrl || '',
        thumbnail: req.body.thumbnail || '',
        description: description || '',
        hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map(tag => tag.trim())) : [],
        isPrivate: isPrivate === true || isPrivate === 'true',
        status: 'scheduled'
      });
    }

    video.scheduledPublishDate = publishDate;
    video.status = 'scheduled';
    await video.save();

    res.json({
      success: true,
      message: 'Video scheduled successfully',
      video: video,
      scheduledPublishDate: publishDate
    });
  } catch (error) {
    console.error('Error scheduling video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule video',
      error: error.message
    });
  }
});

// ==================== GET SCHEDULED VIDEOS ====================
router.get('/scheduled', authMiddleware, async (req, res) => {
  try {
    const scheduledVideos = await Video.find({
      user: req.user._id,
      status: 'scheduled',
      scheduledPublishDate: { $exists: true, $ne: null }
    })
      .sort({ scheduledPublishDate: 1 })
      .select('url thumbnail description hashtags isPrivate scheduledPublishDate createdAt')
      .lean();

    res.json({
      success: true,
      scheduledVideos: scheduledVideos,
      count: scheduledVideos.length
    });
  } catch (error) {
    console.error('Error fetching scheduled videos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled videos',
      error: error.message
    });
  }
});

// ==================== UPDATE SCHEDULED VIDEO ====================
router.put('/scheduled/:videoId', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.videoId,
      user: req.user._id,
      status: 'scheduled'
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled video not found'
      });
    }

    if (req.body.scheduledPublishDate) {
      const publishDate = new Date(req.body.scheduledPublishDate);
      if (publishDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }
      video.scheduledPublishDate = publishDate;
    }

    if (req.body.description !== undefined) video.description = req.body.description;
    if (req.body.hashtags !== undefined) {
      video.hashtags = Array.isArray(req.body.hashtags)
        ? req.body.hashtags
        : req.body.hashtags.split(',').map(tag => tag.trim());
    }
    if (req.body.isPrivate !== undefined) video.isPrivate = req.body.isPrivate === true || req.body.isPrivate === 'true';

    await video.save();

    res.json({
      success: true,
      message: 'Scheduled video updated',
      video: video
    });
  } catch (error) {
    console.error('Error updating scheduled video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled video',
      error: error.message
    });
  }
});

// ==================== CANCEL SCHEDULED VIDEO ====================
router.delete('/scheduled/:videoId', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.videoId,
      user: req.user._id,
      status: 'scheduled'
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled video not found'
      });
    }

    // Change status to draft or delete
    if (req.query.action === 'delete') {
      await Video.findByIdAndDelete(req.params.videoId);
      res.json({
        success: true,
        message: 'Scheduled video deleted'
      });
    } else {
      video.status = 'draft';
      video.scheduledPublishDate = null;
      await video.save();
      res.json({
        success: true,
        message: 'Schedule cancelled, video moved to drafts',
        draft: video
      });
    }
  } catch (error) {
    console.error('Error cancelling scheduled video:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel scheduled video',
      error: error.message
    });
  }
});

module.exports = router;

