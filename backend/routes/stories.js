const express = require('express');
const mongoose = require('mongoose');
const Story = require('../models/Story');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
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
    const { type, text, textColor, textBackground, textPositionX, textPositionY, music, isPrivate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media file is required',
      });
    }

    // Validate file type
    const fileType = type || (req.file.mimetype.startsWith('video/') ? 'video' : 'image');
    if (!['image', 'video'].includes(fileType)) {
      // Delete uploaded file if invalid
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only images and videos are allowed.',
      });
    }

    // Generate media URL
    const mediaUrl = `${UPLOADS_BASE_URL}/stories/${req.file.filename}`;
    const thumbnail = mediaUrl; // For now, use same URL for thumbnail

    // Validate text length
    if (text && text.length > 500) {
      // Delete uploaded file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Text cannot exceed 500 characters',
      });
    }

    // Create story
    const story = new Story({
      user: userId,
      type: fileType,
      mediaUrl,
      thumbnail,
      text: (text || '').trim(),
      textColor: textColor || '#FFFFFF',
      textBackground: textBackground || 'transparent',
      textPositionX: textPositionX ? parseFloat(textPositionX) : 50,
      textPositionY: textPositionY ? parseFloat(textPositionY) : 50,
      music: music || null,
      isPrivate: isPrivate === 'true' || isPrivate === true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await story.save();
    await story.populate('user', 'username profile');
    
    if (music) {
      await story.populate('music');
    }

    // Notify followers about new story
    try {
      const Notification = require('../models/Notification');
      const storyUser = await User.findById(userId).select('username followers');
      
      console.log(`📖 Story upload notification check:`, {
        userId: userId.toString(),
        username: storyUser?.username,
        followersCount: storyUser?.followers?.length || 0
      });
      
      if (storyUser && storyUser.followers && Array.isArray(storyUser.followers) && storyUser.followers.length > 0) {
        console.log(`📬 Creating notifications for ${storyUser.followers.length} followers`);
        
        const notificationPromises = storyUser.followers.map(async (followerId) => {
          try {
            // Handle both ObjectId and populated user
            const followerIdStr = followerId._id ? followerId._id.toString() : followerId.toString();
            
            // Convert to ObjectId if it's a string
            const followerObjectId = mongoose.Types.ObjectId.isValid(followerIdStr) 
              ? new mongoose.Types.ObjectId(followerIdStr)
              : followerIdStr;
            
            const notification = new Notification({
              user: followerObjectId,
              type: 'story_upload',
              title: 'New Story',
              message: `${storyUser.username} posted a new story`,
              relatedUser: userId,
              relatedVideo: null,
              metadata: { storyId: story._id.toString() }
            });
            
            const savedNotification = await notification.save();
            console.log(`✅ Story notification created for follower ${followerIdStr}:`, {
              notificationId: savedNotification._id.toString(),
              userId: savedNotification.user.toString(),
              type: savedNotification.type,
              message: savedNotification.message,
              createdAt: savedNotification.createdAt
            });
            
            // Verify notification was saved
            const verifyNotif = await Notification.findById(savedNotification._id);
            if (verifyNotif) {
              console.log(`✅ Story notification verified in database for follower ${followerIdStr}`);
            } else {
              console.error(`❌ Story notification not found after save for follower ${followerIdStr}`);
            }
          } catch (err) {
            console.error(`❌ Error creating story notification for follower ${followerId}:`, {
              error: err.message,
              stack: err.stack,
              followerId: followerId.toString()
            });
          }
        });
        
        await Promise.all(notificationPromises);
        console.log(`✅ Completed notifying ${storyUser.followers.length} followers about new story`);
      } else {
        console.log(`⏭️ No followers to notify (followers: ${storyUser?.followers?.length || 0})`);
      }
    } catch (notifError) {
      console.error('❌ Error notifying followers about story:', {
        error: notifError.message,
        stack: notifError.stack
      });
      // Don't fail story creation if notification fails
    }

    console.log(`✅ Story created successfully: ${story._id} by user ${userId}`);
    console.log(`📦 Story details:`, {
      _id: story._id,
      user: story.user,
      type: story.type,
      expiresAt: story.expiresAt,
      mediaUrl: story.mediaUrl
    });
    
    res.status(201).json({
      success: true,
      story: {
        _id: story._id,
        id: story._id, // Also include as 'id' for compatibility
        user: story.user,
        type: story.type,
        mediaUrl: story.mediaUrl,
        thumbnail: story.thumbnail,
        text: story.text,
        textColor: story.textColor,
        textBackground: story.textBackground,
        textPositionX: story.textPositionX,
        textPositionY: story.textPositionY,
        expiresAt: story.expiresAt,
        createdAt: story.createdAt
      },
      message: 'Story created successfully',
    });
  } catch (error) {
    console.error('❌ Error creating story:', error);
    console.error('Error stack:', error.stack);
    console.error('Request file:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');
    
    // Clean up uploaded file if story creation fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('✅ Cleaned up uploaded file:', req.file.path);
      } catch (unlinkError) {
        console.error('⚠️ Error deleting uploaded file:', unlinkError);
      }
    }
    
    const errorMessage = error.message || 'Failed to create story';
    const statusCode = error.statusCode || 500;
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

