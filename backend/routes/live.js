/**
 * Live Stream Routes
 * 
 * Recent Changes:
 * - Added roomId support for WebRTC-based live streaming
 * - Enhanced notification system for live stream start events
 * - Improved error handling and defensive programming for streamer population
 * - Added room-based stream lookup endpoint for shareable links
 * - Enhanced viewer count tracking and management
 * - Improved gift system integration with transactions
 */

const express = require('express');
const LiveStream = require('../models/LiveStream');
const LiveChat = require('../models/LiveChat');
const User = require('../models/User');
const Gift = require('../models/Gift');
const GiftType = require('../models/GiftType');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();
const { emitNotification } = require('../socket/socketServer');
const { getIO } = require('../socket/socketServer');
const rateLimit = require('express-rate-limit');

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

    // Generate unique stream key and room ID
    const streamKey = crypto.randomBytes(32).toString('hex');
    const roomId = crypto.randomBytes(16).toString('hex');
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
      roomId, // Add roomId for WebRTC
      isPrivate: isPrivate || false,
      scheduledStartTime: scheduledStartTime || null,
      status: scheduledStartTime ? 'scheduled' : 'live',
      actualStartTime: scheduledStartTime ? null : new Date(),
    });

    await liveStream.save();
    await liveStream.populate('streamer', 'username profile');

    // Notify followers that streamer started a live
    try {
      const streamer = await User.findById(userId).select('username followers');
      if (streamer && Array.isArray(streamer.followers) && streamer.followers.length > 0) {
        const notification = {
          type: 'live_started',
          stream: {
            id: liveStream._id,
            roomId: liveStream.roomId,
            title: liveStream.title,
            thumbnail: liveStream.thumbnail || ''
          },
          streamer: {
            id: streamer._id,
            username: streamer.username
          },
          createdAt: new Date()
        };

        streamer.followers.forEach(followerId => {
          try {
            emitNotification(followerId.toString(), notification);
          } catch (err) {
            // Non-fatal: continue notifying other followers
            console.error('Failed to emit live_started notification to', followerId, err?.message || err);
          }
        });
      }
    } catch (err) {
      console.error('Error sending live-started notifications:', err);
    }

    res.status(201).json({
      success: true,
      stream: liveStream,
      rtmpUrl,
      streamKey,
      roomId: liveStream.roomId,
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
      .select('_id streamer title thumbnail viewers roomId category createdAt')
      .sort({ viewers: -1, createdAt: -1 })
      .limit(50);

    // Format response for frontend (defensive: streamer may be null)
    const formattedStreams = activeStreams.map(stream => {
      const streamer = stream.streamer || {};
      const username = streamer.username || 'Unknown';
      const profilePicture = streamer.profile?.profilePicture || '';
      const thumbnail = stream.thumbnail || profilePicture || '';

      if (!stream.streamer) {
        console.warn(`Live stream ${stream._id} missing populated streamer field`);
      }

      return {
        id: stream._id,
        roomId: stream.roomId,
        username,
        profilePicture,
        title: stream.title,
        thumbnail,
        viewerCount: stream.viewers,
        category: stream.category,
        createdAt: stream.createdAt
      };
    });

    res.json({
      success: true,
      streams: formattedStreams,
      count: formattedStreams.length,
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

// ==================== GET STREAM BY ROOM ID (for shareable links) ====================
// NOTE: This route MUST be before /:streamId to avoid 'room' being matched as streamId
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const liveStream = await LiveStream.findOne({ roomId })
      .populate('streamer', 'username profile')
      .populate('guests', 'username profile');

    if (!liveStream) {
      return res.status(404).json({
        success: false,
        message: 'Live stream not found',
      });
    }

    // Return formatted stream data for viewer
    const streamData = {
      id: liveStream._id,
      roomId: liveStream.roomId,
      title: liveStream.title,
      description: liveStream.description,
      category: liveStream.category,
      status: liveStream.status,
      hostId: liveStream.streamer._id,
      hostUsername: liveStream.streamer.username,
      hostProfile: liveStream.streamer.profile,
      thumbnail: liveStream.thumbnail,
      streamUrl: liveStream.streamUrl,
      viewers: liveStream.viewers,
      likes: liveStream.likes,
      gifts: liveStream.gifts,
      giftValue: liveStream.giftValue,
      createdAt: liveStream.createdAt,
      actualStartTime: liveStream.actualStartTime,
    };

    res.json({
      success: true,
      stream: streamData,
    });
  } catch (error) {
    console.error('Error fetching stream by room ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stream',
      error: error.message,
    });
  }
});

