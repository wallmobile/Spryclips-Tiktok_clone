const express = require('express');
const Story = require('../models/Story');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// PUBLIC UPLOADS DIRECTORY - Production configuration
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
const UPLOADS_BASE_URL = process.env.UPLOADS_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com/uploads' : 'http://localhost:5000/uploads');

// Configure multer for story uploads
const storiesUploadDir = path.join(UPLOADS_DIR, 'stories');
if (!fs.existsSync(storiesUploadDir)) {
  fs.mkdirSync(storiesUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storiesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'story-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'));
    }
  }
});

// ==================== CREATE STORY ====================
router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, text, textColor, textBackground, music, isPrivate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media file is required',
      });
    }

    const mediaUrl = `${UPLOADS_BASE_URL}/stories/${req.file.filename}`;
    const thumbnail = type === 'video' ? mediaUrl : mediaUrl;

    // Create story
    const story = new Story({
      user: userId,
      type: type || (req.file.mimetype.startsWith('video/') ? 'video' : 'image'),
      mediaUrl,
      thumbnail,
      text: text || '',
      textColor: textColor || '#FFFFFF',
      textBackground: textBackground || 'transparent',
      music: music || null,
      isPrivate: isPrivate || false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await story.save();
    await story.populate('user', 'username profile');
    await story.populate('music');

    res.status(201).json({
      success: true,
      story,
      message: 'Story created successfully',
    });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create story',
      error: error.message,
    });
  }
});

// ==================== GET USER'S STORIES ====================
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user ? req.user._id : null;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get stories that haven't expired
    const stories = await Story.find({
      user: userId,
      expiresAt: { $gt: new Date() },
      $or: [
        { isPrivate: false },
        { isPrivate: true, allowedViewers: currentUserId },
        { user: currentUserId }, // User can always see their own stories
      ],
    })
      .populate('user', 'username profile')
      .populate('music')
      .sort({ createdAt: -1 });

    // Check if current user has viewed each story
    const storiesWithViewStatus = stories.map(story => {
      const hasViewed = currentUserId && story.viewedBy.some(
        view => view.user.toString() === currentUserId.toString()
      );
      return {
        ...story.toObject(),
        hasViewed,
      };
    });

    res.json({
      success: true,
      stories: storiesWithViewStatus,
      count: storiesWithViewStatus.length,
    });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stories',
      error: error.message,
    });
  }
});

// ==================== GET FOLLOWING STORIES ====================
router.get('/following', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get stories from followed users
    const stories = await Story.find({
      user: { $in: user.followedUsers || [] },
      expiresAt: { $gt: new Date() },
      isPrivate: false,
    })
      .populate('user', 'username profile')
      .populate('music')
      .sort({ createdAt: -1 })
      .limit(100);

    // Group stories by user
    const storiesByUser = {};
    stories.forEach(story => {
      const userId = story.user._id.toString();
      if (!storiesByUser[userId]) {
        storiesByUser[userId] = {
          user: story.user,
          stories: [],
        };
      }
      storiesByUser[userId].stories.push(story);
    });

    res.json({
      success: true,
      storiesByUser: Object.values(storiesByUser),
      count: stories.length,
    });
  } catch (error) {
    console.error('Error fetching following stories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following stories',
      error: error.message,
    });
  }
});

// ==================== VIEW STORY ====================
router.post('/:storyId/view', authMiddleware, async (req, res) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user._id;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check if story is expired
    if (story.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Story has expired',
      });
    }

    // Check privacy
    if (story.isPrivate && story.user.toString() !== userId.toString()) {
      const isAllowed = story.allowedViewers.some(
        viewerId => viewerId.toString() === userId.toString()
      );
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Story is private',
        });
      }
    }

    // Check if already viewed
    const alreadyViewed = story.viewedBy.some(
      view => view.user.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      story.views += 1;
      story.viewedBy.push({
        user: userId,
        viewedAt: new Date(),
      });
      await story.save();

      // Create notification if not the story owner
      if (story.user.toString() !== userId.toString()) {
        const notification = new Notification({
          recipient: story.user,
          sender: userId,
          type: 'system',
          message: `${req.user.username} viewed your story`,
          link: `/stories/${storyId}`,
          entityId: storyId,
          entityModel: 'Story',
        });
        await notification.save();
      }
    }

    res.json({
      success: true,
      story,
      message: 'Story viewed successfully',
    });
  } catch (error) {
    console.error('Error viewing story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to view story',
      error: error.message,
    });
  }
});

