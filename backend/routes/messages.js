const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { getIO } = require('../socket/socketServer');
const router = express.Router();

// ==================== GET ALL CONVERSATIONS ====================
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username profile.avatar profile.displayName')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format conversations
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );

      // Handle unreadCounts - when using .lean(), Map becomes plain object
      const unreadCountsObj = conv.unreadCounts || {};
      const unreadCount = typeof unreadCountsObj.get === 'function' 
        ? unreadCountsObj.get(req.user._id.toString()) 
        : unreadCountsObj[req.user._id.toString()];

      return {
        _id: conv._id,
        isGroup: conv.isGroup,
        groupName: conv.groupName,
        groupImage: conv.groupImage,
        otherParticipant: otherParticipant || null,
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unreadCount || 0,
        isPinned: conv.pinnedBy?.includes(req.user._id) || false,
        isArchived: conv.archivedBy?.includes(req.user._id) || false,
        isMuted: conv.mutedBy?.includes(req.user._id) || false
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// ==================== GET OR CREATE CONVERSATION ====================
router.post('/conversations', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if userId is a valid ObjectId, if not try to find user by username
    let targetUserId = userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      // Try to find user by username
      const targetUser = await User.findOne({ 
        $or: [
          { username: userId },
          { username: userId.toLowerCase() },
          { 'profile.displayName': userId }
        ]
      });
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      targetUserId = targetUser._id;
    } else {
      // Verify the user exists
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    if (targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create conversation with yourself'
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, targetUserId] },
      isGroup: false
    })
      .populate('participants', 'username profile.avatar profile.displayName')
      .lean();

    if (!conversation) {
      // Create new conversation
      const newConversation = new Conversation({
        participants: [req.user._id, targetUserId],
        isGroup: false
      });

      await newConversation.save();

      conversation = await Conversation.findById(newConversation._id)
        .populate('participants', 'username profile.avatar profile.displayName')
        .lean();
    }

    res.json({
      success: true,
      conversation: conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message
    });
  }
});

// ==================== GET MESSAGES IN CONVERSATION ====================
router.get('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access this conversation'
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false
    })
      .populate('sender', 'username profile.avatar profile.displayName')
      .populate('receiver', 'username profile.avatar profile.displayName')
      .populate('replyTo', 'content.text sender')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.user._id,
        isRead: false
      },
      {
        $set: { isRead: true, readAt: new Date() }
      }
    );

    // Update unread count - ensure unreadCounts is a Map
    if (!conversation.unreadCounts || typeof conversation.unreadCounts.set !== 'function') {
      conversation.unreadCounts = new Map();
    }
    conversation.unreadCounts.set(req.user._id.toString(), 0);
    await conversation.save();

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      conversation: conversation
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// ==================== SEND MESSAGE ====================
router.post('/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType, replyTo } = req.body;

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to send message in this conversation'
      });
    }

    // Get receiver
    const receiver = conversation.participants.find(
      p => p.toString() !== req.user._id.toString()
    );

    if (!receiver) {
      return res.status(400).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      receiver: receiver,
      messageType: messageType || 'text',
      content: {
        text: content?.text || '',
        mediaUrl: content?.mediaUrl || '',
        mediaType: content?.mediaType || '',
        thumbnail: content?.thumbnail || ''
      },
      replyTo: replyTo || null
    });

    await message.save();

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    
    // Update unread count for receiver - ensure unreadCounts is a Map
    if (!conversation.unreadCounts || typeof conversation.unreadCounts.get !== 'function') {
      conversation.unreadCounts = new Map();
    }
    const currentUnread = conversation.unreadCounts.get(receiver.toString()) || 0;
    conversation.unreadCounts.set(receiver.toString(), currentUnread + 1);
    
    await conversation.save();

    // Populate message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profile.avatar profile.displayName')
      .populate('receiver', 'username profile.avatar profile.displayName')
      .populate('replyTo', 'content.text sender')
      .lean();

    // Emit socket event for real-time message delivery
    const io = getIO();
    if (io) {
      console.log(`[Socket] Emitting message to conversation:${conversationId} and user:${receiver.toString()}`);
      
      // Send to conversation room
      io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        message: populatedMessage
      });
      
      // Send to receiver's personal room
      io.to(`user:${receiver.toString()}`).emit('message:received', {
        conversationId,
        message: populatedMessage
      });
      
      // Also send to sender for confirmation
      io.to(`user:${req.user._id.toString()}`).emit('message:sent', {
        conversationId,
        message: populatedMessage
      });
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// ==================== MARK MESSAGE AS READ ====================
router.put('/messages/:messageId/read', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    // Update conversation unread count
    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      // Ensure unreadCounts is a Map
      if (!conversation.unreadCounts || typeof conversation.unreadCounts.set !== 'function') {
        conversation.unreadCounts = new Map();
      }
      conversation.unreadCounts.set(req.user._id.toString(), 0);
      await conversation.save();
    }

    // Emit socket event for read receipt
    const io = getIO();
    if (io) {
      // Send to sender to show read status (double tick)
      io.to(`user:${message.sender.toString()}`).emit('message:read', {
        messageId: message._id,
        conversationId: message.conversation,
        readAt: message.readAt,
        readBy: req.user._id
      });
      
      // Also emit to conversation room
      io.to(`conversation:${message.conversation}`).emit('message:read', {
        messageId: message._id,
        conversationId: message.conversation,
        readAt: message.readAt,
        readBy: req.user._id
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
});

// ==================== DELETE MESSAGE ====================
router.delete('/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this message'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

// ==================== REACT TO MESSAGE ====================
router.post('/messages/:messageId/react', authMiddleware, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user already reacted
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReaction) {
      // Update reaction
      existingReaction.emoji = emoji;
      existingReaction.createdAt = new Date();
    } else {
      // Add new reaction
      message.reactions.push({
        user: req.user._id,
        emoji: emoji,
        createdAt: new Date()
      });
    }

    await message.save();

    res.json({
      success: true,
      message: 'Reaction added',
      reactions: message.reactions
    });
  } catch (error) {
    console.error('Error reacting to message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to react to message',
      error: error.message
    });
  }
});

// ==================== PIN/UNPIN CONVERSATION ====================
router.put('/conversations/:conversationId/pin', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const isPinned = conversation.pinnedBy.includes(req.user._id);

    if (isPinned) {
      conversation.pinnedBy = conversation.pinnedBy.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      conversation.pinnedBy.push(req.user._id);
    }

    await conversation.save();

    res.json({
      success: true,
      isPinned: !isPinned
    });
  } catch (error) {
    console.error('Error pinning conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pin conversation',
      error: error.message
    });
  }
});

// ==================== ARCHIVE/UNARCHIVE CONVERSATION ====================
router.put('/conversations/:conversationId/archive', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || !conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const isArchived = conversation.archivedBy.includes(req.user._id);

    if (isArchived) {
      conversation.archivedBy = conversation.archivedBy.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      conversation.archivedBy.push(req.user._id);
    }

    await conversation.save();

    res.json({
      success: true,
      isArchived: !isArchived
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive conversation',
      error: error.message
    });
  }
});

module.exports = router;