// ==================== GET USER'S LIVE STREAMS ====================
// NOTE: This route MUST be before /:streamId to avoid 'user' being matched as streamId
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
// Rate limiter for chat: limit per user (or IP if anonymous)
const chatLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // max 5 messages per window
  message: { success: false, message: 'Too many messages. Slow down.' },
  keyGenerator: (req) => {
    // use user id if available, otherwise IP
    return (req.user && req.user._id) ? req.user._id.toString() : req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/:streamId/chat', authMiddleware, chatLimiter, async (req, res) => {
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

    // Server-side ban check
    const bannedEntry = (liveStream.bannedUsers || []).find(b => b.user?.toString() === userId.toString());
    if (bannedEntry) {
      const now = new Date();
      if (!bannedEntry.bannedUntil || new Date(bannedEntry.bannedUntil) > now) {
        return res.status(403).json({ success: false, message: 'You are banned from this stream' });
      }
    }

    // Simple spam/bot protection
    if (req.user.isBot || (req.user.spamScore || 0) > 80) {
      return res.status(403).json({ success: false, message: 'Message rejected' });
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

    // Emit to room via socket so viewers get real-time update
    try {
      const io = getIO();
      if (io) {
        io.to(`live:${streamId}:host`).to(`live:${streamId}:viewers`).to(`live:${streamId}:guests`).emit('live:chat', { message: chatMessage, timestamp: new Date() });
      }
    } catch (err) {
      console.warn('Failed to emit chat via socket:', err?.message || err);
    }

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

    const giftType = await GiftType.findById(giftId);

    if (!giftType || !giftType.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Gift type not found or inactive',
      });
    }

    // Create the actual gift record
    const gift = new Gift({
      sender: userId,
      receiver: liveStream.streamer._id,
      liveStream: streamId,
      giftType: giftType.name,
      giftName: giftType.name,
      giftImage: giftType.image,
      value: giftType.value,
      currency: giftType.currency
    });
    
    await gift.save();
    
    // Create chat message for gift
    const chatMessage = new LiveChat({
      stream: streamId,
      user: userId,
      message: `sent a ${giftType.name}`,
      type: 'gift',
      gift: gift._id,
    });

    await chatMessage.save();

    // Update stream gift stats
    liveStream.gifts += 1;
    liveStream.giftValue += giftType.value;
    await liveStream.save();

    // Create transaction for gift
    const transaction = new Transaction({
      user: userId,
      type: 'gift_sent',
      amount: giftType.value,
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
      amount: giftType.value,
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
      gift: gift,
      giftType: giftType,
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

// ==================== DELETE CHAT MESSAGE (MODERATION) ====================
router.delete('/:streamId/chat/:chatId', authMiddleware, async (req, res) => {
  try {
    const { streamId, chatId } = req.params;
    const userId = req.user._id;

    const liveStream = await LiveStream.findById(streamId).populate('streamer');
    if (!liveStream) return res.status(404).json({ success: false, message: 'Stream not found' });

    // Only streamer or moderators/admins can delete messages
    if (liveStream.streamer._id.toString() !== userId.toString() && !['moderator','admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const chat = await LiveChat.findById(chatId);
    if (!chat || chat.stream.toString() !== streamId.toString()) {
      return res.status(404).json({ success: false, message: 'Chat message not found' });
    }

    await LiveChat.findByIdAndDelete(chatId);

    // Emit deletion to live room
    const io = getIO();
    if (io) io.to(`live:${streamId}:viewers`).emit('live:chat-deleted', { chatId });

    res.json({ success: true, message: 'Chat message deleted' });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    res.status(500).json({ success: false, message: 'Failed to delete chat message', error: error.message });
  }
});

// ==================== BAN USER FROM STREAM ====================
router.post('/:streamId/ban', authMiddleware, async (req, res) => {
  try {
    const { streamId } = req.params;
    const { userId: targetUserId, minutes = 0, reason = '' } = req.body;
    const actorId = req.user._id;

    const liveStream = await LiveStream.findById(streamId).populate('streamer');
    if (!liveStream) return res.status(404).json({ success: false, message: 'Stream not found' });

    // Only streamer or moderators/admins can ban
    if (liveStream.streamer._id.toString() !== actorId.toString() && !['moderator','admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const bannedUntil = minutes > 0 ? new Date(Date.now() + minutes * 60000) : null;

    // Upsert ban entry
    const existing = liveStream.bannedUsers.find(b => b.user?.toString() === targetUserId.toString());
    if (existing) {
      existing.bannedUntil = bannedUntil;
      existing.reason = reason;
    } else {
      liveStream.bannedUsers.push({ user: targetUserId, bannedUntil, reason });
    }

    await liveStream.save();

    // Notify user and room
    const io = getIO();
    if (io) {
      io.to(`user:${targetUserId}`).emit('live:banned', { streamId, reason, bannedUntil });
      io.to(`live:${streamId}:viewers`).emit('live:user-banned', { userId: targetUserId, reason, bannedUntil });
    }

    res.json({ success: true, message: 'User banned from stream', bannedUntil });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ success: false, message: 'Failed to ban user', error: error.message });
  }
});

// ==================== UNBAN USER FROM STREAM ====================
router.post('/:streamId/unban', authMiddleware, async (req, res) => {
  try {
    const { streamId } = req.params;
    const { userId: targetUserId } = req.body;
    const actorId = req.user._id;

    const liveStream = await LiveStream.findById(streamId).populate('streamer');
    if (!liveStream) return res.status(404).json({ success: false, message: 'Stream not found' });

    if (liveStream.streamer._id.toString() !== actorId.toString() && !['moderator','admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    liveStream.bannedUsers = liveStream.bannedUsers.filter(b => b.user?.toString() !== targetUserId.toString());
    await liveStream.save();

    const io = getIO();
    if (io) io.to(`live:${streamId}:viewers`).emit('live:user-unbanned', { userId: targetUserId });

    res.json({ success: true, message: 'User unbanned' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ success: false, message: 'Failed to unban user', error: error.message });
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

// ==================== GET AVAILABLE GIFT TYPES ====================
router.get('/gift-types', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    
    const query = { isActive: true };
    if (category !== 'all') {
      query.category = category;
    }

    const giftTypes = await GiftType.find(query)
      .sort({ sortOrder: 1, value: 1 });

    res.json({
      success: true,
      giftTypes,
      count: giftTypes.length,
    });
  } catch (error) {
    console.error('Error fetching gift types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift types',
      error: error.message,
    });
  }
});

module.exports = router;

