const express = require('express');
const VideoQA = require('../models/VideoQA');
const Video = require('../models/Video');
const User = require('../models/User');
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== ASK QUESTION ====================
router.post('/:videoId/qa', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user._id;
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required',
      });
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    // Create question
    const qa = new VideoQA({
      video: videoId,
      question: question.trim(),
      askedBy: userId,
    });

    await qa.save();
    await qa.populate('askedBy', 'username profile');

    // Create notification for video owner
    if (video.user.toString() !== userId.toString()) {
      const notification = new Notification({
        recipient: video.user,
        sender: userId,
        type: 'system',
        message: `${req.user.username} asked a question on your video`,
        link: `/videos/${videoId}`,
        entityId: videoId,
        entityModel: 'Video',
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      qa,
      message: 'Question submitted successfully',
    });
  } catch (error) {
    console.error('Error asking question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit question',
      error: error.message,
    });
  }
});

// ==================== GET QUESTIONS FOR VIDEO ====================
router.get('/:videoId/qa', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;
    const sortBy = req.query.sort || 'newest'; // newest, oldest, answered, unanswered

    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found',
      });
    }

    let query = { video: videoId };
    let sortQuery = {};

    switch (sortBy) {
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'answered':
        query.answer = { $ne: '' };
        sortQuery = { answeredAt: -1, createdAt: -1 };
        break;
      case 'unanswered':
        query.answer = '';
        sortQuery = { createdAt: -1 };
        break;
      case 'newest':
      default:
        sortQuery = { isPinned: -1, createdAt: -1 };
        break;
    }

    const questions = await VideoQA.find(query)
      .populate('askedBy', 'username profile')
      .populate('answeredBy', 'username profile')
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
    });
  }
});

// ==================== ANSWER QUESTION ====================
router.post('/:videoId/qa/:questionId/answer', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const questionId = req.params.questionId;
    const userId = req.user._id;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required',
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
        message: 'Only video owner can answer questions',
      });
    }

    const qa = await VideoQA.findById(questionId);

    if (!qa) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    if (qa.video.toString() !== videoId) {
      return res.status(400).json({
        success: false,
        message: 'Question does not belong to this video',
      });
    }

    // Update answer
    qa.answer = answer.trim();
    qa.answeredBy = userId;
    qa.answeredAt = new Date();
    await qa.save();

    await qa.populate('askedBy', 'username profile');
    await qa.populate('answeredBy', 'username profile');

    // Create notification for question asker
    if (qa.askedBy.toString() !== userId.toString()) {
      const notification = new Notification({
        recipient: qa.askedBy,
        sender: userId,
        type: 'system',
        message: `${req.user.username} answered your question`,
        link: `/videos/${videoId}`,
        entityId: questionId,
        entityModel: 'VideoQA',
      });
      await notification.save();
    }

    res.json({
      success: true,
      qa,
      message: 'Answer submitted successfully',
    });
  } catch (error) {
    console.error('Error answering question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message,
    });
  }
});

// ==================== LIKE/UNLIKE QUESTION ====================
router.post('/:videoId/qa/:questionId/like', authMiddleware, async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const userId = req.user._id;

    const qa = await VideoQA.findById(questionId);

    if (!qa) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const isLiked = qa.likedBy.includes(userId);

    if (isLiked) {
      qa.likedBy = qa.likedBy.filter(id => id.toString() !== userId.toString());
      qa.likes -= 1;
    } else {
      qa.likedBy.push(userId);
      qa.likes += 1;
    }

    await qa.save();

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: qa.likes,
    });
  } catch (error) {
    console.error('Error liking question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like question',
      error: error.message,
    });
  }
});

// ==================== PIN/UNPIN QUESTION ====================
router.post('/:videoId/qa/:questionId/pin', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const questionId = req.params.questionId;
    const userId = req.user._id;

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
        message: 'Only video owner can pin questions',
      });
    }

    const qa = await VideoQA.findById(questionId);

    if (!qa) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Toggle pin
    qa.isPinned = !qa.isPinned;
    await qa.save();

    res.json({
      success: true,
      isPinned: qa.isPinned,
      qa,
    });
  } catch (error) {
    console.error('Error pinning question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pin question',
      error: error.message,
    });
  }
});

// ==================== DELETE QUESTION ====================
router.delete('/:videoId/qa/:questionId', authMiddleware, async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const userId = req.user._id;

    const qa = await VideoQA.findById(questionId);

    if (!qa) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    // Check if user asked the question or owns the video
    const video = await Video.findById(qa.video);
    const isOwner = video.user.toString() === userId.toString();
    const isAsker = qa.askedBy.toString() === userId.toString();

    if (!isOwner && !isAsker) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question',
      });
    }

    await VideoQA.findByIdAndDelete(questionId);

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message,
    });
  }
});

module.exports = router;

