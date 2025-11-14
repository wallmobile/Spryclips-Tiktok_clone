const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== GET ALL NOTIFICATIONS ====================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const type = req.query.type; // Filter by type
    const unreadOnly = req.query.unreadOnly === 'true';

    let query = { user: req.user._id };
    if (type) {
      query.type = type;
    }
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('relatedUser', 'username profile.avatar profile.displayName')
      .populate('relatedVideo', 'url thumbnail description')
      .populate('relatedComment', 'text')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      notifications: notifications,
      unreadCount: unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// ==================== GET UNREAD COUNT ====================
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

// ==================== MARK NOTIFICATION AS READ ====================
router.put('/:notificationId/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// ==================== MARK ALL AS READ ====================
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message
    });
  }
});

// ==================== DELETE NOTIFICATION ====================
router.delete('/:notificationId', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await Notification.findByIdAndDelete(req.params.notificationId);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// ==================== DELETE ALL NOTIFICATIONS ====================
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id
    });

    res.json({
      success: true,
      message: 'All notifications deleted',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete all notifications',
      error: error.message
    });
  }
});

// ==================== HELPER FUNCTION TO CREATE NOTIFICATION ====================
// This function can be used from other routes to create notifications
async function createNotification(data) {
  try {
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

    // Populate and return
    return await Notification.findById(notification._id)
      .populate('relatedUser', 'username profile.avatar')
      .populate('relatedVideo', 'url thumbnail')
      .lean();
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Export helper function
module.exports.createNotification = createNotification;

module.exports = router;

