const express = require('express');
const Collaboration = require('../models/Collaboration');
const Video = require('../models/Video');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== REQUEST COLLABORATION ====================
router.post('/:videoId/collaborate', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user._id;
    const { recipientId, message } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required',
      });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Check if user owns the video
    if (video.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only video owner can request collaboration',
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found',
      });
    }

    // Check if already requested
    const existingCollaboration = await Collaboration.findOne({
      video: videoId,
      requester: userId,
      recipient: recipientId,
      status: 'pending',
    });

    if (existingCollaboration) {
      return res.status(400).json({
        success: false,
        message: 'Collaboration request already sent',
      });
    }

    // Create collaboration request
    const collaboration = new Collaboration({
      video: videoId,
      requester: userId,
      recipient: recipientId,
      message: message || '',
      status: 'pending',
    });

    await collaboration.save();
    await collaboration.populate('requester', 'username profile');
    await collaboration.populate('recipient', 'username profile');
    await collaboration.populate('video', 'url thumbnail description');

    // Create notification
    const notification = new Notification({
      user: recipientId,
      type: 'system',
      title: 'Collaboration Request',
      message: `${req.user.username} requested collaboration on a video`,
      relatedUser: userId,
      relatedVideo: videoId,
      metadata: { collaborationId: collaboration._id.toString() }
    });
    await notification.save();

    res.status(201).json({
      success: true,
      collaboration,
      message: 'Collaboration request sent successfully',
    });
  } catch (error) {
    console.error('Error requesting collaboration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request collaboration',
      error: error.message,
    });
  }
});

// ==================== ACCEPT COLLABORATION ====================
router.post('/:collaborationId/accept', authMiddleware, async (req, res) => {
  try {
    const collaborationId = req.params.collaborationId;
    const userId = req.user._id;

    const collaboration = await Collaboration.findById(collaborationId);

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found',
      });
    }

    // Check if user is the recipient
    if (collaboration.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this collaboration',
      });
    }

    if (collaboration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Collaboration request is not pending',
      });
    }

    // Update collaboration status
    collaboration.status = 'accepted';
    collaboration.respondedAt = new Date();
    collaboration.collaborators.push(collaboration.recipient);
    await collaboration.save();

    // Update video collaborators
    const video = await Video.findById(collaboration.video);
    if (video && !video.collaborators) {
      video.collaborators = [];
    }
    if (video && !video.collaborators.includes(collaboration.recipient)) {
      video.collaborators.push(collaboration.recipient);
      await video.save();
    }

    await collaboration.populate('requester', 'username profile');
    await collaboration.populate('recipient', 'username profile');
    await collaboration.populate('video', 'url thumbnail description');

    // Create notification
    const notification = new Notification({
      user: collaboration.requester,
      type: 'system',
      title: 'Collaboration Accepted',
      message: `${req.user.username} accepted your collaboration request`,
      relatedUser: userId,
      relatedVideo: collaboration.video._id,
      metadata: { collaborationId: collaborationId.toString() }
    });
    await notification.save();

    res.json({
      success: true,
      collaboration,
      message: 'Collaboration accepted successfully',
    });
  } catch (error) {
    console.error('Error accepting collaboration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept collaboration',
      error: error.message,
    });
  }
});

// ==================== REJECT COLLABORATION ====================
router.post('/:collaborationId/reject', authMiddleware, async (req, res) => {
  try {
    const collaborationId = req.params.collaborationId;
    const userId = req.user._id;

    const collaboration = await Collaboration.findById(collaborationId);

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found',
      });
    }

    // Check if user is the recipient
    if (collaboration.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this collaboration',
      });
    }

    if (collaboration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Collaboration request is not pending',
      });
    }

    // Update collaboration status
    collaboration.status = 'rejected';
    collaboration.respondedAt = new Date();
    await collaboration.save();

    await collaboration.populate('requester', 'username profile');
    await collaboration.populate('recipient', 'username profile');

    res.json({
      success: true,
      collaboration,
      message: 'Collaboration rejected',
    });
  } catch (error) {
    console.error('Error rejecting collaboration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject collaboration',
      error: error.message,
    });
  }
});

// ==================== GET PENDING COLLABORATIONS ====================
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const type = req.query.type || 'received'; // received, sent

    let query = { status: 'pending' };

    if (type === 'received') {
      query.recipient = userId;
    } else if (type === 'sent') {
      query.requester = userId;
    }

    const collaborations = await Collaboration.find(query)
      .populate('requester', 'username profile')
      .populate('recipient', 'username profile')
      .populate('video', 'url thumbnail description')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      collaborations,
      count: collaborations.length,
    });
  } catch (error) {
    console.error('Error fetching pending collaborations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending collaborations',
      error: error.message,
    });
  }
});

// ==================== GET VIDEO COLLABORATIONS ====================
router.get('/video/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    const collaborations = await Collaboration.find({
      video: videoId,
      status: 'accepted',
    })
      .populate('requester', 'username profile')
      .populate('recipient', 'username profile')
      .populate('collaborators', 'username profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      collaborations,
      count: collaborations.length,
    });
  } catch (error) {
    console.error('Error fetching video collaborations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video collaborations',
      error: error.message,
    });
  }
});

module.exports = router;

