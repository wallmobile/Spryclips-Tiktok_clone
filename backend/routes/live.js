const express = require('express');
const LiveStream = require('../models/LiveStream');
const LiveChat = require('../models/LiveChat');
const User = require('../models/User');
const Gift = require('../models/Gift');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// ==================== START LIVE STREAM ====================
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, isPrivate, scheduledStartTime } = req.body;
    const userId = req.user._id;

    // Check if user already has an active stream
    const activeStream = await LiveStream.findOne({
      streamer: userId,
      status: 'live',
    });

    if (activeStream) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active live stream',
      });
    }

    // Generate unique stream key
    const streamKey = crypto.randomBytes(32).toString('hex');
    const rtmpUrl = `rtmp://your-rtmp-server.com/live/${streamKey}`;
    const streamUrl = `https://your-streaming-server.com/live/${streamKey}`;

    // Create live stream
    const liveStream = new LiveStream({
      streamer: userId,
      title: title || 'Live Stream',
      description: description || '',
      category: category || 'all',
      streamUrl,
      rtmpUrl,
      streamKey,
      isPrivate: isPrivate || false,
      scheduledStartTime: scheduledStartTime || null,
      status: scheduledStartTime ? 'scheduled' : 'live',
      actualStartTime: scheduledStartTime ? null : new Date(),
    });

    await liveStream.save();
    await liveStream.populate('streamer', 'username profile');

    res.status(201).json({
      success: true,
      stream: liveStream,
      rtmpUrl,
      streamKey,
      message: 'Live stream started successfully',
    });
  } catch (error) {
    console.error('Error starting live stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start live stream',
      error: error.message,
    });
  }
});

// ==================== END LIVE STREAM ====================
router.post('/:streamId/end', authMiddleware, async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const userId = req.user._id;

    const liveStream = await LiveStream.findById(streamId);

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    // Check ownership
    if (liveStream.streamer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to end this stream',
      });
    }

    if (liveStream.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Stream already ended',
      });
    }

    liveStream.status = 'ended';
    liveStream.endTime = new Date();
    await liveStream.save();

    res.json({
      success: true,
      message: 'Live stream ended successfully',
      stream: liveStream,
    });
  } catch (error) {
    console.error('Error ending live stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end live stream',
      error: error.message,
    });
  }
});

// ==================== GET ACTIVE STREAMS ====================
router.get('/active', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const query = { status: 'live' };

    if (category !== 'all') {
      query.category = category;
    }

    const activeStreams = await LiveStream.find(query)
      .populate('streamer', 'username profile')
      .sort({ viewers: -1, createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      streams: activeStreams,
      count: activeStreams.length,
    });
  } catch (error) {
    console.error('Error fetching active streams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active streams',
      error: error.message,
    });
  }
});

// ==================== GET STREAM DETAILS ====================
router.get('/:streamId', async (req, res) => {
  try {
    const streamId = req.params.streamId;

    const liveStream = await LiveStream.findById(streamId)
      .populate('streamer', 'username profile')
      .populate('guests', 'username profile');

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    // Increment total views if not the streamer
    if (req.user && liveStream.streamer._id.toString() !== req.user._id.toString()) {
      liveStream.totalViews += 1;
      await liveStream.save();
    }

    res.json({
      success: true,
      stream: liveStream,
    });
  } catch (error) {
    console.error('Error fetching stream details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stream details',
      error: error.message,
    });
  }
});

// ==================== UPDATE VIEWER COUNT ====================
router.post('/:streamId/viewer', async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const { action } = req.body; // 'join' or 'leave'

    const liveStream = await LiveStream.findById(streamId);

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    if (action === 'join') {
      liveStream.viewers += 1;
      if (liveStream.viewers > liveStream.maxViewers) {
        liveStream.maxViewers = liveStream.viewers;
      }
    } else if (action === 'leave') {
      liveStream.viewers = Math.max(0, liveStream.viewers - 1);
    }

    await liveStream.save();

    res.json({
      success: true,
      viewers: liveStream.viewers,
    });
  } catch (error) {
    console.error('Error updating viewer count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update viewer count',
      error: error.message,
    });
  }
});

