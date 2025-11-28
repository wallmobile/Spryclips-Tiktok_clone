const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Video = require('../models/Video');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Helper function to create notification
const createNotification = async (data) => {
  try {
    // Don't create notification if user is notifying themselves
    if (data.userId.toString() === data.relatedUserId?.toString()) return;
    
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
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Get comments for a video
router.get('/video/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    
    // Validate ObjectId - if invalid, return empty comments (for sample videos)
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(200).json({ 
        comments: [],
        message: 'No comments available for this video'
      });
    }
    
    // Get top-level comments (no parent)
    const comments = await Comment.find({ 
      video: videoId,
      parentComment: null 
    })
      .populate('user', 'username profile')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username profile'
        },
        options: { sort: { createdAt: 1 } },
        limit: 10 // Limit replies per comment
      })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(100);

    res.json({ comments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment
router.post('/video/:videoId', authMiddleware, async (req, res) => {
  try {
    const { text, parentId } = req.body;
    const videoId = req.params.videoId;
    
    // Validate inputs
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({ message: 'Comment text is too long (max 1000 characters)' });
    }
    
    // Validate ObjectId - if invalid, return user-friendly error
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ 
        message: 'We could not process your request. Please check the information and try again.',
        userMessage: 'This video does not support comments. Please try a different video.'
      });
    }
    
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ 
        message: 'We could not process your request. Please check the information and try again.',
        userMessage: 'Invalid comment reference. Please try again.'
      });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Create comment
    const comment = new Comment({
      user: req.user._id,
      video: videoId,
      text: text,
      parentComment: parentId || null
    });

    await comment.save();

    // If it's a reply, add it to parent comment's replies array
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (parentComment) {
        parentComment.replies.push(comment._id);
        await parentComment.save();
      }
    }

    // Update video comment count
    video.comments += 1;
    await video.save();

    // Create notification for video owner
    if (video.user && video.user.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: video.user,
        type: 'comments',
        title: 'New Comment',
        message: `commented: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        relatedUserId: req.user._id,
        relatedVideoId: video._id,
        relatedCommentId: comment._id,
        metadata: { commentText: text.substring(0, 100) }
      });
    }
    
    // If it's a reply, notify the parent comment owner
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (parentComment && parentComment.user.toString() !== req.user._id.toString()) {
        await createNotification({
          userId: parentComment.user,
          type: 'mentions',
          title: 'New Reply',
          message: `replied to your comment: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          relatedUserId: req.user._id,
          relatedVideoId: video._id,
          relatedCommentId: comment._id,
          metadata: { commentText: text.substring(0, 100) }
        });
      }
    }

    // Populate user info before sending
    await comment.populate('user', 'username profile');

    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update comment
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    // Validate inputs
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({ message: 'Comment text is too long (max 1000 characters)' });
    }
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check ownership
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    comment.text = text;
    comment.isEdited = true;
    await comment.save();

    res.json({ comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete comment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check ownership or admin
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Decrement video comment count
    await Video.findByIdAndUpdate(comment.video, { $inc: { comments: -1 } });

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like/Unlike comment
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const isLiked = comment.likedBy.includes(req.user._id);

    if (isLiked) {
      comment.likedBy = comment.likedBy.filter(id => id.toString() !== req.user._id.toString());
      comment.likes--;
    } else {
      comment.likedBy.push(req.user._id);
      comment.likes++;
    }

    await comment.save();
    res.json({ isLiked: !isLiked, likes: comment.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== GET COMMENT REPLIES ====================
router.get('/:commentId/replies', async (req, res) => {
  try {
    const commentId = req.params.commentId;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const replies = await Comment.find({
      parentComment: commentId,
    })
      .populate('user', 'username profile')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      replies,
      count: replies.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== PIN/UNPIN COMMENT ====================
router.post('/:commentId/pin', authMiddleware, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }
    
    const comment = await Comment.findById(commentId).populate('video');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the video
    if (comment.video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'Not authorized to pin this comment' 
      });
    }

    // Unpin all other comments on this video
    if (!comment.isPinned) {
      await Comment.updateMany(
        { video: comment.video._id, _id: { $ne: commentId } },
        { $set: { isPinned: false } }
      );
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    res.json({
      success: true,
      isPinned: comment.isPinned,
      comment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== REACT TO COMMENT ====================
router.post('/:commentId/react', authMiddleware, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user._id;
    const { emoji } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user already reacted
    const existingReactionIndex = comment.reactions.findIndex(
      reaction => reaction.user.toString() === userId.toString()
    );

    if (existingReactionIndex !== -1) {
      // Update existing reaction
      if (emoji) {
        comment.reactions[existingReactionIndex].emoji = emoji;
        comment.reactions[existingReactionIndex].createdAt = new Date();
      } else {
        // Remove reaction if no emoji provided
        comment.reactions.splice(existingReactionIndex, 1);
      }
    } else if (emoji) {
      // Add new reaction
      comment.reactions.push({
        user: userId,
        emoji: emoji || '❤️',
        createdAt: new Date(),
      });
    }

    await comment.save();
    await comment.populate('reactions.user', 'username profile');

    res.json({
      success: true,
      reactions: comment.reactions,
      count: comment.reactions.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== GET COMMENT REACTIONS ====================
router.get('/:commentId/reactions', async (req, res) => {
  try {
    const commentId = req.params.commentId;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(commentId)
      .populate('reactions.user', 'username profile');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Group reactions by emoji
    const reactionsByEmoji = {};
    comment.reactions.forEach(reaction => {
      if (!reactionsByEmoji[reaction.emoji]) {
        reactionsByEmoji[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        };
      }
      reactionsByEmoji[reaction.emoji].count += 1;
      reactionsByEmoji[reaction.emoji].users.push(reaction.user);
    });

    res.json({
      success: true,
      reactions: Object.values(reactionsByEmoji),
      allReactions: comment.reactions,
      count: comment.reactions.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

