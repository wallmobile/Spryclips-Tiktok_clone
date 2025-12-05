const express = require('express');
const router = express.Router();
const CDNIssue = require('../models/CDNIssue');
const authMiddleware = require('../middleware/auth');

// User reports a CDN/quality issue
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { issueType, description, videoId, deviceInfo, networkType } = req.body;
    
    if (!issueType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Issue type and description are required'
      });
    }
    
    // Detect CDN provider from request (if possible)
    const cdnProvider = req.headers['x-cdn-provider'] || 'unknown';
    const region = req.headers['x-region'] || '';
    
    const issue = new CDNIssue({
      reportedBy: req.user._id || req.user.id,
      issueType,
      description,
      videoId: videoId || null,
      cdnProvider,
      region,
      deviceInfo: deviceInfo || '',
      networkType: networkType || 'unknown',
      status: 'pending',
      priority: 'medium'
    });
    
    await issue.save();
    
    // Populate user info
    await issue.populate('reportedBy', 'username email profile.avatar');
    
    res.status(201).json({
      success: true,
      issue,
      message: 'Issue reported successfully. Our team will investigate.'
    });
  } catch (error) {
    console.error('Report CDN issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report issue. Please try again.'
    });
  }
});

// User gets their reported issues
router.get('/my-issues', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [issues, total] = await Promise.all([
      CDNIssue.find({ reportedBy: req.user._id || req.user.id })
        .populate('videoId', 'title thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CDNIssue.countDocuments({ reportedBy: req.user._id || req.user.id })
    ]);
    
    res.json({
      success: true,
      issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user CDN issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your issues'
    });
  }
});

module.exports = router;