// ==================== GET USER'S STORIES ====================
// Optional auth - try to get user from token if available
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Try to get current user from token (optional auth)
    let currentUserId = null;
    try {
      // Try to extract token and verify
      let token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.userId) {
          const authUser = await User.findById(decoded.userId);
          if (authUser) {
            currentUserId = authUser._id.toString();
          }
        }
      }
    } catch (authError) {
      // Auth is optional, continue without it
      console.log('Optional auth failed (this is OK):', authError.message);
    }
    
    // Normalize userId to string for comparison
    const targetUserId = userId.toString();

    console.log(`📚 GET /user/:userId - Request params:`, {
      userId,
      targetUserId,
      currentUserId
    });

    const user = await User.findById(userId);

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Build query - user can always see their own stories
    // Compare both as strings to handle ObjectId vs string comparison
    const isOwnProfile = currentUserId && (
      currentUserId.toString() === targetUserId || 
      currentUserId.toString() === userId.toString()
    );
    
    console.log(`📚 Fetching stories for user ${userId}`);
    console.log(`   - Current User ID: ${currentUserId || 'Not authenticated'}`);
    console.log(`   - Target User ID: ${targetUserId}`);
    console.log(`   - Is Own Profile: ${isOwnProfile}`);
    
    const query = {
      user: userId,
      expiresAt: { $gt: new Date() },
    };

    // If not own profile, only show public stories
    if (!isOwnProfile) {
      query.isPrivate = false;
      console.log(`   - Query: Only public stories (not own profile)`);
    } else {
      console.log(`   - Query: All stories (own profile - including private)`);
    }
    
    // Get stories that haven't expired
    const stories = await Story.find(query)
      .populate('user', 'username profile')
      .populate('music')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${stories.length} stories for user ${userId}`);
    if (stories.length > 0) {
      stories.forEach((story, index) => {
        console.log(`   Story ${index + 1}: ${story._id}, type: ${story.type}, expiresAt: ${story.expiresAt}`);
      });
    }

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

    // Get followed users list
    const followedUsers = user.followedUsers || [];
    console.log(`📚 Fetching stories for ${followedUsers.length} followed users`);

    if (followedUsers.length === 0) {
      return res.json({
        success: true,
        storiesByUser: [],
        count: 0,
        message: 'No followed users',
      });
    }

    // Get stories from followed users
    const stories = await Story.find({
      user: { $in: followedUsers },
      expiresAt: { $gt: new Date() },
      isPrivate: false,
    })
      .populate('user', 'username profile')
      .populate('music')
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${stories.length} stories from followed users`);

    // Group stories by user
    const storiesByUser = {};
    stories.forEach(story => {
      const storyUserId = story.user._id.toString();
      if (!storiesByUser[storyUserId]) {
        storiesByUser[storyUserId] = {
          user: story.user,
          stories: [],
        };
      }
      storiesByUser[storyUserId].stories.push(story);
    });

    console.log(`📊 Grouped into ${Object.keys(storiesByUser).length} users`);

    res.json({
      success: true,
      storiesByUser: Object.values(storiesByUser),
      count: stories.length,
    });
  } catch (error) {
    console.error('❌ Error fetching following stories:', error);
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
          user: story.user,
          type: 'system',
          title: 'Story Viewed',
          message: `${req.user.username} viewed your story`,
          relatedUser: userId,
          relatedVideo: null,
          metadata: { storyId: storyId.toString() }
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
  console.log(`🔥 STORY REACTION ENDPOINT HIT:`, {
    storyId: req.params.storyId,
    userId: req.user._id?.toString(),
    username: req.user.username,
    emoji: req.body.emoji,
    timestamp: new Date().toISOString()
  });
  
  try {
    const storyId = req.params.storyId;
    const userId = req.user._id;
    const { emoji } = req.body;

    let story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Always populate story user to ensure we have the correct user ID
    if (!story.user || !story.user._id || typeof story.user === 'object' && !story.user._id) {
      story = await Story.findById(storyId).populate('user', '_id username');
    }

    // Get story owner ID (handle both ObjectId and populated)
    const storyOwnerId = story.user._id || story.user;
    const storyOwnerIdStr = storyOwnerId.toString();
    const userIdStr = userId.toString();

    console.log(`📖 Story reaction request:`, {
      storyId: storyId.toString(),
      storyOwnerId: storyOwnerIdStr,
      currentUserId: userIdStr,
      username: req.user.username,
      storyUserType: typeof story.user,
      storyUserIsObject: story.user instanceof mongoose.Types.ObjectId,
      storyUserHasId: !!story.user._id,
      storyUserRaw: story.user
    });

    // Check if already reacted
    const existingReaction = story.reactions.find(
      reaction => reaction.user.toString() === userIdStr
    );

    const isNewReaction = !existingReaction;
    const isOwnStory = storyOwnerIdStr === userIdStr;

    console.log(`📖 Reaction check:`, {
      isNewReaction,
      isOwnStory,
      existingReactionCount: story.reactions.length,
      existingReaction: existingReaction ? 'found' : 'not found',
      userIdStr,
      storyOwnerIdStr,
      reactions: story.reactions.map(r => ({
        userId: r.user?.toString(),
        emoji: r.emoji
      }))
    });

    let isRemoved = false;
    const reactionEmoji = emoji || '❤️';

    if (existingReaction) {
      // If same emoji, remove reaction (unlike)
      if (existingReaction.emoji === reactionEmoji) {
        story.reactions = story.reactions.filter(
          reaction => reaction.user.toString() !== userIdStr
        );
        isRemoved = true;
        console.log(`🗑️ Removed reaction (unlike) for story ${storyId}`);
      } else {
        // Update reaction with different emoji
        existingReaction.emoji = reactionEmoji;
      existingReaction.createdAt = new Date();
        console.log(`🔄 Updated reaction emoji for story ${storyId}`);
      }
    } else {
      // Add new reaction
      story.reactions.push({
        user: userId,
        emoji: reactionEmoji,
        createdAt: new Date(),
      });
      console.log(`➕ Added new reaction for story ${storyId}`);
    }

    await story.save();

    // Create notification only for NEW reactions (not updates or removals) - even for own stories
    if (isNewReaction && !isRemoved) {
      try {
        console.log(`📬 Creating story reaction notification:`, {
          storyId: storyId.toString(),
          storyOwnerId: storyOwnerIdStr,
          reactorId: userIdStr,
          reactorUsername: req.user.username,
          isNewReaction,
          isOwnStory
        });

        // Ensure storyOwnerId is a valid ObjectId - use userId directly for consistency
        const notificationUserId = mongoose.Types.ObjectId.isValid(storyOwnerIdStr) 
          ? new mongoose.Types.ObjectId(storyOwnerIdStr)
          : (storyOwnerId instanceof mongoose.Types.ObjectId ? storyOwnerId : new mongoose.Types.ObjectId(storyOwnerIdStr));

        console.log(`📝 Creating notification with:`, {
          user: notificationUserId.toString(),
          type: 'likes',
          storyOwnerIdStr,
          storyOwnerIdType: typeof storyOwnerId,
          notificationUserIdType: typeof notificationUserId,
          notificationUserIdIsObjectId: notificationUserId instanceof mongoose.Types.ObjectId,
          currentUserId: userId.toString(),
          userIdType: typeof userId,
          userIdIsObjectId: userId instanceof mongoose.Types.ObjectId,
          userIdsMatch: notificationUserId.toString() === userId.toString()
        });

      const notification = new Notification({
          user: notificationUserId,
          type: 'likes',
          title: 'Story Reaction',
        message: `${req.user.username} reacted to your story`,
          relatedUser: userId,
          relatedVideo: null,
          metadata: { storyId: storyId.toString() }
        });
        
        const savedNotification = await notification.save();
        console.log(`✅ Story reaction notification created successfully:`, {
          notificationId: savedNotification._id.toString(),
          userId: savedNotification.user.toString(),
          userIdType: typeof savedNotification.user,
          type: savedNotification.type,
          message: savedNotification.message,
          createdAt: savedNotification.createdAt,
          relatedUser: savedNotification.relatedUser?.toString()
        });

        // Verify notification was saved by querying it
        const verifyNotification = await Notification.findById(savedNotification._id);
        if (verifyNotification) {
          console.log(`✅ Notification verified in database:`, {
            id: verifyNotification._id.toString(),
            user: verifyNotification.user.toString(),
            userType: typeof verifyNotification.user,
            type: verifyNotification.type,
            isRead: verifyNotification.isRead
          });
          
          // Also verify it can be found by user query using both ObjectId and string
          const userNotificationsById = await Notification.find({ 
            user: notificationUserId,
            type: 'likes'
          }).limit(5).sort({ createdAt: -1 });
          
          const userNotificationsByString = await Notification.find({ 
            user: notificationUserId.toString(),
            type: 'likes'
          }).limit(5).sort({ createdAt: -1 });
          
          console.log(`✅ Notification query results:`, {
            queryByObjectId: {
              count: userNotificationsById.length,
              found: userNotificationsById.length > 0,
              notifications: userNotificationsById.map(n => ({
                id: n._id.toString(),
                userId: n.user.toString(),
                message: n.message,
                createdAt: n.createdAt
              }))
            },
            queryByString: {
              count: userNotificationsByString.length,
              found: userNotificationsByString.length > 0,
              notifications: userNotificationsByString.map(n => ({
                id: n._id.toString(),
                userId: n.user.toString(),
                message: n.message,
                createdAt: n.createdAt
              }))
            }
          });
        } else {
          console.error(`❌ Notification not found in database after save!`);
        }
      } catch (notifError) {
        console.error('❌ Error creating story reaction notification:', {
          error: notifError.message,
          stack: notifError.stack,
          storyId: storyId.toString(),
          storyOwnerId: storyOwnerIdStr,
          userId: userIdStr
        });
        // Don't fail the reaction if notification fails
      }
    } else {
      console.log(`⏭️ Skipping notification creation:`, {
        isNewReaction,
        isOwnStory,
        storyOwnerId: storyOwnerIdStr,
        reactorId: userIdStr
      });
    }

    const responseData = {
      success: true,
      story,
      message: isRemoved ? 'Reaction removed successfully' : 'Reaction added successfully',
      isNewReaction: isNewReaction && !isRemoved, // Include this so frontend knows if notification was created
      isRemoved, // Let frontend know if reaction was removed
    };
    
    console.log(`📤 Sending story reaction response:`, {
      success: responseData.success,
      isNewReaction: responseData.isNewReaction,
      isRemoved: responseData.isRemoved,
      storyId: storyId.toString(),
      reactionsCount: story.reactions.length,
      responseKeys: Object.keys(responseData)
    });
    
    res.json(responseData);
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

    const storyOwnerId = story.user;
    const replyText = message.trim();

    // Add reply to story
    story.replies.push({
      user: userId,
      message: replyText,
      createdAt: new Date(),
    });

    await story.save();
    await story.populate('replies.user', 'username profile');

    // Create notification
    const notification = new Notification({
      user: storyOwnerId,
      type: 'comments',
      title: 'Story Reply',
      message: `${req.user.username} replied to your story`,
      relatedUser: userId,
      relatedVideo: null,
      metadata: { storyId: storyId.toString() }
    });
    await notification.save();

    // Also create a message in the conversation system
    try {
      // Find or create conversation between story owner and reply sender
      let conversation = await Conversation.findOne({
        participants: { $all: [storyOwnerId, userId] },
        isGroup: false
      });

      if (!conversation) {
        // Create new conversation
        conversation = new Conversation({
          participants: [storyOwnerId, userId],
          isGroup: false,
        });
        await conversation.save();
        console.log(`✅ Created new conversation between story owner and reply sender`);
      }

      // Create message in conversation
      const conversationMessage = new Message({
        conversation: conversation._id,
        sender: userId,
        receiver: storyOwnerId,
        messageType: 'text',
        content: {
          text: `Replied to your story: ${replyText}`,
        },
      });

      await conversationMessage.save();

      // Update conversation
      conversation.lastMessage = conversationMessage._id;
      conversation.lastMessageAt = new Date();
      
      // Update unread count for story owner
      if (!conversation.unreadCounts || typeof conversation.unreadCounts.get !== 'function') {
        conversation.unreadCounts = new Map();
      }
      const currentUnread = conversation.unreadCounts.get(storyOwnerId.toString()) || 0;
      conversation.unreadCounts.set(storyOwnerId.toString(), currentUnread + 1);
      
      await conversation.save();

      console.log(`✅ Story reply also created as message in conversation ${conversation._id}`);
    } catch (messageError) {
      // Don't fail the story reply if message creation fails
      console.error('⚠️ Error creating message from story reply:', messageError);
    }

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

    console.log(`🗑️ Delete story request: storyId=${storyId}, userId=${userId}`);

    const story = await Story.findById(storyId);

    if (!story) {
      console.log(`❌ Story not found: ${storyId}`);
      return res.status(404).json({
        success: false,
        message: 'Story not found',
      });
    }

    // Check ownership
    if (story.user.toString() !== userId.toString()) {
      console.log(`❌ Unauthorized delete attempt: story owner=${story.user}, requester=${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this story',
      });
    }

    console.log(`✅ Story found and authorized for deletion: ${storyId}`);

    // Delete media file
    if (story.mediaUrl) {
      try {
        // Handle both absolute URLs and relative paths
        let filePath = story.mediaUrl;
        
        // If it's a full URL, extract the path
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          // Extract path from URL like: http://localhost:5000/uploads/stories/filename
          const urlParts = new URL(filePath);
          filePath = urlParts.pathname; // This gives /uploads/stories/filename
        }
        
        // Convert to filesystem path (remove leading /)
        if (filePath.startsWith('/')) {
          filePath = filePath.substring(1);
        }
        
        // Construct full file path - try multiple possible locations
        const possiblePaths = [
          path.join(__dirname, '..', filePath),
          path.join(UPLOADS_DIR, filePath.replace(/^uploads\//, '')),
          path.join(storiesUploadDir, path.basename(filePath)),
        ];
        
        let deleted = false;
        for (const fullPath of possiblePaths) {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`✅ Deleted story media file: ${fullPath}`);
            deleted = true;
            break;
          }
        }
        
        if (!deleted) {
          console.warn(`⚠️ Story media file not found: ${story.mediaUrl}`);
        }
      } catch (fileError) {
        console.error('⚠️ Error deleting story media file:', fileError.message);
        // Continue with story deletion even if file deletion fails
      }
    }

    await Story.findByIdAndDelete(storyId);

    console.log(`✅ Story deleted successfully: ${storyId}`);

    res.json({
      success: true,
      message: 'Story deleted successfully',
      storyId: storyId,
    });
  } catch (error) {
    console.error('❌ Error deleting story:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to delete story',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

// ==================== GET STORY DETAILS ====================
router.get('/:storyId', async (req, res) => {
  try {
    const storyId = req.params.storyId;
    
    // Try to get current user from token (optional auth)
    let currentUserId = null;
    try {
      let token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.userId) {
          const authUser = await User.findById(decoded.userId);
          if (authUser) {
            currentUserId = authUser._id;
          }
        }
      }
    } catch (authError) {
      // Auth is optional, continue without it
    }

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

// ==================== CLEANUP EXPIRED STORIES ====================
// This function should be called periodically (e.g., every hour) to clean up expired stories
const cleanupExpiredStories = async () => {
  try {
    const expiredStories = await Story.find({
      expiresAt: { $lt: new Date() },
    });

    let deletedCount = 0;
    for (const story of expiredStories) {
      // Delete media file
      if (story.mediaUrl) {
        try {
          let filePath = story.mediaUrl;
          
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            const urlParts = new URL(filePath);
            filePath = urlParts.pathname;
          }
          
          if (filePath.startsWith('/')) {
            filePath = filePath.substring(1);
          }
          
          const possiblePaths = [
            path.join(__dirname, '..', filePath),
            path.join(UPLOADS_DIR, filePath.replace(/^uploads\//, '')),
            path.join(storiesUploadDir, path.basename(filePath)),
          ];
          
          for (const fullPath of possiblePaths) {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              break;
            }
          }
        } catch (fileError) {
          console.error('Error deleting expired story file:', fileError.message);
        }
      }
      
      // Delete story from database
      await Story.findByIdAndDelete(story._id);
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired stories`);
    }
  } catch (error) {
    console.error('Error cleaning up expired stories:', error);
  }
};

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredStories, 60 * 60 * 1000); // Every hour
  // Run immediately on startup
  cleanupExpiredStories();
}

module.exports = router;

