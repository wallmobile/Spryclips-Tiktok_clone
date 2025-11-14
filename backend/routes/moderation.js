const express = require('express');
const { ModerationRule, ModerationLog, AgeVerification } = require('../models/ContentModeration');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ========== MODERATION RULES ==========

// Get all active rules
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const rules = await ModerationRule.find({ isActive: true });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create/modify rule (admin only)
const { adminMiddleware } = require('../middleware/admin');
router.post('/rules', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rule = new ModerationRule(req.body);
    await rule.save();
    res.status(201).json({
      success: true,
      rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== AUTO MODERATION ==========

// Check content against moderation rules
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { contentType, contentId, text, userId } = req.body;
    const rules = await ModerationRule.find({ isActive: true, type: 'auto-moderation' });
    
    const violations = [];
    
    for (const rule of rules) {
      // Check keywords
      if (rule.keywords && text) {
        const lowerText = text.toLowerCase();
        for (const keyword of rule.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            violations.push({
              rule: rule._id,
              reason: `Contains prohibited keyword: ${keyword}`,
              severity: rule.severity,
              action: rule.action
            });
            break;
          }
        }
      }
      
      // Check patterns (regex)
      if (rule.patterns && text) {
        for (const pattern of rule.patterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(text)) {
              violations.push({
                rule: rule._id,
                reason: `Matches prohibited pattern`,
                severity: rule.severity,
                action: rule.action
              });
              break;
            }
          } catch (e) {
            console.error('Invalid regex pattern:', pattern);
          }
        }
      }
    }
    
    // Log violations
    for (const violation of violations) {
      await ModerationLog.create({
        contentId,
        contentType,
        userId,
        rule: violation.rule,
        reason: violation.reason,
        action: violation.action === 'delete' ? 'flagged' : violation.action,
        aiConfidence: 0.8
      });
    }
    
    res.json({
      violations,
      shouldBlock: violations.some(v => v.action === 'delete' || v.action === 'hide'),
      shouldFlag: violations.length > 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== SPAM DETECTION ==========

// Detect spam in text
router.post('/spam-detect', authMiddleware, async (req, res) => {
  try {
    const { text, userId } = req.body;
    const spamRules = await ModerationRule.find({ 
      isActive: true, 
      type: 'spam-detection' 
    });
    
    // Check for spam patterns
    let spamScore = 0;
    const spamIndicators = [];
    
    // Check for excessive links
    const linkCount = (text.match(/https?:\/\//g) || []).length;
    if (linkCount > 3) {
      spamScore += 0.3;
      spamIndicators.push('Excessive links');
    }
    
    // Check for repetitive characters
    if (/(.)\1{5,}/.test(text)) {
      spamScore += 0.2;
      spamIndicators.push('Repetitive characters');
    }
    
    // Check against spam rules
    for (const rule of spamRules) {
      if (rule.keywords && text) {
        const lowerText = text.toLowerCase();
        for (const keyword of rule.keywords) {
          if (lowerText.includes(keyword.toLowerCase())) {
            spamScore += 0.3;
            spamIndicators.push(`Contains spam keyword: ${keyword}`);
            break;
          }
        }
      }
    }
    
    const isSpam = spamScore >= 0.5;
    
    if (isSpam) {
      // Log spam detection
      await ModerationLog.create({
        contentId: null,
        contentType: 'comment',
        userId,
        reason: `Spam detected: ${spamIndicators.join(', ')}`,
        action: 'flagged',
        aiConfidence: spamScore
      });
    }
    
    res.json({
      isSpam,
      spamScore,
      spamIndicators
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== COMMENT FILTERING ==========

// Filter comment before posting
router.post('/filter-comment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const filterRules = await ModerationRule.find({ 
      isActive: true, 
      type: 'comment-filter' 
    });
    
    let filteredText = text;
    let wasFiltered = false;
    
    for (const rule of filterRules) {
      if (rule.keywords) {
        for (const keyword of rule.keywords) {
          const regex = new RegExp(keyword, 'gi');
          if (regex.test(filteredText)) {
            filteredText = filteredText.replace(regex, '***');
            wasFiltered = true;
          }
        }
      }
    }
    
    res.json({
      originalText: text,
      filteredText,
      wasFiltered
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== AGE VERIFICATION ==========

// Request age verification
router.post('/age-verification', authMiddleware, async (req, res) => {
  try {
    const { verificationMethod, verifiedAge, verificationDocument } = req.body;
    
    const verification = new AgeVerification({
      user: req.user._id,
      verificationMethod,
      verifiedAge,
      verificationDocument: verificationDocument || '',
      status: 'pending'
    });
    
    await verification.save();
    res.status(201).json(verification);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Age verification already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get age verification status
router.get('/age-verification', authMiddleware, async (req, res) => {
  try {
    const verification = await AgeVerification.findOne({ user: req.user._id });
    res.json(verification || { status: 'not-verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update age verification (admin only)
router.put('/age-verification/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, verifiedAge } = req.body;
    const verification = await AgeVerification.findById(req.params.id);
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }
    
    verification.status = status;
    if (verifiedAge) verification.verifiedAge = verifiedAge;
    if (status === 'verified') {
      verification.verifiedAt = new Date();
      verification.reviewedBy = req.user._id;
    }
    
    await verification.save();
    res.json(verification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== CONTENT WARNINGS ==========

// Add content warning to video
router.post('/warning', authMiddleware, async (req, res) => {
  try {
    const { videoId, warningType, reason } = req.body;
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    // Add warning label
    video.warningLabel = {
      type: warningType,
      reason,
      addedBy: req.user._id,
      addedAt: new Date()
    };
    
    await video.save();
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== MODERATION LOGS ==========

// Get moderation logs (admin only)
router.get('/logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { contentType, action, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (contentType) query.contentType = contentType;
    if (action) query.action = action;
    
    const logs = await ModerationLog.find(query)
      .populate('userId', 'username')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ModerationLog.countDocuments(query);
    
    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get community guidelines
router.get('/guidelines', async (req, res) => {
  res.json({
    guidelines: [
      {
        title: 'Be Respectful',
        description: 'Treat others with respect and kindness. Harassment, hate speech, and bullying are not tolerated.',
        category: 'community'
      },
      {
        title: 'No Harmful Content',
        description: 'Do not post content that promotes violence, self-harm, or illegal activities.',
        category: 'safety'
      },
      {
        title: 'Original Content',
        description: 'Post original content and respect intellectual property rights.',
        category: 'content'
      },
      {
        title: 'Privacy',
        description: 'Respect others\' privacy and do not share personal information without consent.',
        category: 'privacy'
      },
      {
        title: 'No Spam',
        description: 'Do not spam, post misleading content, or engage in deceptive practices.',
        category: 'community'
      }
    ]
  });
});

module.exports = router;