// ==================== SEND LIVE CHAT MESSAGE ====================
router.post('/:streamId/chat', authMiddleware, async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const { message, type } = req.body;
    const userId = req.user._id;

    const liveStream = await LiveStream.findById(streamId);

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    if (liveStream.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'Stream is not live',
      });
    }

    // Create chat message
    const chatMessage = new LiveChat({
      stream: streamId,
      user: userId,
      message: message || '',
      type: type || 'text',
    });

    await chatMessage.save();
    await chatMessage.populate('user', 'username profile');

    res.status(201).json({
      success: true,
      message: chatMessage,
    });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send chat message',
      error: error.message,
    });
  }
});

// ==================== GET LIVE CHAT MESSAGES ====================
router.get('/:streamId/chat', async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const limit = parseInt(req.query.limit) || 50;

    const chatMessages = await LiveChat.find({ stream: streamId })
      .populate('user', 'username profile')
      .populate('gift')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      messages: chatMessages.reverse(), // Show oldest first
      count: chatMessages.length,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat messages',
      error: error.message,
    });
  }
});

// ==================== SEND GIFT ON LIVE STREAM ====================
router.post('/:streamId/gift', authMiddleware, async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const { giftId } = req.body;
    const userId = req.user._id;

    const liveStream = await LiveStream.findById(streamId).populate('streamer');

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    if (liveStream.status !== 'live') {
      return res.status(400).json({
        success: false,
        message: 'Stream is not live',
      });
    }

    const gift = await Gift.findById(giftId);

    if (!gift || !gift.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Gift not found or inactive',
      });
    }

    // Create chat message for gift
    const chatMessage = new LiveChat({
      stream: streamId,
      user: userId,
      message: `sent a ${gift.name}`,
      type: 'gift',
      gift: giftId,
    });

    await chatMessage.save();

    // Update stream gift stats
    liveStream.gifts += 1;
    liveStream.giftValue += gift.value;
    await liveStream.save();

    // Create transaction for gift
    const transaction = new Transaction({
      user: userId,
      type: 'gift_sent',
      amount: gift.value,
      status: 'completed',
      relatedEntity: streamId,
      relatedEntityType: 'LiveStream',
      description: `Gift sent to ${liveStream.streamer.username}`,
    });

    await transaction.save();

    // Create transaction for streamer (earnings)
    const streamerTransaction = new Transaction({
      user: liveStream.streamer._id,
      type: 'gift_received',
      amount: gift.value,
      status: 'completed',
      relatedEntity: streamId,
      relatedEntityType: 'LiveStream',
      description: `Gift received from ${req.user.username}`,
    });

    await streamerTransaction.save();

    // Create notification
    const notification = new Notification({
      recipient: liveStream.streamer._id,
      sender: userId,
      type: 'live',
      message: `${req.user.username} sent you a gift on your live stream`,
      link: `/live/${streamId}`,
      entityId: streamId,
      entityModel: 'LiveStream',
    });

    await notification.save();

    await chatMessage.populate('user', 'username profile');
    await chatMessage.populate('gift');

    res.status(201).json({
      success: true,
      message: chatMessage,
      giftValue: liveStream.giftValue,
    });
  } catch (error) {
    console.error('Error sending gift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send gift',
      error: error.message,
    });
  }
});

// ==================== LIKE/UNLIKE LIVE STREAM ====================
router.post('/:streamId/like', authMiddleware, async (req, res) => {
  try {
    const streamId = req.params.streamId;
    const userId = req.user._id;

    const liveStream = await LiveStream.findById(streamId);

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    const isLiked = liveStream.likedBy.includes(userId);

    if (isLiked) {
      liveStream.likedBy = liveStream.likedBy.filter(id => id.toString() !== userId.toString());
      liveStream.likes -= 1;
    } else {
      liveStream.likedBy.push(userId);
      liveStream.likes += 1;
    }

    await liveStream.save();

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: liveStream.likes,
    });
  } catch (error) {
    console.error('Error liking stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like stream',
      error: error.message,
    });
  }
});

// ==================== GET USER'S LIVE STREAMS ====================
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const status = req.query.status || 'all';

    const query = { streamer: userId };
    if (status !== 'all') {
      query.status = status;
    }

    const streams = await LiveStream.find(query)
      .populate('streamer', 'username profile')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      streams,
      count: streams.length,
    });
  } catch (error) {
    console.error('Error fetching user streams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user streams',
      error: error.message,
    });
  }
});

module.exports = router;