// ==================== REACT TO STORY ====================
router.post('/:storyId/react', authMiddleware, async (req, res) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user._id;
    const { emoji } = req.body;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check if already reacted
    const existingReaction = story.reactions.find(
      reaction => reaction.user.toString() === userId.toString()
    );

    if (existingReaction) {
      // Update reaction
      existingReaction.emoji = emoji || '❤️';
      existingReaction.createdAt = new Date();
    } else {
      // Add new reaction
      story.reactions.push({
        user: userId,
        emoji: emoji || '❤️',
        createdAt: new Date(),
      });
    }

    await story.save();

    // Create notification if not the story owner
    if (story.user.toString() !== userId.toString()) {
      const notification = new Notification({
        recipient: story.user,
        sender: userId,
        type: 'like',
        message: `${req.user.username} reacted to your story`,
        link: `/stories/${storyId}`,
        entityId: storyId,
        entityModel: 'Story',
      });
      await notification.save();
    }

    res.json({
      success: true,
      story,
      message: 'Reaction added successfully',
    });
  } catch (error) {
    console.error('Error reacting to story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to react to story',
      error: error.message,
    });
  }
});

// ==================== REPLY TO STORY ====================
router.post('/:storyId/reply', authMiddleware, async (req, res) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user._id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Add reply
    story.replies.push({
      user: userId,
      message: message.trim(),
      createdAt: new Date(),
    });

    await story.save();
    await story.populate('replies.user', 'username profile');

    // Create notification
    const notification = new Notification({
      recipient: story.user,
      sender: userId,
      type: 'comment',
      message: `${req.user.username} replied to your story`,
      link: `/stories/${storyId}`,
      entityId: storyId,
      entityModel: 'Story',
    });
    await notification.save();

    const newReply = story.replies[story.replies.length - 1];

    res.status(201).json({
      success: true,
      reply: newReply,
      message: 'Reply added successfully',
    });
  } catch (error) {
    console.error('Error replying to story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reply to story',
      error: error.message,
    });
  }
});

// ==================== DELETE STORY ====================
router.delete('/:storyId', authMiddleware, async (req, res) => {
  try {
    const storyId = req.params.storyId;
    const userId = req.user._id;

    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check ownership
    if (story.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this story',
      });
    }

    // Delete media file
    if (story.mediaUrl && fs.existsSync('.' + story.mediaUrl)) {
      fs.unlinkSync('.' + story.mediaUrl);
    }

    await Story.findByIdAndDelete(storyId);

    res.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete story',
      error: error.message,
    });
  }
});

// ==================== GET STORY DETAILS ====================
router.get('/:storyId', async (req, res) => {
  try {
    const storyId = req.params.storyId;
    const currentUserId = req.user ? req.user._id : null;

    const story = await Story.findById(storyId)
      .populate('user', 'username profile')
      .populate('music')
      .populate('viewedBy.user', 'username profile')
      .populate('reactions.user', 'username profile')
      .populate('replies.user', 'username profile');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check privacy
    if (story.isPrivate && story.user._id.toString() !== currentUserId?.toString()) {
      const isAllowed = story.allowedViewers.some(
        viewerId => viewerId.toString() === currentUserId?.toString()
      );
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Story is private',
        });
      }
    }

    res.json({
      success: true,
      story,
    });
  } catch (error) {
    console.error('Error fetching story details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch story details',
      error: error.message,
    });
  }
});

module.exports = router;

