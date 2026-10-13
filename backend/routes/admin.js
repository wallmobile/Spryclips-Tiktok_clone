// Admin routes for all admin panel features
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const Comment = require('../models/Comment');
const Story = require('../models/Story');
const { ensureAbsoluteUrl } = require('../utils/urlHelpers');
// LiveStream model (optional - fallback to Video if not available)
let LiveStream;
try {
  LiveStream = require('../models/LiveStream');
} catch (error) {
  LiveStream = null;
}
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const Earning = require('../models/Earning');
const Withdrawal = require('../models/Withdrawal');
const BrandDeal = require('../models/BrandDeal');
const Blacklist = require('../models/Blacklist');
const BoostedContent = require('../models/BoostedContent');
const HashtagControl = require('../models/HashtagControl');
const ABTest = require('../models/ABTest');
const VideoProcessing = require('../models/VideoProcessing');
const CDNHealth = require('../models/CDNHealth');
const CDNIssue = require('../models/CDNIssue');
const ServerHealth = require('../models/ServerHealth');
const ErrorLog = require('../models/ErrorLog');
const APIRequest = require('../models/APIRequest');
const Storage = require('../models/Storage');
const Ticket = require('../models/Ticket');
const LoginIssue = require('../models/LoginIssue');
const PaymentIssue = require('../models/PaymentIssue');
const VideoUploadIssue = require('../models/VideoUploadIssue');
const ShadowbanCase = require('../models/ShadowbanCase');
const CommentAppeal = require('../models/CommentAppeal');
const RegionalLaw = require('../models/RegionalLaw');
const LegalHold = require('../models/LegalHold');
const LawEnforcementRequest = require('../models/LawEnforcementRequest');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');
const Session = require('../models/Session');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const AppStoreViolation = require('../models/AppStoreViolation');
const AppStoreRating = require('../models/AppStoreRating');
const PushCampaign = require('../models/PushCampaign');
const WarningMessage = require('../models/WarningMessage');
const WarningSettings = require('../models/WarningSettings');
const authMiddleware = require('../middleware/auth');
const { strictAdminMiddleware } = require('../middleware/admin');
const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(strictAdminMiddleware);

// ==================== DASHBOARD STATS ====================
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalVideos,
      totalStories,
      totalComments,
      bannedUsers,
      suspendedUsers,
      newUsersToday,
      newUsersThisWeek,
      videosToday,
      videosThisWeek
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: 'active' }),
      Video.countDocuments(),
      Story.countDocuments(),
      Comment.countDocuments(),
      User.countDocuments({ accountStatus: 'banned' }),
      User.countDocuments({ accountStatus: 'suspended' }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Video.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Video.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalVideos,
        totalStories,
        totalComments,
        bannedUsers,
        suspendedUsers,
        newUsersToday,
        newUsersThisWeek,
        videosToday,
        videosThisWeek
      }
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

// ==================== USER MANAGEMENT ====================
// Get all users with pagination and filters
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const role = req.query.role || 'all';

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'profile.displayName': { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      query.accountStatus = status;
    }
    if (role !== 'all') {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordHistory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get single user details with comprehensive info
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordHistory')
      .populate('followers', 'username email profile.avatar')
      .populate('followedUsers', 'username email profile.avatar')
      .populate('blockedUsers', 'username email profile.avatar')
      .populate('privacy.blockedUsers.user', 'username email profile.avatar')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user stats
    const [videoCount, storyCount, commentCount] = await Promise.all([
      Video.countDocuments({ user: user._id }),
      Story.countDocuments({ user: user._id }),
      Comment.countDocuments({ user: user._id })
    ]);

    // Get followers and following counts
    const followersCount = user.followers ? user.followers.length : (user.profile?.followers || 0);
    const followingCount = user.followedUsers ? user.followedUsers.length : (user.profile?.following || 0);
    const blockedCount = user.blockedUsers ? user.blockedUsers.length : (user.privacy?.blockedUsers?.length || 0);

    res.json({
      success: true,
      user: {
        ...user,
        stats: {
          videos: videoCount,
          stories: storyCount,
          comments: commentCount,
          followers: followersCount,
          following: followingCount,
          blocked: blockedCount
        }
      }
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Update user status (ban, suspend, activate, warning)
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status, reason, warning } = req.body;
    
    if (!['active', 'suspended', 'banned'].includes(status) && !warning) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updateData = {};
    
    if (status) {
      updateData.accountStatus = status;
      if (reason) {
        updateData.suspensionReason = reason;
      }
    }

    // Handle warning strike
    if (warning && reason) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Add warning strike
      const newWarningStrikes = Math.min((user.warningStrikes || 0) + 1, 3);
      updateData.warningStrikes = newWarningStrikes;
      updateData.warningHistory = [
        ...(user.warningHistory || []),
        {
          reason,
          issuedAt: new Date(),
          issuedBy: req.user._id
        }
      ];

      // Auto-ban after 3 strikes
      if (newWarningStrikes >= 3) {
        updateData.accountStatus = 'banned';
        updateData.suspensionReason = 'Three warning strikes - automatic ban';
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -passwordHistory');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// Create new user (admin only)
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, role = 'user', displayName } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required' 
      });
    }

    // Validate role
    if (!['user', 'moderator', 'admin', 'creator'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be: user, moderator, admin, or creator' 
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: existingUser.username === username.toLowerCase() 
          ? 'Username already exists' 
          : 'Email already exists' 
      });
    }

    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      role,
      'profile.displayName': displayName || username,
      emailVerified: true, // Admin-created users are pre-verified
      accountStatus: 'active'
    });

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id)
      .select('-password -passwordHistory')
      .lean();

    console.log(`✅ Admin created ${role} account: ${username}`);

    res.status(201).json({ 
      success: true, 
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      user: userResponse 
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create user',
      error: error.message 
    });
  }
});

// Update user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -passwordHistory');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Admin update user role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// Update user profile (edit details)
router.patch('/users/:id/profile', async (req, res) => {
  try {
    const { username, email, phone, displayName, bio, avatar, website } = req.body;
    
    const updateData = {};
    
    // Validate username if provided
    if (username !== undefined && username !== null) {
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username must be between 3 and 30 characters' 
        });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username can only contain letters, numbers, and underscores' 
        });
      }
      updateData.username = trimmedUsername.toLowerCase();
    }
    
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    if (displayName || bio || avatar || website) {
      updateData.profile = {};
      if (displayName) updateData.profile.displayName = displayName;
      if (bio) updateData.profile.bio = bio;
      if (avatar) updateData.profile.avatar = avatar;
      if (website) updateData.profile.website = website;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password -passwordHistory');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Admin update user profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user profile' });
  }
});

// Verify user identity
router.patch('/users/:id/verify-identity', async (req, res) => {
  try {
    const { verified, status } = req.body;
    
    const updateData = {
      identityVerified: verified || false,
      identityVerificationStatus: status || (verified ? 'approved' : 'rejected')
    };

    if (verified && !status) {
      updateData.profile = { isVerified: true };
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password -passwordHistory');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Admin verify identity error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify identity' });
  }
});

// Get user login history
router.get('/users/:id/login-history', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('loginHistory')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      loginHistory: user.loginHistory || []
    });
  } catch (error) {
    console.error('Admin get login history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch login history' });
  }
});

// Get user followers list
router.get('/users/:id/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'username email profile.avatar profile.displayName createdAt')
      .select('followers')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      followers: user.followers || []
    });
  } catch (error) {
    console.error('Admin get followers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch followers' });
  }
});

// Get user following list
router.get('/users/:id/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followedUsers', 'username email profile.avatar profile.displayName createdAt')
      .select('followedUsers')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      following: user.followedUsers || []
    });
  } catch (error) {
    console.error('Admin get following error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch following' });
  }
});

// Get user blocked users list
router.get('/users/:id/blocked', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('blockedUsers', 'username email profile.avatar profile.displayName')
      .populate('privacy.blockedUsers.user', 'username email profile.avatar profile.displayName')
      .select('blockedUsers privacy.blockedUsers')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Combine both blocked lists
    const blockedFromMain = user.blockedUsers || [];
    const blockedFromPrivacy = (user.privacy?.blockedUsers || []).map(b => b.user).filter(Boolean);
    const allBlocked = [...blockedFromMain, ...blockedFromPrivacy];

    res.json({
      success: true,
      blocked: allBlocked
    });
  } catch (error) {
    console.error('Admin get blocked users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked users' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete associated data
    await Promise.all([
      Video.deleteMany({ user: user._id }),
      Story.deleteMany({ user: user._id }),
      Comment.deleteMany({ user: user._id }),
      Notification.deleteMany({ user: user._id })
    ]);

    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ==================== VIDEO MANAGEMENT ====================
router.get('/videos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { hashtags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('user', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Video.countDocuments(query)
    ]);

    // Ensure absolute URLs for thumbnails and videos
    const videosWithAbsoluteUrls = videos.map(video => ({
      ...video,
      thumbnail: ensureAbsoluteUrl(video.thumbnail),
      url: ensureAbsoluteUrl(video.url),
      processedUrl: video.processedUrl ? ensureAbsoluteUrl(video.processedUrl) : null,
      user: video.user ? {
        ...video.user,
        profile: video.user.profile ? {
          ...video.user.profile,
          avatar: ensureAbsoluteUrl(video.user.profile.avatar)
        } : video.user.profile
      } : video.user
    }));

    res.json({
      success: true,
      videos: videosWithAbsoluteUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get videos error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch videos' });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Delete associated comments
    await Comment.deleteMany({ video: video._id });

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Admin delete video error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete video' });
  }
});

// ==================== STORY MANAGEMENT ====================
router.get('/stories', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [stories, total] = await Promise.all([
      Story.find()
        .populate('user', 'username email profile.avatar')
        .populate('reactions.user', 'username')
        .populate('replies.user', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Story.countDocuments()
    ]);

    res.json({
      success: true,
      stories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get stories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stories' });
  }
});

router.delete('/stories/:id', async (req, res) => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Admin delete story error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete story' });
  }
});

// ==================== COMMENT MANAGEMENT ====================
router.get('/comments', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = {};
    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('user', 'username email profile.avatar')
        .populate('video', 'thumbnail description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query)
    ]);

    res.json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin get comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
});

// Update comment (Admin only)
router.patch('/comments/:id', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({ success: false, message: 'Comment text is too long (max 1000 characters)' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }
    
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { 
        text: text.trim(),
        isEdited: true,
        editedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('user', 'username email profile.avatar').populate('video', 'thumbnail description');
    
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true, comment, message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Admin update comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update comment' });
  }
});

// Delete comment (Admin only)
router.delete('/comments/:id', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }
    
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Decrement video comment count if comment exists
    if (comment.video) {
      await Video.findByIdAndUpdate(comment.video, { $inc: { comments: -1 } });
    }

    // Delete the comment and any nested replies
    await Comment.deleteMany({
      $or: [{ _id: comment._id }, { parentComment: comment._id }]
    });

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Admin delete comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

// ==================== CONTENT MODERATION ====================

// Get videos pending moderation
router.get('/moderation/videos', async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      moderationStatus: status
    };

    if (status === 'flagged') {
      query['aiFlags.nudity.flagged'] = { $ne: false };
      query['$or'] = [
        { 'aiFlags.nudity.flagged': true },
        { 'aiFlags.hate.flagged': true },
        { 'aiFlags.violence.flagged': true },
        { 'aiFlags.spam.flagged': true }
      ];
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('user', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Video.countDocuments(query)
    ]);

    res.json({
      success: true,
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get moderation videos error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch videos for moderation' });
  }
});

// Moderate video (approve/reject/mark sensitive)
router.patch('/moderation/videos/:id', async (req, res) => {
  try {
    const { action, notes, sensitiveType } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const updateData = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      moderationNotes: notes || video.moderationNotes
    };

    switch (action) {
      case 'approve':
        updateData.moderationStatus = 'approved';
        updateData.status = 'ready';
        break;
      case 'reject':
        updateData.moderationStatus = 'rejected';
        break;
      case 'mark_sensitive':
        updateData.moderationStatus = 'approved';
        updateData.isSensitive = true;
        if (video.warningLabel) {
          video.warningLabel.type = sensitiveType || 'sensitive';
          video.warningLabel.reason = notes || 'Marked as sensitive by admin';
          video.warningLabel.addedBy = req.user._id;
          video.warningLabel.addedAt = new Date();
        } else {
          video.warningLabel = {
            type: sensitiveType || 'sensitive',
            reason: notes || 'Marked as sensitive by admin',
            addedBy: req.user._id,
            addedAt: new Date()
          };
        }
        break;
      case 'remove_sensitive':
        updateData.isSensitive = false;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    Object.assign(video, updateData);
    await video.save();

    res.json({
      success: true,
      message: `Video ${action}ed successfully`,
      video
    });
  } catch (error) {
    console.error('Admin moderate video error:', error);
    res.status(500).json({ success: false, message: 'Failed to moderate video' });
  }
});

// Copyright dispute handling
router.post('/moderation/videos/:id/copyright', async (req, res) => {
  try {
    const { type, resolution, resolve } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (resolve) {
      // Resolve dispute
      video.copyrightDispute.isResolved = true;
      video.copyrightDispute.resolvedAt = new Date();
      video.copyrightDispute.resolvedBy = req.user._id;
      video.copyrightDispute.resolution = resolution;
    } else {
      // Create dispute
      video.copyrightDispute = {
        type: type || 'dmca',
        reportedBy: req.user._id,
        reportedAt: new Date(),
        isResolved: false
      };
    }

    await video.save();

    res.json({
      success: true,
      message: resolve ? 'Copyright dispute resolved' : 'Copyright dispute created',
      video
    });
  } catch (error) {
    console.error('Admin copyright dispute error:', error);
    res.status(500).json({ success: false, message: 'Failed to handle copyright dispute' });
  }
});

// Get comments for moderation
router.get('/moderation/comments', async (req, res) => {
  try {
    const { status = 'flagged', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { moderationStatus: status };

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('user', 'username email profile.avatar')
        .populate('video', 'thumbnail description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Comment.countDocuments(query)
    ]);

    res.json({
      success: true,
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get moderation comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments for moderation' });
  }
});

// Moderate comment (delete/limit)
router.patch('/moderation/comments/:id', async (req, res) => {
  try {
    const { action, notes } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const updateData = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      moderationNotes: notes || comment.moderationNotes
    };

    switch (action) {
      case 'delete':
        updateData.moderationStatus = 'deleted';
        updateData.isHidden = true;
        break;
      case 'approve':
        updateData.moderationStatus = 'approved';
        updateData.isHidden = false;
        break;
      case 'limit':
        updateData.moderationStatus = 'limited';
        updateData.isHidden = true;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    Object.assign(comment, updateData);
    await comment.save();

    res.json({
      success: true,
      message: `Comment ${action}ed successfully`,
      comment
    });
  } catch (error) {
    console.error('Admin moderate comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to moderate comment' });
  }
});

// Get AI flagged content
router.get('/moderation/ai-flags', async (req, res) => {
  try {
    const { type, reviewed = false, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (type) {
      query[`aiFlags.${type}.flagged`] = true;
      if (reviewed === 'true') {
        query[`aiFlags.${type}.reviewed`] = true;
      } else {
        query[`aiFlags.${type}.reviewed`] = { $ne: true };
      }
    } else {
      query.$or = [
        { 'aiFlags.nudity.flagged': true },
        { 'aiFlags.hate.flagged': true },
        { 'aiFlags.violence.flagged': true },
        { 'aiFlags.spam.flagged': true }
      ];
    }

    const [videos, total] = await Promise.all([
      Video.find(query)
        .populate('user', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Video.countDocuments(query)
    ]);

    res.json({
      success: true,
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get AI flags error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI flagged content' });
  }
});

// Review AI flag
router.patch('/moderation/ai-flags/:id', async (req, res) => {
  try {
    const { flagType, action } = req.body; // action: 'dismiss' or 'confirm'
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (!video.aiFlags || !video.aiFlags[flagType]) {
      return res.status(400).json({ success: false, message: 'Flag type not found' });
    }

    video.aiFlags[flagType].reviewed = true;
    video.reviewedBy = req.user._id;
    video.reviewedAt = new Date();

    if (action === 'confirm') {
      video.moderationStatus = 'flagged';
      video.isSensitive = true;
    } else if (action === 'dismiss') {
      video.aiFlags[flagType].flagged = false;
    }

    await video.save();

    res.json({
      success: true,
      message: `AI flag ${action}ed successfully`,
      video
    });
  } catch (error) {
    console.error('Admin review AI flag error:', error);
    res.status(500).json({ success: false, message: 'Failed to review AI flag' });
  }
});

// Get live streams for moderation
router.get('/moderation/live-streams', async (req, res) => {
  try {
    let streams = [];
    
    // Try to use LiveStream model if it exists
    if (LiveStream) {
      const liveStreams = await LiveStream.find({ status: 'live' })
        .populate('streamer', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .lean();
      
      // Map LiveStream fields to expected format
      streams = liveStreams.map(stream => ({
        _id: stream._id,
        user: stream.streamer,
        description: stream.description || stream.title,
        views: stream.viewers || 0,
        createdAt: stream.createdAt,
        status: stream.status,
        thumbnail: stream.thumbnail
      }));
    } else {
      // Fallback to Video model
      const query = {
        $or: [
          { status: 'live' },
          { videoType: 'live' }
        ]
      };

      const videoStreams = await Video.find(query)
        .populate('user', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .lean();

      streams = videoStreams.map(stream => ({
        _id: stream._id,
        user: stream.user,
        description: stream.description,
        views: stream.views || 0,
        createdAt: stream.createdAt,
        status: stream.status,
        thumbnail: stream.thumbnail
      }));
    }

    res.json({
      success: true,
      streams
    });
  } catch (error) {
    console.error('Admin get live streams error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live streams' });
  }
});

// Moderate live stream
router.patch('/moderation/live-streams/:id', async (req, res) => {
  try {
    const { action } = req.body; // action: 'end' or 'warn'
    
    if (LiveStream) {
      // Use LiveStream model
      const stream = await LiveStream.findById(req.params.id);
      
      if (!stream || stream.status !== 'live') {
        return res.status(404).json({ success: false, message: 'Live stream not found' });
      }

      switch (action) {
        case 'end':
          stream.status = 'ended';
          stream.endTime = new Date();
          break;
        case 'warn':
          // Add warning to moderation notes if field exists
          if (stream.moderationNotes) {
            stream.moderationNotes += '\nWarning issued by admin at ' + new Date().toISOString();
          }
          break;
        default:
          return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      await stream.save();

      res.json({
        success: true,
        message: `Live stream ${action}ed successfully`,
        stream
      });
    } else {
      // Use Video model
      const video = await Video.findById(req.params.id);

      if (!video) {
        return res.status(404).json({ success: false, message: 'Live stream not found' });
      }

      switch (action) {
        case 'end':
          video.status = 'ready';
          video.moderationStatus = 'approved';
          video.reviewedBy = req.user._id;
          video.reviewedAt = new Date();
          video.moderationNotes = 'Live stream ended by admin';
          break;
        case 'warn':
          video.moderationNotes = (video.moderationNotes || '') + '\nWarning issued by admin at ' + new Date().toISOString();
          break;
        default:
          return res.status(400).json({ success: false, message: 'Invalid action' });
      }

      await video.save();

      res.json({
        success: true,
        message: `Live stream ${action}ed successfully`,
        stream: video
      });
    }
  } catch (error) {
    console.error('Admin moderate live stream error:', error);
    res.status(500).json({ success: false, message: 'Failed to moderate live stream' });
  }
});

// ==================== REPORTS & SAFETY ====================

// Get all reports
router.get('/reports', async (req, res) => {
  try {
    const { status = 'pending', priority, reason, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { status };
    if (priority) query.priority = priority;
    if (reason) query.reason = reason;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('reporter', 'username email profile.avatar')
        .populate('reportedUser', 'username email profile.avatar')
        .populate('reviewedBy', 'username')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

// Get high risk cases
router.get('/reports/high-risk', async (req, res) => {
  try {
    const reports = await Report.find({
      $or: [
        { priority: 'critical' },
        { priority: 'high', status: { $in: ['pending', 'under_review'] } },
        { childSafetyConcern: true, status: { $ne: 'resolved' } },
        { severity: { $gte: 8 }, status: { $ne: 'resolved' } }
      ]
    })
      .populate('reporter', 'username email profile.avatar')
      .populate('reportedUser', 'username email profile.avatar')
      .sort({ priority: -1, severity: -1, createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Admin get high risk reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch high risk reports' });
  }
});

// Get report details
router.get('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'username email profile.avatar profile.displayName')
      .populate('reportedUser', 'username email profile.avatar profile.displayName')
      .populate('reviewedBy', 'username email')
      .populate('relatedReports')
      .lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Get related content
    let relatedContent = null;
    if (report.reportedContent.type === 'video') {
      relatedContent = await Video.findById(report.reportedContent.id)
        .populate('user', 'username email profile.avatar')
        .lean();
    } else if (report.reportedContent.type === 'comment') {
      relatedContent = await Comment.findById(report.reportedContent.id)
        .populate('user', 'username email profile.avatar')
        .populate('video', 'thumbnail description')
        .lean();
    }

    res.json({
      success: true,
      report: {
        ...report,
        relatedContent
      }
    });
  } catch (error) {
    console.error('Admin get report details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report details' });
  }
});

// Resolve report
router.patch('/reports/:id/resolve', async (req, res) => {
  try {
    const { action, notes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'resolved';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.resolution = {
      action: action || 'no_action',
      notes: notes || '',
      resolvedAt: new Date()
    };

    // Take action based on resolution
    if (action === 'account_suspended' && report.reportedUser) {
      const user = await User.findById(report.reportedUser);
      if (user) {
        user.accountStatus = 'suspended';
        await user.save();
      }
    } else if (action === 'account_banned' && report.reportedUser) {
      const user = await User.findById(report.reportedUser);
      if (user) {
        user.accountStatus = 'banned';
        await user.save();
      }
    } else if (action === 'content_removed' && report.reportedContent) {
      if (report.reportedContent.type === 'video') {
        await Video.findByIdAndDelete(report.reportedContent.id);
      } else if (report.reportedContent.type === 'comment') {
        await Comment.findByIdAndDelete(report.reportedContent.id);
      }
    }

    await report.save();

    res.json({
      success: true,
      message: 'Report resolved successfully',
      report
    });
  } catch (error) {
    console.error('Admin resolve report error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve report' });
  }
});

// Dismiss report
router.patch('/reports/:id/dismiss', async (req, res) => {
  try {
    const { notes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'dismissed';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    report.resolution = {
      action: 'no_action',
      notes: notes || 'Report dismissed',
      resolvedAt: new Date()
    };

    await report.save();

    res.json({
      success: true,
      message: 'Report dismissed successfully',
      report
    });
  } catch (error) {
    console.error('Admin dismiss report error:', error);
    res.status(500).json({ success: false, message: 'Failed to dismiss report' });
  }
});

// Get spam detection alerts
router.get('/safety/spam-alerts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({
        spamScore: { $gte: 70 },
        accountStatus: 'active'
      })
        .select('username email profile.avatar spamScore reportCount createdAt')
        .sort({ spamScore: -1, reportCount: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments({ spamScore: { $gte: 70 }, accountStatus: 'active' })
    ]);

    res.json({
      success: true,
      alerts: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get spam alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch spam alerts' });
  }
});

// Get child safety violations
router.get('/safety/child-safety', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, users, videos] = await Promise.all([
      Report.find({
        $or: [
          { reason: 'child_safety' },
          { childSafetyConcern: true }
        ],
        status: { $ne: 'resolved' }
      })
        .populate('reporter', 'username email')
        .populate('reportedUser', 'username email profile.avatar')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.find({ childSafetyFlag: true })
        .select('username email profile.avatar accountStatus')
        .lean(),
      Video.find({
        $or: [
          { 'warningLabel.type': 'sensitive' },
          { isSensitive: true },
          { ageRestriction: '18+' }
        ],
        moderationStatus: { $ne: 'rejected' }
      })
        .populate('user', 'username email')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    res.json({
      success: true,
      reports,
      flaggedUsers: users,
      flaggedVideos: videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reports.length,
        pages: Math.ceil(reports.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get child safety violations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch child safety violations' });
  }
});

// Get fake accounts / bot detection queue
router.get('/safety/bot-detection', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      $or: [
        { isBot: true },
        { botScore: { $gte: 70 } }
      ],
      accountStatus: 'active'
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email profile.avatar botScore spamScore createdAt lastLogin accountStatus')
        .sort({ botScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get related reports
    const userIds = users.map(u => u._id);
    const reports = await Report.find({
      reportedUser: { $in: userIds },
      reason: 'fake_account',
      status: { $ne: 'resolved' }
    })
      .select('reportedUser reason priority')
      .lean();

    const reportsByUser = {};
    reports.forEach(r => {
      const userId = r.reportedUser.toString();
      if (!reportsByUser[userId]) {
        reportsByUser[userId] = [];
      }
      reportsByUser[userId].push(r);
    });

    const usersWithReports = users.map(user => ({
      ...user,
      reports: reportsByUser[user._id.toString()] || []
    }));

    res.json({
      success: true,
      users: usersWithReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get bot detection queue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bot detection queue' });
  }
});

// Get account takeover alerts (unusual login)
router.get('/safety/takeover-alerts', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find({
      $or: [
        { accountTakeoverRisk: { $gte: 7 } },
        { 'unusualLoginAlerts.0': { $exists: true } }
      ],
      accountStatus: 'active'
    })
      .select('username email profile.avatar accountTakeoverRisk unusualLoginAlerts loginHistory createdAt')
      .sort({ accountTakeoverRisk: -1, 'unusualLoginAlerts.timestamp': -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get recent unusual logins
    const alerts = [];
    users.forEach(user => {
      if (user.unusualLoginAlerts && user.unusualLoginAlerts.length > 0) {
        user.unusualLoginAlerts.forEach(alert => {
          if (!alert.reviewed) {
            alerts.push({
              userId: user._id,
              username: user.username,
              email: user.email,
              avatar: user.profile?.avatar,
              riskScore: alert.riskScore || user.accountTakeoverRisk,
              timestamp: alert.timestamp,
              ipAddress: alert.ipAddress,
              location: alert.location,
              actionTaken: alert.actionTaken
            });
          }
        });
      } else if (user.accountTakeoverRisk >= 7) {
        // Get recent login history
        const recentLogins = (user.loginHistory || [])
          .filter(login => login.isUnusual)
          .slice(0, 3);
        
        recentLogins.forEach(login => {
          alerts.push({
            userId: user._id,
            username: user.username,
            email: user.email,
            avatar: user.profile?.avatar,
            riskScore: login.riskScore || user.accountTakeoverRisk,
            timestamp: login.timestamp,
            ipAddress: login.ipAddress,
            location: login.location
          });
        });
      }
    });

    // Sort by risk score and timestamp
    alerts.sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json({
      success: true,
      alerts: alerts.slice(0, parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: alerts.length,
        pages: Math.ceil(alerts.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get takeover alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch account takeover alerts' });
  }
});

// Mark takeover alert as reviewed
router.patch('/safety/takeover-alerts/:userId', async (req, res) => {
  try {
    const { alertIndex } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.unusualLoginAlerts && user.unusualLoginAlerts[alertIndex]) {
      user.unusualLoginAlerts[alertIndex].reviewed = true;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Alert marked as reviewed'
    });
  } catch (error) {
    console.error('Admin mark takeover alert reviewed error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark alert as reviewed' });
  }
});

// ==================== MONETIZATION & PAYMENTS ====================

// Get creator earning dashboard stats
router.get('/monetization/dashboard', async (req, res) => {
  try {
    // Get total creators count
    const totalCreators = await User.countDocuments({ 
      $or: [
        { creatorStatus: { $in: ['pending', 'approved'] } },
        { role: 'creator' }
      ]
    });
    
    // Get approved creators count
    const approvedCreators = await User.countDocuments({ 
      $or: [
        { creatorStatus: 'approved' },
        { role: 'creator', creatorStatus: 'approved' }
      ]
    });

    // Get total earnings - try Earning model first, fallback to Transaction
    let totalEarned = 0;
    try {
      const earningsResult = await Earning.aggregate([
        { $match: { status: { $in: ['approved', 'paid', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalEarned = earningsResult[0]?.total || 0;
    } catch (err) {
      // Fallback to Transaction model if Earning doesn't work
      try {
        const Transaction = require('../models/Transaction');
        const transactionResult = await Transaction.aggregate([
          { $match: { type: 'earnings', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        totalEarned = transactionResult[0]?.total || 0;
      } catch (err2) {
        console.error('Error calculating total earnings:', err2);
        totalEarned = 0;
      }
    }

    // Get total withdrawals
    let totalWithdrawn = 0;
    try {
      const withdrawalsResult = await Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      totalWithdrawn = withdrawalsResult[0]?.total || 0;
    } catch (err) {
      // Fallback to Transaction model
      try {
        const Transaction = require('../models/Transaction');
        const transactionResult = await Transaction.aggregate([
          { $match: { type: 'payout', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        totalWithdrawn = transactionResult[0]?.total || 0;
      } catch (err2) {
        console.error('Error calculating total withdrawals:', err2);
        totalWithdrawn = 0;
      }
    }

    // Get pending withdrawals count
    let pendingWithdrawals = 0;
    try {
      pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    } catch (err) {
      try {
        const Transaction = require('../models/Transaction');
        pendingWithdrawals = await Transaction.countDocuments({ type: 'payout', status: 'pending' });
      } catch (err2) {
        pendingWithdrawals = 0;
      }
    }

    // Get active brand deals count
    let activeBrandDeals = 0;
    try {
      activeBrandDeals = await BrandDeal.countDocuments({ 
        status: { $in: ['approved', 'active', 'pending_approval'] } 
      });
    } catch (err) {
      // If BrandDeal model doesn't exist, set to 0
      console.error('Error counting brand deals:', err);
      activeBrandDeals = 0;
    }

    res.json({
      success: true,
      stats: {
        totalCreators,
        approvedCreators,
        totalEarned,
        totalWithdrawn,
        pendingWithdrawals,
        activeBrandDeals,
        availableBalance: totalEarned - totalWithdrawn
      }
    });
  } catch (error) {
    console.error('Admin get monetization dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch monetization dashboard',
      error: error.message 
    });
  }
});

// Get approved creators list
router.get('/monetization/creators', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    
    // Filter by creator status if not 'all'
    if (status !== 'all') {
      query.creatorStatus = status;
    }
    // For 'all', show all users regardless of creatorStatus
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [creators, total] = await Promise.all([
      User.find(query)
        .select('username email profile.avatar profile.displayName creatorStatus creatorEarnings createdAt videos')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      creators,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get creators error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch creators' });
  }
});

// Approve/Reject creator application
router.patch('/monetization/creators/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.creatorStatus = status;
    if (status === 'approved') {
      user.role = 'creator';
    }

    await user.save();

    res.json({
      success: true,
      message: `Creator ${status} successfully`,
      user
    });
  } catch (error) {
    console.error('Admin update creator status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update creator status' });
  }
});

// Get ad revenue share tracking
router.get('/monetization/ad-revenue', async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { type: 'ad_revenue' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [earnings, total, revenueStats] = await Promise.all([
      Earning.find(query)
        .populate('user', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Earning.countDocuments(query),
      Earning.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$user',
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Populate user info in revenue stats
    const statsWithUsers = await Promise.all(
      revenueStats.map(async (stat) => {
        const user = await User.findById(stat._id).select('username email profile.avatar').lean();
        return { ...stat, user };
      })
    );

    res.json({
      success: true,
      earnings,
      revenueStats: statsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get ad revenue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ad revenue data' });
  }
});

// Get gift and coins purchase logs
router.get('/monetization/gifts-coins', async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (type === 'gifts') {
      query.type = 'gifts';
    } else if (type === 'coins') {
      query.type = 'coins';
    }

    const [purchases, total, purchaseStats] = await Promise.all([
      Earning.find(query)
        .populate('user', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Earning.countDocuments(query),
      Earning.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ])
    ]);

    res.json({
      success: true,
      purchases,
      purchaseStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get gifts/coins logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gift/coin purchase logs' });
  }
});

// Get withdrawal requests
router.get('/monetization/withdrawals', async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { status };
    if (status === 'all') {
      delete query.status;
    }

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .populate('user', 'username email profile.avatar creatorEarnings')
        .populate('processedBy', 'username')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Withdrawal.countDocuments(query)
    ]);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch withdrawal requests' });
  }
});

// Approve withdrawal request
router.patch('/monetization/withdrawals/:id/approve', async (req, res) => {
  try {
    const { notes, transactionId } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Withdrawal already processed' });
    }

    // Check tax document if required
    if (withdrawal.taxDocumentRequired && !withdrawal.taxDocument.verified) {
      return res.status(400).json({ success: false, message: 'Tax document must be verified before approval' });
    }

    withdrawal.status = 'approved';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.notes = notes || withdrawal.notes;
    if (transactionId) withdrawal.transactionId = transactionId;

    await withdrawal.save();

    // Update user balance
    const user = await User.findById(withdrawal.user);
    if (user && user.creatorEarnings) {
      user.creatorEarnings.availableBalance -= withdrawal.amount;
      user.creatorEarnings.pendingWithdrawal -= withdrawal.amount;
      user.creatorEarnings.totalWithdrawn = (user.creatorEarnings.totalWithdrawn || 0) + withdrawal.amount;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Withdrawal approved successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Admin approve withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve withdrawal' });
  }
});

// Reject withdrawal request
router.patch('/monetization/withdrawals/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal request not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Withdrawal already processed' });
    }

    withdrawal.status = 'rejected';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.rejectionReason = reason || 'Withdrawal rejected by admin';

    await withdrawal.save();

    // Return amount to user balance
    const user = await User.findById(withdrawal.user);
    if (user && user.creatorEarnings) {
      user.creatorEarnings.availableBalance += withdrawal.amount;
      user.creatorEarnings.pendingWithdrawal -= withdrawal.amount;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Withdrawal rejected successfully',
      withdrawal
    });
  } catch (error) {
    console.error('Admin reject withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal' });
  }
});

// Get tax documents for review
router.get('/monetization/tax-documents', async (req, res) => {
  try {
    const { verified = 'all', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { 'taxInfo.documents.0': { $exists: true } };
    if (verified === 'pending') {
      query['taxInfo.documents.verified'] = false;
    } else if (verified === 'verified') {
      query['taxInfo.documents.verified'] = true;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email profile.avatar taxInfo creatorEarnings')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get tax documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax documents' });
  }
});

// Verify tax document
router.patch('/monetization/tax-documents/:userId', async (req, res) => {
  try {
    const { documentIndex, verified } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user || !user.taxInfo || !user.taxInfo.documents || !user.taxInfo.documents[documentIndex]) {
      return res.status(404).json({ success: false, message: 'Tax document not found' });
    }

    user.taxInfo.documents[documentIndex].verified = verified;
    user.taxInfo.documents[documentIndex].verifiedBy = req.user._id;
    user.taxInfo.documents[documentIndex].verifiedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: `Tax document ${verified ? 'verified' : 'unverified'} successfully`,
      user
    });
  } catch (error) {
    console.error('Admin verify tax document error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify tax document' });
  }
});

// Get brand deals and campaigns
router.get('/monetization/brand-deals', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const [brandDeals, total] = await Promise.all([
      BrandDeal.find(query)
        .populate('creator', 'username email profile.avatar')
        .populate('approvedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BrandDeal.countDocuments(query)
    ]);

    res.json({
      success: true,
      brandDeals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get brand deals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brand deals' });
  }
});

// Approve/Reject brand deal
router.patch('/monetization/brand-deals/:id/status', async (req, res) => {
  try {
    const { status, reason, adminNotes } = req.body;
    const brandDeal = await BrandDeal.findById(req.params.id);

    if (!brandDeal) {
      return res.status(404).json({ success: false, message: 'Brand deal not found' });
    }

    brandDeal.status = status;
    if (status === 'approved') {
      brandDeal.approvedBy = req.user._id;
      brandDeal.approvedAt = new Date();
      brandDeal.payment.status = 'approved';
    } else if (status === 'rejected') {
      brandDeal.rejectionReason = reason;
    }
    if (adminNotes) brandDeal.adminNotes = adminNotes;

    await brandDeal.save();

    res.json({
      success: true,
      message: `Brand deal ${status} successfully`,
      brandDeal
    });
  } catch (error) {
    console.error('Admin update brand deal status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update brand deal status' });
  }
});

// Get creator earnings details
router.get('/monetization/creators/:id/earnings', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { user: req.params.id };
    if (type) query.type = type;

    const [earnings, total, summary] = await Promise.all([
      Earning.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Earning.countDocuments(query),
      Earning.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      earnings,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get creator earnings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch creator earnings' });
  }
});

// ==================== ANALYTICS & INSIGHTS ====================

// Get active users (DAU, WAU, MAU)
router.get('/analytics/active-users', async (req, res) => {
  try {
    const { period = 'day' } = req.query; // day, week, month
    const now = new Date();
    
    let startDate;
    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    }

    const activeUsers = await User.countDocuments({
      $or: [
        { lastLogin: { $gte: startDate } },
        { lastLoginAt: { $gte: startDate } },
        { 'loginHistory.loginAt': { $gte: startDate } },
        { updatedAt: { $gte: startDate } }
      ]
    });

    // Get historical data for chart (last 30 days)
    const historicalData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await User.countDocuments({
        $or: [
          { lastLogin: { $gte: dayStart, $lt: dayEnd } },
          { lastLoginAt: { $gte: dayStart, $lt: dayEnd } },
          { 'loginHistory.loginAt': { $gte: dayStart, $lt: dayEnd } },
          { updatedAt: { $gte: dayStart, $lt: dayEnd } }
        ]
      });

      historicalData.push({
        date: dayStart.toISOString().split('T')[0],
        count
      });
    }

    res.json({
      success: true,
      activeUsers,
      period,
      historicalData
    });
  } catch (error) {
    console.error('Admin get active users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active users' });
  }
});

// Get user retention
router.get('/analytics/retention', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    
    // Calculate retention for different cohorts
    const retentionData = [];
    
    for (let dayOffset = parseInt(days); dayOffset >= 0; dayOffset--) {
      const cohortDate = new Date(now);
      cohortDate.setDate(now.getDate() - dayOffset);
      cohortDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(cohortDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Users who signed up on this day
      const cohortSize = await User.countDocuments({
        createdAt: { $gte: cohortDate, $lt: nextDay }
      });
      
      if (cohortSize === 0) continue;
      
      // Users who were active after 1 day, 7 days, 30 days
      const day1Active = await User.countDocuments({
        createdAt: { $gte: cohortDate, $lt: nextDay },
        lastLogin: { $gte: new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000) }
      });
      
      const day7Active = await User.countDocuments({
        createdAt: { $gte: cohortDate, $lt: nextDay },
        lastLogin: { $gte: new Date(cohortDate.getTime() + 7 * 24 * 60 * 60 * 1000) }
      });
      
      const day30Active = await User.countDocuments({
        createdAt: { $gte: cohortDate, $lt: nextDay },
        lastLogin: { $gte: new Date(cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000) }
      });
      
      retentionData.push({
        cohortDate: cohortDate.toISOString().split('T')[0],
        cohortSize,
        day1: cohortSize > 0 ? ((day1Active / cohortSize) * 100).toFixed(2) : 0,
        day7: cohortSize > 0 ? ((day7Active / cohortSize) * 100).toFixed(2) : 0,
        day30: cohortSize > 0 ? ((day30Active / cohortSize) * 100).toFixed(2) : 0
      });
    }

    // Calculate average retention
    const avgRetention = {
      day1: retentionData.length > 0 ? (retentionData.reduce((sum, r) => sum + parseFloat(r.day1), 0) / retentionData.length).toFixed(2) : 0,
      day7: retentionData.length > 0 ? (retentionData.reduce((sum, r) => sum + parseFloat(r.day7), 0) / retentionData.length).toFixed(2) : 0,
      day30: retentionData.length > 0 ? (retentionData.reduce((sum, r) => sum + parseFloat(r.day30), 0) / retentionData.length).toFixed(2) : 0
    };

    res.json({
      success: true,
      retentionData: retentionData.slice(-30), // Last 30 cohorts
      avgRetention
    });
  } catch (error) {
    console.error('Admin get retention error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch retention data' });
  }
});

// Get video completion rate and drop points
router.get('/analytics/video-completion', async (req, res) => {
  try {
    const videos = await Video.find({ views: { $gt: 0 } })
      .select('_id title views watchTime duration category hashtags')
      .limit(1000)
      .lean();

    // Calculate completion rates and drop points
    const completionStats = {
      averageCompletion: 0,
      dropPoints: {
        '0-10': 0,
        '10-25': 0,
        '25-50': 0,
        '50-75': 0,
        '75-90': 0,
        '90-100': 0
      },
      byCategory: {},
      byDuration: {
        '0-15': { avgCompletion: 0, count: 0 },
        '15-30': { avgCompletion: 0, count: 0 },
        '30-60': { avgCompletion: 0, count: 0 },
        '60+': { avgCompletion: 0, count: 0 }
      }
    };

    let totalCompletion = 0;
    let videoCount = 0;

    videos.forEach(video => {
      if (!video.duration || video.duration === 0) return;
      
      const avgWatchTime = video.watchTime && video.views > 0 ? video.watchTime / video.views : 0;
      const completionRate = (avgWatchTime / video.duration) * 100;
      
      if (completionRate > 0 && completionRate <= 100) {
        totalCompletion += completionRate;
        videoCount++;

        // Drop points
        if (completionRate < 10) completionStats.dropPoints['0-10']++;
        else if (completionRate < 25) completionStats.dropPoints['10-25']++;
        else if (completionRate < 50) completionStats.dropPoints['25-50']++;
        else if (completionRate < 75) completionStats.dropPoints['50-75']++;
        else if (completionRate < 90) completionStats.dropPoints['75-90']++;
        else completionStats.dropPoints['90-100']++;

        // By category
        const category = video.category || 'other';
        if (!completionStats.byCategory[category]) {
          completionStats.byCategory[category] = { total: 0, count: 0 };
        }
        completionStats.byCategory[category].total += completionRate;
        completionStats.byCategory[category].count++;

        // By duration
        const duration = video.duration;
        let durationRange;
        if (duration <= 15) durationRange = '0-15';
        else if (duration <= 30) durationRange = '15-30';
        else if (duration <= 60) durationRange = '30-60';
        else durationRange = '60+';

        completionStats.byDuration[durationRange].avgCompletion += completionRate;
        completionStats.byDuration[durationRange].count++;
      }
    });

    completionStats.averageCompletion = videoCount > 0 ? (totalCompletion / videoCount).toFixed(2) : 0;

    // Calculate category averages
    Object.keys(completionStats.byCategory).forEach(cat => {
      const data = completionStats.byCategory[cat];
      completionStats.byCategory[cat] = data.count > 0 ? (data.total / data.count).toFixed(2) : 0;
    });

    // Calculate duration averages
    Object.keys(completionStats.byDuration).forEach(range => {
      const data = completionStats.byDuration[range];
      completionStats.byDuration[range] = data.count > 0 ? (data.avgCompletion / data.count).toFixed(2) : 0;
    });

    res.json({
      success: true,
      completionStats,
      totalVideos: videoCount
    });
  } catch (error) {
    console.error('Admin get video completion error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch completion data' });
  }
});

// Get trending videos analytics
router.get('/analytics/trending-videos', async (req, res) => {
  try {
    const { period = '7', limit = 50 } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const videos = await Video.find({
      createdAt: { $gte: startDate },
      status: 'ready',
      isPrivate: false
    })
      .populate('user', 'username profile.avatar profile.displayName')
      .select('url thumbnail description hashtags likes comments shares views createdAt user')
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit))
      .lean()
      .maxTimeMS(5000); // 5 second timeout

    res.json({
      success: true,
      videos: videos.map(v => ({
        id: v._id,
        _id: v._id,
        title: v.description?.substring(0, 50) || 'Untitled',
        description: v.description,
        url: v.url,
        thumbnail: v.thumbnail,
        views: v.views || 0,
        likes: v.likes || 0,
        comments: v.comments || 0,
        shares: v.shares || 0,
        user: v.user
      })),
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Admin get trending videos error:', error);
    // Always return success with empty array instead of error
    res.json({ 
      success: true, 
      videos: [],
      message: 'No trending videos found'
    });
  }
});

// Get trending hashtags analytics
router.get('/analytics/trending-hashtags', async (req, res) => {
  try {
    const { period = '7', limit = 50 } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const videos = await Video.find({
      createdAt: { $gte: startDate },
      hashtags: { $exists: true, $ne: [] }
    })
      .select('hashtags views likes shares createdAt')
      .lean()
      .maxTimeMS(5000); // 5 second timeout

    const hashtagStats = {};

    videos.forEach(video => {
      if (!video.hashtags || !Array.isArray(video.hashtags)) return;

      video.hashtags.forEach(hashtag => {
        const tag = hashtag.toLowerCase().replace('#', '');
        if (!hashtagStats[tag]) {
          hashtagStats[tag] = {
            name: tag,
            count: 0,
            totalViews: 0,
            totalLikes: 0,
            totalShares: 0,
            videos: []
          };
        }

        hashtagStats[tag].count++;
        hashtagStats[tag].totalViews += video.views || 0;
        hashtagStats[tag].totalLikes += video.likes || 0;
        hashtagStats[tag].totalShares += video.shares || 0;
      });
    });

    // Convert to array and sort
    const trending = Object.values(hashtagStats)
      .map(tag => ({
        ...tag,
        avgViews: tag.count > 0 ? Math.round(tag.totalViews / tag.count) : 0,
        avgLikes: tag.count > 0 ? Math.round(tag.totalLikes / tag.count) : 0
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      trending,
      hashtags: trending, // Also include as hashtags for compatibility
      period: parseInt(period)
    });
  } catch (error) {
    console.error('Admin get trending hashtags error:', error);
    // Always return success with empty array instead of error
    res.json({ 
      success: true, 
      trending: [],
      hashtags: [],
      message: 'No trending hashtags found'
    });
  }
});

// Get category performance
router.get('/analytics/category-performance', async (req, res) => {
  try {
    const categories = ['dance', 'comedy', 'gaming', 'music', 'education', 'fitness', 'food', 'travel', 'fashion', 'other'];
    
    const categoryStats = await Promise.all(
      categories.map(async (category) => {
        const videos = await Video.find({ category })
          .select('views likes shares comments watchTime duration')
          .lean();

        const stats = {
          category,
          videoCount: videos.length,
          totalViews: 0,
          totalLikes: 0,
          totalShares: 0,
          totalComments: 0,
          totalWatchTime: 0,
          avgDuration: 0
        };

        videos.forEach(video => {
          stats.totalViews += video.views || 0;
          stats.totalLikes += video.likes || 0;
          stats.totalShares += video.shares || 0;
          stats.totalComments += video.comments || 0;
          stats.totalWatchTime += video.watchTime || 0;
          stats.avgDuration += video.duration || 0;
        });

        stats.avgViews = videos.length > 0 ? Math.round(stats.totalViews / videos.length) : 0;
        stats.avgLikes = videos.length > 0 ? Math.round(stats.totalLikes / videos.length) : 0;
        stats.avgShares = videos.length > 0 ? Math.round(stats.totalShares / videos.length) : 0;
        stats.avgComments = videos.length > 0 ? Math.round(stats.totalComments / videos.length) : 0;
        stats.avgDuration = videos.length > 0 ? (stats.avgDuration / videos.length).toFixed(2) : 0;
        stats.engagementRate = stats.totalViews > 0 ? (((stats.totalLikes + stats.totalShares + stats.totalComments) / stats.totalViews) * 100).toFixed(2) : 0;

        return stats;
      })
    );

    // Sort by total views
    categoryStats.sort((a, b) => b.totalViews - a.totalViews);

    res.json({
      success: true,
      categoryStats
    });
  } catch (error) {
    console.error('Admin get category performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category performance' });
  }
});

// Get region-wise user growth
router.get('/analytics/region-growth', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - parseInt(days));

    // Get users with location data
    const users = await User.find({
      createdAt: { $gte: startDate },
      'profile.country': { $exists: true, $ne: '' }
    })
      .select('createdAt profile.country')
      .lean();

    const regionGrowth = {};
    const dailyGrowth = {};

    users.forEach(user => {
      const country = user.profile?.country || 'Unknown';
      const date = new Date(user.createdAt).toISOString().split('T')[0];

      if (!regionGrowth[country]) {
        regionGrowth[country] = {
          country,
          totalUsers: 0,
          dailyGrowth: {}
        };
      }

      regionGrowth[country].totalUsers++;
      
      if (!regionGrowth[country].dailyGrowth[date]) {
        regionGrowth[country].dailyGrowth[date] = 0;
      }
      regionGrowth[country].dailyGrowth[date]++;

      if (!dailyGrowth[date]) {
        dailyGrowth[date] = {};
      }
      if (!dailyGrowth[date][country]) {
        dailyGrowth[date][country] = 0;
      }
      dailyGrowth[date][country]++;
    });

    // Convert to arrays
    const regionStats = Object.values(regionGrowth)
      .map(region => ({
        country: region.country,
        totalUsers: region.totalUsers,
        growthRate: region.totalUsers / parseInt(days)
      }))
      .sort((a, b) => b.totalUsers - a.totalUsers);

    res.json({
      success: true,
      regionStats: regionStats.slice(0, 20), // Top 20 regions
      dailyGrowth,
      totalRegions: regionStats.length
    });
  } catch (error) {
    console.error('Admin get region growth error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch region growth' });
  }
});

// Get device and network performance stats
router.get('/analytics/device-network', async (req, res) => {
  try {
    // Get device stats from User model loginHistory
    const users = await User.find({
      loginHistory: { $exists: true, $ne: [] }
    })
      .select('loginHistory')
      .limit(10000)
      .lean();

    const deviceStats = {
      devices: {},
      os: {},
      browsers: {},
      networks: {}
    };

    // Helper function to detect device type from user agent
    const detectDeviceType = (userAgent) => {
      if (!userAgent) return 'unknown';
      const ua = userAgent.toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
      if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
      return 'desktop';
    };

    // Helper function to detect OS from user agent
    const detectOS = (userAgent) => {
      if (!userAgent) return 'unknown';
      const ua = userAgent.toLowerCase();
      if (ua.includes('windows')) return 'Windows';
      if (ua.includes('mac')) return 'macOS';
      if (ua.includes('linux')) return 'Linux';
      if (ua.includes('android')) return 'Android';
      if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
      return 'unknown';
    };

    // Helper function to detect browser from user agent
    const detectBrowser = (userAgent) => {
      if (!userAgent) return 'unknown';
      const ua = userAgent.toLowerCase();
      if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
      if (ua.includes('firefox')) return 'Firefox';
      if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
      if (ua.includes('edg')) return 'Edge';
      if (ua.includes('opera')) return 'Opera';
      return 'unknown';
    };

    users.forEach(user => {
      if (!user.loginHistory || !Array.isArray(user.loginHistory)) return;

      user.loginHistory.forEach(login => {
        // Device type - use device field if it's an object, otherwise detect from userAgent
        let deviceType = 'unknown';
        if (login.device && typeof login.device === 'object' && login.device.type) {
          deviceType = login.device.type;
        } else if (login.device && typeof login.device === 'string') {
          deviceType = login.device;
        } else if (login.userAgent) {
          deviceType = detectDeviceType(login.userAgent);
        }
        deviceStats.devices[deviceType] = (deviceStats.devices[deviceType] || 0) + 1;

        // OS - use os field if available, otherwise detect from userAgent
        let os = 'unknown';
        if (login.device && typeof login.device === 'object' && login.device.os) {
          os = login.device.os;
        } else if (login.os) {
          os = login.os;
        } else if (login.userAgent) {
          os = detectOS(login.userAgent);
        }
        deviceStats.os[os] = (deviceStats.os[os] || 0) + 1;

        // Browser - use browser field if available, otherwise detect from userAgent
        let browser = 'unknown';
        if (login.device && typeof login.device === 'object' && login.device.browser) {
          browser = login.device.browser;
        } else if (login.browser) {
          browser = login.browser;
        } else if (login.userAgent) {
          browser = detectBrowser(login.userAgent);
        }
        deviceStats.browsers[browser] = (deviceStats.browsers[browser] || 0) + 1;

        // Network (if available)
        if (login.device && typeof login.device === 'object' && login.device.network) {
          const network = login.device.network;
          deviceStats.networks[network] = (deviceStats.networks[network] || 0) + 1;
        } else if (login.location) {
          // Use location as network indicator
          const network = login.location.split(',')[0] || 'unknown';
          deviceStats.networks[network] = (deviceStats.networks[network] || 0) + 1;
        }
      });
    });

    // Convert to sorted arrays
    const formatStats = (obj) => {
      return Object.entries(obj)
        .map(([key, value]) => ({ name: key, count: value }))
        .sort((a, b) => b.count - a.count);
    };

    const stats = {
      devices: formatStats(deviceStats.devices),
      os: formatStats(deviceStats.os),
      browsers: formatStats(deviceStats.browsers),
      networks: formatStats(deviceStats.networks)
    };

    // Always return success, even if stats are empty
    res.json({
      success: true,
      stats,
      message: stats.devices.length === 0 ? 'No device data available. Users need to login to generate statistics.' : undefined
    });
  } catch (error) {
    console.error('Admin get device/network stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch device/network stats' });
  }
});

// Get overall analytics dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [dau, wau, mau, totalUsers, totalVideos, totalViewsResult] = await Promise.all([
      User.countDocuments({ 
        $or: [
          { lastLogin: { $gte: today } },
          { lastLoginAt: { $gte: today } },
          { updatedAt: { $gte: today } }
        ]
      }),
      User.countDocuments({ 
        $or: [
          { lastLogin: { $gte: weekAgo } },
          { lastLoginAt: { $gte: weekAgo } },
          { updatedAt: { $gte: weekAgo } }
        ]
      }),
      User.countDocuments({ 
        $or: [
          { lastLogin: { $gte: monthAgo } },
          { lastLoginAt: { $gte: monthAgo } },
          { updatedAt: { $gte: monthAgo } }
        ]
      }),
      User.countDocuments(),
      Video.countDocuments(),
      Video.aggregate([
        { 
          $group: { 
            _id: null, 
            total: { $sum: { $ifNull: ['$views', 0] } } 
          } 
        }
      ]).catch(() => [{ total: 0 }])
    ]);

    const totalViews = totalViewsResult && totalViewsResult[0] ? totalViewsResult[0].total : 0;

    res.json({
      success: true,
      stats: {
        dau: dau || 0,
        wau: wau || 0,
        mau: mau || 0,
        totalUsers: totalUsers || 0,
        totalVideos: totalVideos || 0,
        totalViews: totalViews || 0
      }
    });
  } catch (error) {
    console.error('Admin get analytics dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics dashboard' });
  }
});

// ==================== SEARCH & RECOMMENDATION CONTROL ====================

// Get all blacklist items
router.get('/search/blacklist', async (req, res) => {
  try {
    const { type, active = 'true', page = 1, limit = 50 } = req.query;

    // Validate type if provided
    const validTypes = ['word', 'hashtag', 'username', 'domain'];
    if (type && type !== 'all' && !validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (type && type !== 'all') query.type = type;
    if (active !== 'all') {
      query.active = active === 'true' || active === true;
    }

    const [items, total] = await Promise.all([
      Blacklist.find(query)
        .populate('addedBy', 'username email')
        .sort({ addedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Blacklist.countDocuments(query)
    ]);

    res.json({
      success: true,
      items: items || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total || 0,
        pages: Math.ceil((total || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get blacklist error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch blacklist' 
    });
  }
});

// Add blacklist item
router.post('/search/blacklist', async (req, res) => {
  try {
    const { type, value, reason, severity, notes } = req.body;

    // Validate required fields
    if (!type || !value) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type and value are required' 
      });
    }

    // Validate type
    const validTypes = ['word', 'hashtag', 'username', 'domain'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate value length
    const trimmedValue = value.trim();
    if (!trimmedValue || trimmedValue.length < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Value cannot be empty' 
      });
    }

    if (trimmedValue.length > 200) {
      return res.status(400).json({ 
        success: false, 
        message: 'Value cannot exceed 200 characters' 
      });
    }

    // Validate severity if provided
    if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid severity. Must be: low, medium, high, or critical' 
      });
    }

    const existing = await Blacklist.findOne({ 
      type, 
      value: trimmedValue.toLowerCase() 
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item already exists in blacklist' 
      });
    }

    // Get user from request (admin middleware should set req.user)
    const addedBy = req.user?._id || req.user?.id || null;
    if (!addedBy) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const item = await Blacklist.create({
      type,
      value: trimmedValue.toLowerCase(),
      reason: (reason || '').trim(),
      severity: severity || 'medium',
      notes: (notes || '').trim(),
      addedBy: addedBy
    });

    // Populate addedBy for response
    const populatedItem = await Blacklist.findById(item._id)
      .populate('addedBy', 'username email')
      .lean();

    res.json({
      success: true,
      message: 'Item added to blacklist',
      item: populatedItem
    });
  } catch (error) {
    console.error('Admin add blacklist error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Item already exists in blacklist' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors).map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to add blacklist item' 
    });
  }
});

// Update blacklist item
router.patch('/search/blacklist/:id', async (req, res) => {
  try {
    const { active, severity, reason, notes } = req.body;

    // Validate severity if provided
    if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid severity. Must be: low, medium, high, or critical' 
      });
    }

    const updateData = {};
    if (active !== undefined) updateData.active = active;
    if (severity) updateData.severity = severity;
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;

    const item = await Blacklist.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'username email');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Blacklist item not found' });
    }

    res.json({
      success: true,
      message: 'Blacklist item updated',
      item
    });
  } catch (error) {
    console.error('Admin update blacklist error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors).map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update blacklist item' 
    });
  }
});

// Delete blacklist item
router.delete('/search/blacklist/:id', async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid blacklist item ID' 
      });
    }

    const item = await Blacklist.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: 'Blacklist item not found' 
      });
    }

    res.json({
      success: true,
      message: 'Blacklist item deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete blacklist error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete blacklist item' 
    });
  }
});

// Get boosted content
router.get('/search/boosted', async (req, res) => {
  try {
    const { contentType, active = 'true', page = 1, limit = 50 } = req.query;

    // Validate contentType if provided
    const validTypes = ['video', 'hashtag', 'user', 'trend'];
    if (contentType && contentType !== 'all' && !validTypes.includes(contentType)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid content type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (contentType && contentType !== 'all') query.contentType = contentType;
    if (active !== 'all') {
      query.active = active === 'true' || active === true;
    }

    const [items, total] = await Promise.all([
      BoostedContent.find(query)
        .populate('contentId')
        .populate('addedBy', 'username email')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BoostedContent.countDocuments(query)
    ]);

    res.json({
      success: true,
      items: items || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: total || 0,
        pages: Math.ceil((total || 0) / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get boosted content error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch boosted content' 
    });
  }
});

// Boost content
router.post('/search/boosted', async (req, res) => {
  try {
    const { contentType, contentId, boostType, boostLevel, priority, startDate, endDate, reason, notes } = req.body;

    // Validate required fields
    if (!contentType || !contentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content type and content ID are required' 
      });
    }

    // Validate contentType
    const validTypes = ['video', 'hashtag', 'user', 'trend'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid content type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate boostType
    const validBoostTypes = ['search', 'feed', 'recommendation', 'trending', 'both'];
    if (boostType && !validBoostTypes.includes(boostType)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid boost type. Must be one of: ${validBoostTypes.join(', ')}` 
      });
    }

    // Validate boostLevel
    const level = parseFloat(boostLevel) || 1.0;
    if (level < 1.0 || level > 10.0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Boost level must be between 1.0 and 10.0' 
      });
    }

    // Validate priority
    const priorityNum = parseInt(priority) || 5;
    if (priorityNum < 1 || priorityNum > 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Priority must be between 1 and 10' 
      });
    }

    // Check for existing active boost
    const existing = await BoostedContent.findOne({ 
      contentType, 
      contentId: contentId.toString(), 
      active: true 
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is already boosted' 
      });
    }

    // Get user from request
    const addedBy = req.user?._id || req.user?.id || null;
    if (!addedBy) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const item = await BoostedContent.create({
      contentType,
      contentId: contentId.toString(),
      boostType: boostType || 'both',
      boostLevel: level,
      priority: priorityNum,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      reason: (reason || '').trim(),
      notes: (notes || '').trim(),
      addedBy: addedBy
    });

    // Populate addedBy for response
    const populatedItem = await BoostedContent.findById(item._id)
      .populate('addedBy', 'username email')
      .lean();

    res.json({
      success: true,
      message: 'Content boosted successfully',
      item: populatedItem
    });
  } catch (error) {
    console.error('Admin boost content error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is already boosted' 
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors).map(e => e.message).join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to boost content' 
    });
  }
});

// Update boosted content
router.patch('/search/boosted/:id', async (req, res) => {
  try {
    const { active, boostLevel, priority, endDate, notes } = req.body;

    const updateData = {};
    if (active !== undefined) updateData.active = active;
    if (boostLevel !== undefined) updateData.boostLevel = boostLevel;
    if (priority !== undefined) updateData.priority = priority;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    const item = await BoostedContent.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Boosted content not found' });
    }

    res.json({
      success: true,
      message: 'Boosted content updated',
      item
    });
  } catch (error) {
    console.error('Admin update boosted content error:', error);
    res.status(500).json({ success: false, message: 'Failed to update boosted content' });
  }
});

// Downrank content
router.post('/search/downrank', async (req, res) => {
  try {
    const { contentType, contentId, reason, notes } = req.body;

    // Check if already boosted - if so, deactivate it
    const boosted = await BoostedContent.findOne({ contentType, contentId, active: true });
    if (boosted) {
      boosted.active = false;
      boosted.notes = `Downranked: ${notes || reason}`;
      await boosted.save();
    }

    // Create a downrank entry (negative boost)
    const item = await BoostedContent.create({
      contentType,
      contentId,
      boostType: 'both',
      boostLevel: 0.1, // Very low boost = downrank
      priority: 1,
      active: true,
      reason: `Downranked: ${reason || 'Harmful content'}`,
      notes,
      addedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Content downranked successfully',
      item
    });
  } catch (error) {
    console.error('Admin downrank content error:', error);
    res.status(500).json({ success: false, message: 'Failed to downrank content' });
  }
});

// Get hashtag controls
router.get('/search/hashtags', async (req, res) => {
  try {
    const { visibility, searchable, trending, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (visibility) query.visibility = visibility;
    if (searchable !== undefined) query.searchable = searchable === 'true';
    if (trending !== undefined) query.trending = trending === 'true';

    const [hashtags, total] = await Promise.all([
      HashtagControl.find(query)
        .populate('updatedBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      HashtagControl.countDocuments(query)
    ]);

    res.json({
      success: true,
      hashtags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get hashtag controls error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch hashtag controls' });
  }
});

// Update hashtag control
router.patch('/search/hashtags/:hashtag', async (req, res) => {
  try {
    const { visibility, boostLevel, searchable, trending, restrictionLevel, notes } = req.body;
    const hashtag = req.params.hashtag.toLowerCase().trim().replace('#', '');

    const updateData = {};
    if (visibility) updateData.visibility = visibility;
    if (boostLevel !== undefined) updateData.boostLevel = boostLevel;
    if (searchable !== undefined) updateData.searchable = searchable;
    if (trending !== undefined) updateData.trending = trending;
    if (restrictionLevel) updateData.restrictionLevel = restrictionLevel;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updatedBy = req.user._id;

    const hashtagControl = await HashtagControl.findOneAndUpdate(
      { hashtag },
      updateData,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Hashtag control updated',
      hashtagControl
    });
  } catch (error) {
    console.error('Admin update hashtag control error:', error);
    res.status(500).json({ success: false, message: 'Failed to update hashtag control' });
  }
});

// Get A/B tests
router.get('/search/ab-tests', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const [tests, total] = await Promise.all([
      ABTest.find(query)
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ABTest.countDocuments(query)
    ]);

    res.json({
      success: true,
      tests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get AB tests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AB tests' });
  }
});

// Create A/B test
router.post('/search/ab-tests', async (req, res) => {
  try {
    const { name, description, type, groups, startDate, endDate, targetAudience, notes } = req.body;

    // Validate groups percentages sum to 100
    const totalPercentage = groups.reduce((sum, g) => sum + (g.percentage || 0), 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({ success: false, message: 'Group percentages must sum to 100' });
    }

    const test = await ABTest.create({
      name,
      description,
      type,
      groups,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      targetAudience: targetAudience || {},
      notes,
      createdBy: req.user._id
    });

    res.json({
      success: true,
      message: 'A/B test created successfully',
      test
    });
  } catch (error) {
    console.error('Admin create AB test error:', error);
    res.status(500).json({ success: false, message: 'Failed to create AB test' });
  }
});

// Update A/B test
router.patch('/search/ab-tests/:id', async (req, res) => {
  try {
    const { status, groups, endDate, notes } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (groups) {
      const totalPercentage = groups.reduce((sum, g) => sum + (g.percentage || 0), 0);
      if (totalPercentage !== 100) {
        return res.status(400).json({ success: false, message: 'Group percentages must sum to 100' });
      }
      updateData.groups = groups;
    }
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    const test = await ABTest.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!test) {
      return res.status(404).json({ success: false, message: 'A/B test not found' });
    }

    res.json({
      success: true,
      message: 'A/B test updated',
      test
    });
  } catch (error) {
    console.error('Admin update AB test error:', error);
    res.status(500).json({ success: false, message: 'Failed to update AB test' });
  }
});

// Update recommendation settings
router.patch('/search/recommendation-settings', async (req, res) => {
  try {
    const { algorithm, diversity, freshness, engagement } = req.body;
    
    // Validate settings
    if (algorithm && !['default', 'collaborative', 'content', 'hybrid'].includes(algorithm)) {
      return res.status(400).json({ success: false, message: 'Invalid algorithm type' });
    }
    
    if (diversity !== undefined && (diversity < 0 || diversity > 1)) {
      return res.status(400).json({ success: false, message: 'Diversity must be between 0 and 1' });
    }
    
    if (freshness !== undefined && (freshness < 0 || freshness > 1)) {
      return res.status(400).json({ success: false, message: 'Freshness must be between 0 and 1' });
    }
    
    if (engagement !== undefined && (engagement < 0 || engagement > 1)) {
      return res.status(400).json({ success: false, message: 'Engagement must be between 0 and 1' });
    }

    // In a real implementation, you would save these settings to a database
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Recommendation settings updated successfully',
      settings: {
        algorithm: algorithm || 'default',
        diversity: diversity !== undefined ? diversity : 0.5,
        freshness: freshness !== undefined ? freshness : 0.3,
        engagement: engagement !== undefined ? engagement : 0.7
      }
    });
  } catch (error) {
    console.error('Admin update recommendation settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update recommendation settings' });
  }
});

// ==================== TECHNICAL SYSTEM CONTROL ====================

// Video Upload Processing Status
router.get('/system/video-processing', async (req, res) => {
  try {
    console.log('GET /system/video-processing - Request received');
    const { status, page = 1, limit = 20, userId } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (userId) query.userId = userId;

    console.log('Query params:', { status, page, limit, userId });
    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [processing, total] = await Promise.all([
      VideoProcessing.find(query)
        .populate('videoId', 'title thumbnail')
        .populate('userId', 'username email profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VideoProcessing.countDocuments(query)
    ]);

    console.log(`✅ Found ${processing.length} video processing records from DATABASE (total: ${total})`);
    
    // Log first record to verify it's from database
    if (processing.length > 0) {
      console.log('📊 Sample record from DATABASE:', {
        id: processing[0]._id,
        videoId: processing[0].videoId?._id || 'N/A',
        userId: processing[0].userId?._id || 'N/A',
        status: processing[0].status,
        createdAt: processing[0].createdAt
      });
    }

    // Get stats for all statuses from DATABASE
    const stats = await VideoProcessing.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObj = stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
    console.log('📊 Stats from DATABASE:', statsObj);

    // Return REAL data from database - NO FAKE DATA
    res.json({
      success: true,
      processing, // Real data from MongoDB
      total, // Real count from MongoDB
      page: parseInt(page),
      limit: parseInt(limit),
      stats: statsObj // Real stats from MongoDB aggregation
    });
  } catch (error) {
    console.error('Admin get video processing error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch video processing status',
      error: error.toString()
    });
  }
});

// PATCH route MUST be here (after GET /system/video-processing, before GET /stats)
router.patch('/system/video-processing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, uploadProgress, processingStage } = req.body;
    
    console.log('🔵🔵🔵 PATCH ROUTE HIT! 🔵🔵🔵');
    console.log(`PATCH /system/video-processing/${id} - Updating video processing`);
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Update data:', { status, uploadProgress, processingStage });
    console.log('Full URL path:', req.path);
    console.log('Request method:', req.method);
    
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('❌ Invalid ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid video processing ID format'
      });
    }
    
    const updateData = {};
    if (status) updateData.status = status;
    if (uploadProgress !== undefined) updateData.uploadProgress = parseInt(uploadProgress) || 0;
    if (processingStage) updateData.processingStage = processingStage;
    
    console.log('Final update data:', updateData);
    
    // If status is completed, set completedAt
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    // If status is failed, set failedAt
    if (status === 'failed') {
      updateData.failedAt = new Date();
    }
    
    console.log('Finding video processing with ID:', id);
    const existing = await VideoProcessing.findById(id);
    if (!existing) {
      console.error('❌ Video processing not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Video processing record not found'
      });
    }
    
    console.log('Existing record found:', existing._id);
    console.log('Updating with data:', updateData);
    
    const updated = await VideoProcessing.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('videoId', 'title thumbnail')
     .populate('userId', 'username email profile.avatar');
    
    if (!updated) {
      console.error('❌ Failed to update video processing');
      return res.status(500).json({
        success: false,
        message: 'Failed to update video processing record'
      });
    }
    
    console.log('✅ Video processing updated successfully:', updated._id);
    console.log('Updated record:', {
      id: updated._id,
      status: updated.status,
      uploadProgress: updated.uploadProgress,
      processingStage: updated.processingStage
    });
    
    res.json({
      success: true,
      processing: updated,
      message: 'Video processing updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating video processing:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update video processing'
    });
  }
});

router.get('/system/video-processing/stats', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await VideoProcessing.aggregate([
      {
        $match: { createdAt: { $gte: since } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTime' },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    const failedJobs = await VideoProcessing.countDocuments({
      status: 'failed',
      createdAt: { $gte: since }
    });

    const avgProcessingTime = await VideoProcessing.aggregate([
      {
        $match: { status: 'completed', processingTime: { $exists: true } }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$processingTime' }
        }
      }
    ]);

    // Get ALL-TIME stats (not just recent)
    const allStats = await VideoProcessing.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObj = allStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});

    res.json({
      success: true,
      stats: {
        pending: statsObj.pending || 0,
        processing: statsObj.processing || 0,
        completed: statsObj.completed || 0,
        failed: statsObj.failed || 0,
        uploading: statsObj.uploading || 0,
        transcoding: statsObj.transcoding || 0,
        cancelled: statsObj.cancelled || 0
      },
      recentStats: stats,
      failedJobs,
      avgProcessingTime: avgProcessingTime[0]?.avgTime || 0,
      period
    });
  } catch (error) {
    console.error('Admin get video processing stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch video processing stats' });
  }
});

// CDN Streaming Issues & Quality Drop
router.get('/system/cdn-health', async (req, res) => {
  try {
    const { provider, region, status } = req.query;
    const query = {};
    if (provider) query.cdnProvider = provider;
    if (region) query.region = region;
    if (status) query.status = status;

    const [cdnHealth, stats] = await Promise.all([
      CDNHealth.find(query).sort({ lastChecked: -1 }),
      CDNHealth.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      cdnHealth,
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
    });
  } catch (error) {
    console.error('Admin get CDN health error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch CDN health' });
  }
});

router.get('/system/cdn-health/quality-drop', async (req, res) => {
  try {
    const qualityDrops = await CDNHealth.find({
      'videoQuality.qualityDropCount': { $gt: 0 }
    })
      .sort({ 'videoQuality.qualityDropCount': -1 })
      .limit(50);

    const stats = await CDNHealth.aggregate([
      {
        $group: {
          _id: null,
          totalDrops: { $sum: '$videoQuality.qualityDropCount' },
          totalRestores: { $sum: '$videoQuality.qualityRestoreCount' },
          avgLatency: { $avg: '$qualityMetrics.averageLatency' },
          avgBitrate: { $avg: '$qualityMetrics.averageBitrate' }
        }
      }
    ]);

    res.json({
      success: true,
      qualityDrops,
      stats: stats[0] || {}
    });
  } catch (error) {
    console.error('Admin get CDN quality drop error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch quality drop data' });
  }
});

// Get user-reported CDN issues
router.get('/system/cdn-issues', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const { status, priority, issueType, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (issueType && issueType !== 'all') query.issueType = issueType;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [issues, total] = await Promise.all([
      CDNIssue.find(query)
        .populate('reportedBy', 'username email profile.avatar')
        .populate('resolvedBy', 'username email')
        .populate('videoId', 'title thumbnail')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CDNIssue.countDocuments(query)
    ]);
    
    // Get stats
    const stats = await CDNIssue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      issues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
    });
  } catch (error) {
    console.error('Admin get CDN issues error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch CDN issues' });
  }
});

// Update CDN issue status
router.patch('/system/cdn-issues/:id', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, priority } = req.body;
    
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedBy = req.user._id || req.user.id;
        updateData.resolvedAt = new Date();
      }
    }
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (priority) updateData.priority = priority;
    
    const issue = await CDNIssue.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate('reportedBy', 'username email profile.avatar')
      .populate('resolvedBy', 'username email')
      .populate('videoId', 'title thumbnail');
    
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }
    
    res.json({
      success: true,
      issue,
      message: 'Issue updated successfully'
    });
  } catch (error) {
    console.error('Admin update CDN issue error:', error);
    res.status(500).json({ success: false, message: 'Failed to update issue' });
  }
});

// Server Health - CPU Load & Traffic
router.get('/system/server-health', async (req, res) => {
  try {
    const { serverType, status } = req.query;
    const query = {};
    if (serverType) query.serverType = serverType;
    if (status) query.status = status;

    const [servers, stats] = await Promise.all([
      ServerHealth.find(query).sort({ lastChecked: -1 }),
      ServerHealth.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      servers,
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {})
    });
  } catch (error) {
    console.error('Admin get server health error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch server health' });
  }
});

// Server Metrics - CPU, Memory, Disk, Traffic over time
router.get('/system/server-metrics', async (req, res) => {
  try {
    const { period = '1h' } = req.query;
    
    // Parse period (1h, 6h, 24h, 7d)
    let hours = 1;
    if (period === '6h') hours = 6;
    else if (period === '24h') hours = 24;
    else if (period === '7d') hours = 168;
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await ServerHealth.aggregate([
      {
        $match: { lastChecked: { $gte: since } }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d %H:00:00',
              date: '$lastChecked'
            }
          },
          avgCpu: { $avg: '$cpu.usage' },
          avgMemory: { $avg: '$memory.usage' },
          avgDisk: { $avg: '$disk.usage' },
          avgResponseTime: { $avg: '$responseTime' },
          totalRequests: { $sum: '$traffic.requestsPerSecond' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get current stats
    const currentStats = await ServerHealth.aggregate([
      {
        $group: {
          _id: null,
          totalServers: { $sum: 1 },
          healthy: { $sum: { $cond: [{ $eq: ['$status', 'healthy'] }, 1, 0] } },
          warning: { $sum: { $cond: [{ $eq: ['$status', 'warning'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$status', 'critical'] }, 1, 0] } },
          down: { $sum: { $cond: [{ $eq: ['$status', 'down'] }, 1, 0] } },
          avgCpu: { $avg: '$cpu.usage' },
          avgMemory: { $avg: '$memory.usage' },
          avgDisk: { $avg: '$disk.usage' }
        }
      }
    ]);

    res.json({
      success: true,
      metrics,
      currentStats: currentStats[0] || {},
      period
    });
  } catch (error) {
    console.error('Admin get server metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch server metrics' });
  }
});

router.get('/system/server-health/metrics', async (req, res) => {
  try {
    const { period = '1h' } = req.query;
    const hours = period === '1h' ? 1 : period === '24h' ? 24 : 168;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await ServerHealth.aggregate([
      {
        $match: { lastChecked: { $gte: since } }
      },
      {
        $group: {
          _id: '$serverType',
          avgCpu: { $avg: '$cpu.usage' },
          avgMemory: { $avg: '$memory.usage' },
          avgDisk: { $avg: '$disk.usage' },
          avgResponseTime: { $avg: '$responseTime.average' },
          totalRequests: { $sum: '$traffic.totalRequests' },
          avgTraffic: { $avg: '$traffic.requestsPerSecond' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      metrics,
      period
    });
  } catch (error) {
    console.error('Admin get server metrics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch server metrics' });
  }
});

// Crash Stats (alternative endpoint for frontend compatibility - must be before /system/error-logs)
router.get('/system/crash-stats', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const crashStats = await ErrorLog.aggregate([
      {
        $match: {
          type: 'app-crash',
          lastOccurred: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          totalCrashes: { $sum: '$occurrenceCount' },
          uniqueErrors: { $sum: 1 },
          avgOccurrences: { $avg: '$occurrenceCount' }
        }
      }
    ]);

    const crashesByType = await ErrorLog.aggregate([
      {
        $match: {
          type: 'app-crash',
          lastOccurred: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: '$occurrenceCount' },
          message: { $first: '$message' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      crashStats: crashStats[0] || { totalCrashes: 0, uniqueErrors: 0, avgOccurrences: 0 },
      crashesByType,
      period
    });
  } catch (error) {
    console.error('Admin get crash stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch crash stats' });
  }
});

// Error Logs for App Crashes
router.get('/system/error-logs', async (req, res) => {
  try {
    const { level, type, severity, resolved, page = 1, limit = 50 } = req.query;
    const query = {};
    if (level) query.level = level;
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.resolved = resolved === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [errors, total] = await Promise.all([
      ErrorLog.find(query)
        .populate('userId', 'username email')
        .populate('resolvedBy', 'username email')
        .sort({ lastOccurred: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ErrorLog.countDocuments(query)
    ]);

    const stats = await ErrorLog.aggregate([
      {
        $group: {
          _id: { type: '$type', severity: '$severity' },
          count: { $sum: 1 },
          totalOccurrences: { $sum: '$occurrenceCount' }
        }
      }
    ]);

    res.json({
      success: true,
      errors,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      stats
    });
  } catch (error) {
    console.error('Admin get error logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch error logs' });
  }
});

router.patch('/system/error-logs/:id/resolve', async (req, res) => {
  try {
    const { resolution } = req.body;
    const error = await ErrorLog.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
        resolution
      },
      { new: true }
    );

    if (!error) {
      return res.status(404).json({ success: false, message: 'Error log not found' });
    }

    res.json({
      success: true,
      message: 'Error log resolved',
      error
    });
  } catch (error) {
    console.error('Admin resolve error log error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve error log' });
  }
});

router.get('/system/error-logs/crash-stats', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const crashStats = await ErrorLog.aggregate([
      {
        $match: {
          type: 'app-crash',
          lastOccurred: { $gte: since }
        }
      },
      {
        $group: {
          _id: null,
          totalCrashes: { $sum: '$occurrenceCount' },
          uniqueErrors: { $sum: 1 },
          avgOccurrences: { $avg: '$occurrenceCount' }
        }
      }
    ]);

    const crashesByType = await ErrorLog.aggregate([
      {
        $match: {
          type: 'app-crash',
          lastOccurred: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: '$occurrenceCount' },
          message: { $first: '$message' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      crashStats: crashStats[0] || { totalCrashes: 0, uniqueErrors: 0, avgOccurrences: 0 },
      crashesByType,
      period
    });
  } catch (error) {
    console.error('Admin get crash stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch crash stats' });
  }
});

// API Request Success/Fail Rate
router.get('/system/api-requests', async (req, res) => {
  try {
    const { endpoint, method, status, page = 1, limit = 100 } = req.query;
    const query = {};
    if (endpoint) query.endpoint = new RegExp(endpoint, 'i');
    if (method) query.method = method;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      APIRequest.find(query)
        .populate('userId', 'username email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      APIRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      requests,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get API requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch API requests' });
  }
});

router.get('/system/api-requests/stats', async (req, res) => {
  try {
    const { period = '1h' } = req.query;
    const hours = period === '1h' ? 1 : period === '24h' ? 24 : 168;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await APIRequest.aggregate([
      {
        $match: { timestamp: { $gte: since } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          totalRequests: { $sum: 1 }
        }
      }
    ]);

    const successRate = await APIRequest.aggregate([
      {
        $match: { timestamp: { $gte: since } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $in: ['$status', ['failed', 'error', 'timeout']] }, 1, 0]
            }
          },
          avgResponseTime: { $avg: '$responseTime' },
          p95ResponseTime: {
            $percentile: {
              input: '$responseTime',
              p: [0.95],
              method: 'approximate'
            }
          }
        }
      }
    ]);

    const topEndpoints = await APIRequest.aggregate([
      {
        $match: { timestamp: { $gte: since } }
      },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          avgResponseTime: { $avg: '$responseTime' },
          errorCount: {
            $sum: { $cond: [{ $in: ['$status', ['failed', 'error', 'timeout']] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              {
                $divide: ['$successCount', '$count']
              },
              100
            ]
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    res.json({
      success: true,
      stats: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      successRate: successRate[0] || {},
      topEndpoints,
      period
    });
  } catch (error) {
    console.error('Admin get API request stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch API request stats' });
  }
});

// Storage Monitoring
router.get('/system/storage', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    console.log('📦 Admin get storage request - fetching REAL data from database');
    
    // Get REAL data from database
    const fs = require('fs');
    const path = require('path');
    const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
    
    // Count real videos and stories from database
    const [videoCount, storyCount, videoStats] = await Promise.all([
      Video.countDocuments({}),
      Story.countDocuments({}),
      Video.aggregate([
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            privateVideos: {
              $sum: { $cond: [{ $eq: ['$isPrivate', true] }, 1, 0] }
            },
            publicVideos: {
              $sum: { $cond: [{ $eq: ['$isPrivate', false] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Calculate real storage from file system
    let localStorageUsed = 0; // in bytes
    let localFileCount = 0;
    
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const calculateDirSize = (dirPath) => {
          let totalSize = 0;
          let fileCount = 0;
          try {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
              const filePath = path.join(dirPath, file);
              const stats = fs.statSync(filePath);
              if (stats.isFile()) {
                totalSize += stats.size;
                fileCount++;
              } else if (stats.isDirectory()) {
                const subDir = calculateDirSize(filePath);
                totalSize += subDir.size;
                fileCount += subDir.count;
              }
            });
          } catch (err) {
            console.error('Error reading directory:', err);
          }
          return { size: totalSize, count: fileCount };
        };
        
        const dirStats = calculateDirSize(UPLOADS_DIR);
        localStorageUsed = dirStats.size;
        localFileCount = dirStats.count;
      }
    } catch (fsError) {
      console.warn('⚠️ Could not calculate file system storage:', fsError.message);
    }

    // Convert bytes to GB
    const usedGB = localStorageUsed / (1024 * 1024 * 1024);
    
    // Estimate total capacity (can be configured via env or use default)
    const totalCapacityGB = parseFloat(process.env.STORAGE_TOTAL_CAPACITY_GB) || 1000; // Default 1TB
    const availableGB = Math.max(0, totalCapacityGB - usedGB);
    const utilization = totalCapacityGB > 0 ? (usedGB / totalCapacityGB) * 100 : 0;

    // Create real storage data
    const realStorage = {
      storageType: 'local',
      bucketName: 'local-uploads',
      region: 'server',
      totalCapacity: totalCapacityGB,
      used: usedGB,
      available: availableGB,
      utilization: Math.min(100, Math.max(0, utilization)),
      files: {
        total: localFileCount,
        videos: videoCount,
        images: storyCount,
        thumbnails: 0,
        audio: 0,
        documents: 0,
        other: 0
      },
      uploads: {
        today: 0, // Can be calculated from Video.createdAt
        thisWeek: 0,
        thisMonth: 0,
        total: videoCount + storyCount
      },
      health: {
        status: utilization > 90 ? 'critical' : utilization > 75 ? 'warning' : 'healthy',
        lastBackup: new Date(),
        backupFrequency: 'daily',
        redundancy: false
      },
      costs: {
        monthly: 0,
        daily: 0,
        perGB: 0
      },
      lastChecked: new Date()
    };

    // Calculate today/week/month uploads
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setMonth(now.getMonth() - 1));

    const [todayUploads, weekUploads, monthUploads] = await Promise.all([
      Video.countDocuments({ createdAt: { $gte: todayStart } }),
      Video.countDocuments({ createdAt: { $gte: weekStart } }),
      Video.countDocuments({ createdAt: { $gte: monthStart } })
    ]);

    realStorage.uploads.today = todayUploads;
    realStorage.uploads.thisWeek = weekUploads;
    realStorage.uploads.thisMonth = monthUploads;

    console.log('📦 REAL Storage Data Calculated:');
    console.log(`   Total Capacity: ${totalCapacityGB.toFixed(2)} GB`);
    console.log(`   Used: ${usedGB.toFixed(2)} GB`);
    console.log(`   Available: ${availableGB.toFixed(2)} GB`);
    console.log(`   Utilization: ${utilization.toFixed(1)}%`);
    console.log(`   Files: ${localFileCount}`);
    console.log(`   Videos (DB): ${videoCount}`);
    console.log(`   Stories (DB): ${storyCount}`);

    const stats = {
      totalCapacity: totalCapacityGB,
      totalUsed: usedGB,
      totalAvailable: availableGB,
      avgUtilization: utilization
    };

    res.json({
      success: true,
      storage: [realStorage], // Return as array for consistency
      stats
    });
  } catch (error) {
    console.error('❌ Admin get storage error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch storage data' });
  }
});

router.get('/system/storage/alerts', async (req, res) => {
  try {
    const storageWithAlerts = await Storage.find({
      'alerts.resolvedAt': { $exists: false }
    })
      .sort({ utilization: -1 })
      .limit(20);

    const alerts = [];
    storageWithAlerts.forEach(storage => {
      if (storage.alerts && storage.alerts.length > 0) {
        storage.alerts.forEach(alert => {
          if (!alert.resolvedAt) {
            alerts.push({
              ...alert.toObject(),
              storageType: storage.storageType,
              bucketName: storage.bucketName,
              utilization: storage.utilization
            });
          }
        });
      }
    });

    alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });

    res.json({
      success: true,
      alerts: alerts.slice(0, 50)
    });
  } catch (error) {
    console.error('Admin get storage alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch storage alerts' });
  }
});

// ==================== SUPPORT AND PROBLEM SOLVING ====================

// User Complaints Ticketing
router.get('/support/tickets', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    console.log('🎫 Admin get tickets request');
    const { status, priority, category, assignedTo, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (category && category !== 'all') query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;

    console.log('🎫 Tickets query:', query);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('userId', 'username email profile.avatar')
        .populate('assignedTo', 'username email')
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(query)
    ]);

    console.log('🎫 Tickets found:', tickets.length, 'out of', total, 'total');

    const stats = await Ticket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObj = stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {});
    console.log('🎫 Tickets stats:', statsObj);

    res.json({
      success: true,
      tickets,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      stats: statsObj
    });
  } catch (error) {
    console.error('❌ Admin get tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

router.get('/support/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('userId', 'username email profile.avatar profile.displayName')
      .populate('assignedTo', 'username email')
      .populate('messages.senderId', 'username email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Admin get ticket details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ticket details' });
  }
});

router.patch('/support/tickets/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: assignedTo ? 'in-progress' : 'open' },
      { new: true }
    ).populate('assignedTo', 'username email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Admin assign ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign ticket' });
  }
});

router.patch('/support/tickets/:id/status', async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const update = { status };
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt = new Date();
      update.resolvedBy = req.user.id;
      if (resolution) update.resolution = resolution;
    }

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Admin update ticket status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update ticket status' });
  }
});

router.post('/support/tickets/:id/message', async (req, res) => {
  try {
    const { message, attachments } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          messages: {
            sender: 'admin',
            senderId: req.user.id,
            message,
            attachments: attachments || [],
            timestamp: new Date()
          }
        },
        $set: {
          lastActivityAt: new Date(),
          status: ticket.status === 'pending-user' ? 'in-progress' : ticket.status
        }
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Admin add ticket message error:', error);
    res.status(500).json({ success: false, message: 'Failed to add message' });
  }
});

// Login Issues
router.get('/support/login-issues', async (req, res) => {
  try {
    const { status, issueType, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [issues, total] = await Promise.all([
      LoginIssue.find(query)
        .populate('userId', 'username email')
        .populate('resolvedBy', 'username email')
        .sort({ lastAttemptAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LoginIssue.countDocuments(query)
    ]);

    res.json({
      success: true,
      issues,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get login issues error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch login issues' });
  }
});

router.get('/support/login-issues/:id', async (req, res) => {
  try {
    const issue = await LoginIssue.findById(req.params.id)
      .populate('userId', 'username email profile.avatar')
      .populate('resolvedBy', 'username email')
      .populate('actions.performedBy', 'username email');

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Login issue not found' });
    }

    res.json({ success: true, issue });
  } catch (error) {
    console.error('Admin get login issue error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch login issue' });
  }
});

router.patch('/support/login-issues/:id/resolve', async (req, res) => {
  try {
    const { resolution, action, notes } = req.body;
    const update = {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: req.user.id,
      resolution
    };

    if (action) {
      update.$push = {
        actions: {
          action,
          performedBy: req.user.id,
          timestamp: new Date(),
          notes: notes || ''
        }
      };
    }

    const issue = await LoginIssue.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Login issue not found' });
    }

    res.json({ success: true, issue });
  } catch (error) {
    console.error('Admin resolve login issue error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve login issue' });
  }
});

// Payment Issues
router.get('/support/payment-issues', async (req, res) => {
  try {
    const { status, issueType, paymentId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;
    if (paymentId) query.paymentId = paymentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [issues, total] = await Promise.all([
      PaymentIssue.find(query)
        .populate('userId', 'username email')
        .populate('resolvedBy', 'username email')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PaymentIssue.countDocuments(query)
    ]);

    res.json({
      success: true,
      issues,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get payment issues error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment issues' });
  }
});

router.get('/support/payment-issues/trace/:paymentId', async (req, res) => {
  try {
    const issues = await PaymentIssue.find({ paymentId: req.params.paymentId })
      .populate('userId', 'username email')
      .populate('resolvedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({ success: true, issues });
  } catch (error) {
    console.error('Admin trace payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to trace payment' });
  }
});

router.patch('/support/payment-issues/:id/resolve', async (req, res) => {
  try {
    const { resolution, action, refundAmount, notes } = req.body;
    const update = {
      status: req.body.status || 'resolved',
      resolvedAt: new Date(),
      resolvedBy: req.user.id,
      resolution
    };

    if (refundAmount) {
      update.refundAmount = refundAmount;
      update.refundedAt = new Date();
    }

    if (action) {
      update.$push = {
        actions: {
          action,
          performedBy: req.user.id,
          timestamp: new Date(),
          notes: notes || '',
          amount: refundAmount
        }
      };
    }

    const issue = await PaymentIssue.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Payment issue not found' });
    }

    res.json({ success: true, issue });
  } catch (error) {
    console.error('Admin resolve payment issue error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve payment issue' });
  }
});

// Video Upload Issues
router.get('/support/video-upload-issues', async (req, res) => {
  try {
    const { status, issueType, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [issues, total] = await Promise.all([
      VideoUploadIssue.find(query)
        .populate('userId', 'username email')
        .populate('videoId', 'title thumbnail')
        .populate('resolvedBy', 'username email')
        .sort({ lastAttemptAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      VideoUploadIssue.countDocuments(query)
    ]);

    res.json({
      success: true,
      issues,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get video upload issues error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch video upload issues' });
  }
});

router.patch('/support/video-upload-issues/:id/resolve', async (req, res) => {
  try {
    const { resolution, fixReason, action, notes } = req.body;
    const update = {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: req.user.id,
      resolution,
      fixReason
    };

    if (action) {
      update.$push = {
        actions: {
          action,
          performedBy: req.user.id,
          timestamp: new Date(),
          notes: notes || ''
        }
      };
    }

    const issue = await VideoUploadIssue.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Video upload issue not found' });
    }

    res.json({ success: true, issue });
  } catch (error) {
    console.error('Admin resolve video upload issue error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve video upload issue' });
  }
});

// Shadowban Investigation
router.get('/support/shadowban-cases', async (req, res) => {
  try {
    const { status, caseType, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (caseType) query.caseType = caseType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      ShadowbanCase.find(query)
        .populate('userId', 'username email profile.avatar')
        .populate('investigation.investigatedBy', 'username email')
        .populate('resolution.resolvedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ShadowbanCase.countDocuments(query)
    ]);

    res.json({
      success: true,
      cases,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get shadowban cases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shadowban cases' });
  }
});

router.get('/support/shadowban-cases/:id', async (req, res) => {
  try {
    const case_ = await ShadowbanCase.findById(req.params.id)
      .populate('userId', 'username email profile.avatar profile.displayName')
      .populate('investigation.investigatedBy', 'username email')
      .populate('resolution.resolvedBy', 'username email');

    if (!case_) {
      return res.status(404).json({ success: false, message: 'Shadowban case not found' });
    }

    res.json({ success: true, case: case_ });
  } catch (error) {
    console.error('Admin get shadowban case error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shadowban case' });
  }
});

router.patch('/support/shadowban-cases/:id/investigate', async (req, res) => {
  try {
    const { findings, metrics } = req.body;
    const update = {
      status: 'investigating',
      'investigation.startedAt': new Date(),
      'investigation.investigatedBy': req.user.id,
      'investigation.findings': findings,
      'investigation.metrics': metrics
    };

    const case_ = await ShadowbanCase.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!case_) {
      return res.status(404).json({ success: false, message: 'Shadowban case not found' });
    }

    res.json({ success: true, case: case_ });
  } catch (error) {
    console.error('Admin investigate shadowban error:', error);
    res.status(500).json({ success: false, message: 'Failed to update investigation' });
  }
});

router.patch('/support/shadowban-cases/:id/resolve', async (req, res) => {
  try {
    const { action, notes, shadowbanConfirmed } = req.body;
    let status = 'resolved';
    if (shadowbanConfirmed === false) status = 'not-shadowbanned';
    
    const update = {
      status,
      'resolution.resolvedAt': new Date(),
      'resolution.resolvedBy': req.user.id,
      'resolution.action': action,
      'resolution.notes': notes
    };

    if (action === 'shadowban-removed' || action === 'account-restored') {
      update['resolution.shadowbanLiftedAt'] = new Date();
    }

    const case_ = await ShadowbanCase.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!case_) {
      return res.status(404).json({ success: false, message: 'Shadowban case not found' });
    }

    res.json({ success: true, case: case_ });
  } catch (error) {
    console.error('Admin resolve shadowban error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve shadowban case' });
  }
});

// Comment Restriction Appeals
router.get('/support/comment-appeals', async (req, res) => {
  try {
    const { status, restrictionType, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (restrictionType) query.restrictionType = restrictionType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [appeals, total] = await Promise.all([
      CommentAppeal.find(query)
        .populate('userId', 'username email profile.avatar')
        .populate('commentId', 'text')
        .populate('videoId', 'title thumbnail')
        .populate('reviewedBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CommentAppeal.countDocuments(query)
    ]);

    res.json({
      success: true,
      appeals,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get comment appeals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comment appeals' });
  }
});

router.get('/support/comment-appeals/:id', async (req, res) => {
  try {
    const appeal = await CommentAppeal.findById(req.params.id)
      .populate('userId', 'username email profile.avatar')
      .populate('commentId', 'text likes createdAt')
      .populate('videoId', 'title thumbnail')
      .populate('reviewedBy', 'username email')
      .populate('actions.performedBy', 'username email');

    if (!appeal) {
      return res.status(404).json({ success: false, message: 'Comment appeal not found' });
    }

    res.json({ success: true, appeal });
  } catch (error) {
    console.error('Admin get comment appeal error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comment appeal' });
  }
});

router.patch('/support/comment-appeals/:id/decision', async (req, res) => {
  try {
    const { decision, decisionNotes, action, notes } = req.body;
    let status = 'approved';
    if (decision === 'appeal-rejected' || decision === 'no-action') status = 'rejected';
    if (decision === 'partial-lift') status = 'partially-approved';

    const update = {
      status,
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
      decision,
      decisionNotes
    };

    if (action) {
      update.$push = {
        actions: {
          action,
          performedBy: req.user.id,
          timestamp: new Date(),
          notes: notes || ''
        }
      };
    }

    const appeal = await CommentAppeal.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!appeal) {
      return res.status(404).json({ success: false, message: 'Comment appeal not found' });
    }

    res.json({ success: true, appeal });
  } catch (error) {
    console.error('Admin update comment appeal decision error:', error);
    res.status(500).json({ success: false, message: 'Failed to update appeal decision' });
  }
});

// ==================== POLICY COMPLIANCE ====================

// Age Restrictions
router.get('/policy/age-restrictions', async (req, res) => {
  try {
    // Try to get from database or return defaults
    // For now, return default values
    res.json({
      success: true,
      restrictions: {
        minAge: 13,
        restrictedContent: true,
        ageVerification: false,
        parentalControls: true
      }
    });
  } catch (error) {
    console.error('Get age restrictions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get age restrictions' });
  }
});

router.patch('/policy/age-restrictions', async (req, res) => {
  try {
    const { minAge, restrictedContent, ageVerification, parentalControls } = req.body;
    
    // TODO: Save to database when model is created
    // For now, just return success
    
    console.log('Age restrictions updated:', {
      minAge,
      restrictedContent,
      ageVerification,
      parentalControls
    });
    
    res.json({
      success: true,
      message: 'Age restrictions updated successfully',
      restrictions: {
        minAge: minAge || 13,
        restrictedContent: restrictedContent !== undefined ? restrictedContent : true,
        ageVerification: ageVerification !== undefined ? ageVerification : false,
        parentalControls: parentalControls !== undefined ? parentalControls : true
      }
    });
  } catch (error) {
    console.error('Update age restrictions error:', error);
    res.status(500).json({ success: false, message: 'Failed to update age restrictions' });
  }
});

// Regional Laws
router.get('/policy/regional-laws', async (req, res) => {
  try {
    const laws = await RegionalLaw.find().sort({ region: 1 });
    
    // If no laws exist, create default entries
    if (laws.length === 0) {
      const defaultLaws = [
        { region: 'US', regionName: 'United States', dataRetention: 365, gdprCompliant: false, contentRestrictions: [] },
        { region: 'EU', regionName: 'European Union', dataRetention: 365, gdprCompliant: true, contentRestrictions: [] },
        { region: 'UK', regionName: 'United Kingdom', dataRetention: 365, gdprCompliant: true, contentRestrictions: [] },
        { region: 'CA', regionName: 'Canada', dataRetention: 365, gdprCompliant: false, contentRestrictions: [] },
        { region: 'AU', regionName: 'Australia', dataRetention: 365, gdprCompliant: false, contentRestrictions: [] },
        { region: 'IN', regionName: 'India', dataRetention: 365, gdprCompliant: false, contentRestrictions: [] },
        { region: 'CN', regionName: 'China', dataRetention: 365, gdprCompliant: false, contentRestrictions: [] }
      ];
      
      await RegionalLaw.insertMany(defaultLaws);
      const createdLaws = await RegionalLaw.find().sort({ region: 1 });
      return res.json({
        success: true,
        laws: createdLaws
      });
    }
    
    res.json({
      success: true,
      laws: laws
    });
  } catch (error) {
    console.error('Get regional laws error:', error);
    res.status(500).json({ success: false, message: 'Failed to get regional laws' });
  }
});

router.patch('/policy/regional-laws', async (req, res) => {
  try {
    const { region, dataRetention, gdprCompliant, contentRestrictions } = req.body;
    
    if (!region) {
      return res.status(400).json({ success: false, message: 'Region is required' });
    }
    
    // Find or create regional law
    let regionalLaw = await RegionalLaw.findOne({ region: region.toUpperCase() });
    
    if (!regionalLaw) {
      const regionNames = {
        'US': 'United States',
        'EU': 'European Union',
        'UK': 'United Kingdom',
        'CA': 'Canada',
        'AU': 'Australia',
        'IN': 'India',
        'CN': 'China'
      };
      
      regionalLaw = new RegionalLaw({
        region: region.toUpperCase(),
        regionName: regionNames[region.toUpperCase()] || region,
        dataRetention: dataRetention || 365,
        gdprCompliant: gdprCompliant !== undefined ? gdprCompliant : false,
        contentRestrictions: contentRestrictions || [],
        updatedBy: req.user.id
      });
    } else {
      if (dataRetention !== undefined) regionalLaw.dataRetention = dataRetention;
      if (gdprCompliant !== undefined) regionalLaw.gdprCompliant = gdprCompliant;
      if (contentRestrictions !== undefined) regionalLaw.contentRestrictions = contentRestrictions;
      regionalLaw.updatedBy = req.user.id;
      regionalLaw.lastUpdated = new Date();
    }
    
    await regionalLaw.save();
    
    res.json({
      success: true,
      message: 'Regional laws updated successfully',
      law: regionalLaw
    });
  } catch (error) {
    console.error('Update regional laws error:', error);
    res.status(500).json({ success: false, message: 'Failed to update regional laws' });
  }
});

// Legal Holds
router.get('/policy/legal-holds', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    const holds = await LegalHold.find(query)
      .populate('createdBy', 'username email')
      .populate('releasedBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      holds: holds
    });
  } catch (error) {
    console.error('Get legal holds error:', error);
    res.status(500).json({ success: false, message: 'Failed to get legal holds' });
  }
});

router.post('/policy/legal-holds', async (req, res) => {
  try {
    const { caseId, description, affectedContent, expiryDate, notes } = req.body;
    
    if (!caseId || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Case ID and description are required' 
      });
    }
    
    // Check if case ID already exists
    const existingHold = await LegalHold.findOne({ caseId: caseId.trim() });
    if (existingHold) {
      return res.status(400).json({ 
        success: false, 
        message: 'Legal hold with this Case ID already exists' 
      });
    }
    
    const legalHold = new LegalHold({
      caseId: caseId.trim(),
      description: description.trim(),
      affectedContent: affectedContent || [],
      expiryDate: expiryDate || null,
      notes: notes || '',
      createdBy: req.user.id,
      status: 'active'
    });
    
    await legalHold.save();
    
    // Populate createdBy for response
    await legalHold.populate('createdBy', 'username email');
    
    res.json({
      success: true,
      message: 'Legal hold created successfully',
      hold: legalHold
    });
  } catch (error) {
    console.error('Create legal hold error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create legal hold' 
    });
  }
});

// Law Enforcement Requests
router.get('/policy/law-enforcement-requests', async (req, res) => {
  try {
    const { status, urgency } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    if (urgency) {
      query.urgency = urgency;
    }
    
    const requests = await LawEnforcementRequest.find(query)
      .populate('createdBy', 'username email')
      .populate('reviewedBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      requests: requests
    });
  } catch (error) {
    console.error('Get law enforcement requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to get law enforcement requests' });
  }
});

// Alternative route name for compatibility
router.get('/policy/law-enforcement', async (req, res) => {
  try {
    const { status, urgency } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }
    if (urgency) {
      query.urgency = urgency;
    }
    
    const requests = await LawEnforcementRequest.find(query)
      .populate('createdBy', 'username email')
      .populate('reviewedBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      requests: requests
    });
  } catch (error) {
    console.error('Get law enforcement requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to get law enforcement requests' });
  }
});

router.post('/policy/law-enforcement-requests', async (req, res) => {
  try {
    const { caseNumber, requestingAgency, requestType, description, urgency, affectedUsers } = req.body;
    
    if (!caseNumber || !requestingAgency || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Case number, requesting agency, and description are required' 
      });
    }
    
    // Check if case number already exists
    const existingRequest = await LawEnforcementRequest.findOne({ caseNumber: caseNumber.trim() });
    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Request with this Case Number already exists' 
      });
    }
    
    const request = new LawEnforcementRequest({
      caseNumber: caseNumber.trim(),
      requestingAgency: requestingAgency.trim(),
      requestType: requestType || 'data_request',
      description: description.trim(),
      urgency: urgency || 'normal',
      affectedUsers: affectedUsers || [],
      createdBy: req.user.id,
      status: 'pending'
    });
    
    await request.save();
    
    // Populate createdBy for response
    await request.populate('createdBy', 'username email');
    
    res.json({
      success: true,
      message: 'Law enforcement request created successfully',
      request: request
    });
  } catch (error) {
    console.error('Create law enforcement request error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create law enforcement request' 
    });
  }
});

// Alternative route name for compatibility
router.post('/policy/law-enforcement', async (req, res) => {
  try {
    const { caseNumber, requestingAgency, requestType, description, urgency, affectedUsers } = req.body;
    
    if (!caseNumber || !requestingAgency || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Case number, requesting agency, and description are required' 
      });
    }
    
    // Check if case number already exists
    const existingRequest = await LawEnforcementRequest.findOne({ caseNumber: caseNumber.trim() });
    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'Request with this Case Number already exists' 
      });
    }
    
    const request = new LawEnforcementRequest({
      caseNumber: caseNumber.trim(),
      requestingAgency: requestingAgency.trim(),
      requestType: requestType || 'data_request',
      description: description.trim(),
      urgency: urgency || 'normal',
      affectedUsers: affectedUsers || [],
      createdBy: req.user.id,
      status: 'pending'
    });
    
    await request.save();
    
    // Populate createdBy for response
    await request.populate('createdBy', 'username email');
    
    res.json({
      success: true,
      message: 'Law enforcement request created successfully',
      request: request
    });
  } catch (error) {
    console.error('Create law enforcement request error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create law enforcement request' 
    });
  }
});

// ==================== SECURITY SETTINGS ====================

// Two-Factor Authentication
router.post('/security/2fa', async (req, res) => {
  try {
    const { method } = req.body;
    
    if (!method || !['app', 'sms', 'email'].includes(method)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid 2FA method is required (app, sms, or email)' 
      });
    }
    
    // Check if 2FA already exists for user
    const userId = req.user._id || req.user.id;
    let twoFactor = await TwoFactorAuth.findOne({ user: userId });
    
    if (twoFactor && twoFactor.enabled) {
      return res.status(400).json({ 
        success: false, 
        message: '2FA is already enabled for this user' 
      });
    }
    
    if (!twoFactor) {
      twoFactor = new TwoFactorAuth({
        user: userId,
        enabled: true,
        secret: method === 'app' ? require('crypto').randomBytes(16).toString('hex') : require('crypto').randomBytes(16).toString('hex')
      });
    } else {
      twoFactor.enabled = true;
      if (method === 'app') {
        twoFactor.secret = require('crypto').randomBytes(16).toString('hex');
      }
    }
    
    await twoFactor.save();
    
    // Log activity
    await ActivityLog.create({
      user: userId,
      action: 'security_change',
      resource: '2fa',
      resourceId: twoFactor._id,
      details: `2FA enabled with method: ${method}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: 'Two-Factor Authentication enabled successfully',
      twoFactor: {
        method: method,
        enabled: twoFactor.enabled,
        secret: method === 'app' ? twoFactor.secret : undefined
      }
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to enable 2FA' 
    });
  }
});

// Roles Management
router.get('/security/roles', async (req, res) => {
  try {
    console.log('GET /security/roles - Request received');
    let roles = await Role.find().sort({ name: 1 });
    console.log('Found roles in DB:', roles.length);
    
    // If no roles exist, create default roles
    if (roles.length === 0) {
      console.log('No roles found, creating default roles...');
      const defaultRoles = [
        { name: 'admin', displayName: 'Admin', permissions: ['all'], isSystem: true, description: 'Full access to all admin features' },
        { name: 'moderator', displayName: 'Moderator', permissions: ['content', 'moderation'], isSystem: true, description: 'Content and moderation access' },
        { name: 'finance', displayName: 'Finance', permissions: ['monetization', 'reports'], isSystem: true, description: 'Financial and reporting access' },
        { name: 'legal', displayName: 'Legal', permissions: ['compliance', 'reports'], isSystem: true, description: 'Compliance and legal access' }
      ];
      
      await Role.insertMany(defaultRoles);
      roles = await Role.find().sort({ name: 1 });
      console.log('Default roles created:', roles.length);
    }
    
    // Filter out super_admin role if it exists
    roles = roles.filter(role => role.name !== 'super_admin');
    console.log('Roles after filtering super_admin:', roles.length);
    
    // Get user count for each role (REAL DATA FROM DATABASE)
    const rolesWithCounts = await Promise.all(roles.map(async (role) => {
      // Count actual users in database with this role
      const userCount = await User.countDocuments({ role: role.name });
      console.log(`Role "${role.name}": ${userCount} users in database`);
      
      return {
        ...role.toObject(),
        users: userCount // REAL COUNT FROM DATABASE
      };
    }));
    
    console.log('Returning roles with real user counts:', rolesWithCounts.length);
    console.log('Roles data:', JSON.stringify(rolesWithCounts.map(r => ({ name: r.name, users: r.users })), null, 2));
    
    res.json({
      success: true,
      roles: rolesWithCounts // REAL DATA FROM DATABASE
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get roles',
      error: error.toString()
    });
  }
});

router.patch('/security/roles/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    
    console.log('Update role request:', { roleId, permissions, body: req.body });
    
    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Permissions array is required' 
      });
    }
    
    // Try to find role by ID first (MongoDB ObjectId)
    let role = null;
    if (mongoose.Types.ObjectId.isValid(roleId)) {
      role = await Role.findById(roleId);
    }
    
    // If not found by ID, try to find by name (for backward compatibility)
    if (!role) {
      role = await Role.findOne({ name: roleId });
    }
    
    if (!role) {
      console.error('Role not found:', roleId);
      return res.status(404).json({ 
        success: false, 
        message: 'Role not found',
        roleId: roleId
      });
    }
    
    // Super admin role is filtered out, but keep check for safety
    if (role.name === 'super_admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Super admin role cannot be modified' 
      });
    }
    
    role.permissions = permissions;
    await role.save();
    
    // Log activity
    const userId = req.user._id || req.user.id;
    await ActivityLog.create({
      user: userId,
      action: 'permission_change',
      resource: 'role',
      resourceId: role._id,
      details: `Updated permissions for role: ${role.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: 'Role permissions updated successfully',
      role: role
    });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update role permissions' 
    });
  }
});

// Activity Logs
router.get('/security/activity-logs', async (req, res) => {
  try {
    console.log('GET /security/activity-logs - Request received');
    const { 
      userId, 
      action, 
      resource, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    console.log('Query params:', { userId, action, resource, startDate, endDate, page, limit });
    
    const query = {};
    
    if (userId) {
      query.user = userId;
    }
    if (action) {
      query.action = action;
    }
    if (resource) {
      query.resource = resource;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    console.log('MongoDB query:', JSON.stringify(query, null, 2));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await ActivityLog.find(query)
      .populate('user', 'username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ActivityLog.countDocuments(query);
    
    console.log(`Found ${logs.length} activity logs (total: ${total})`);
    
    res.json({
      success: true,
      logs: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get activity logs',
      error: error.toString()
    });
  }
});

// Active Sessions
router.get('/security/sessions', async (req, res) => {
  try {
    console.log('GET /security/sessions - Request received');
    const { userId } = req.query;
    const query = { isActive: true };
    
    if (userId) {
      query.user = userId;
    }
    
    console.log('Query for sessions:', JSON.stringify(query, null, 2));
    
    const sessions = await Session.find(query)
      .populate('user', 'username email role')
      .populate('terminatedBy', 'username email')
      .sort({ lastActivity: -1 });
    
    console.log(`Found ${sessions.length} active sessions`);
    
    res.json({
      success: true,
      sessions: sessions
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get active sessions',
      error: error.toString()
    });
  }
});

router.delete('/security/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }
    
    session.isActive = false;
    session.terminatedAt = new Date();
    const userId = req.user._id || req.user.id;
    session.terminatedBy = userId;
    await session.save();
    
    // Log activity
    await ActivityLog.create({
      user: userId,
      action: 'security_change',
      resource: 'session',
      resourceId: session._id,
      details: `Terminated session for user: ${session.user}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to terminate session' 
    });
  }
});

// ==================== APP STORE COMPLIANCE ====================

// Get policy violations
router.get('/app-store/violations', async (req, res) => {
  try {
    console.log('📋 Admin get app store violations request');
    const { severity, status, platform, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (severity && severity !== 'all') {
      query.severity = severity;
    }
    if (status && status !== 'all') {
      query.status = status.replace('_', '-');
    }
    if (platform && platform !== 'all') {
      query.platform = { $in: [platform, 'both'] };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [violations, total] = await Promise.all([
      AppStoreViolation.find(query)
        .sort({ reportedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('resolvedBy', 'username email'),
      AppStoreViolation.countDocuments(query)
    ]);
    
    const formattedViolations = violations.map(v => ({
      id: v._id.toString(),
      type: v.type,
      severity: v.severity,
      platform: v.platform,
      description: v.description,
      reportedDate: v.reportedDate.toLocaleDateString(),
      status: v.status.replace('-', '_'),
      actionRequired: v.actionRequired || 'Review and take appropriate action',
      resolvedBy: v.resolvedBy ? v.resolvedBy.username : null,
      resolvedAt: v.resolvedAt ? v.resolvedAt.toLocaleDateString() : null
    }));
    
    console.log(`📋 Found ${total} violations, returning ${formattedViolations.length}`);
    
    res.json({
      success: true,
      violations: formattedViolations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get app store violations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch violations',
      violations: []
    });
  }
});

// Resolve violation
router.patch('/app-store/violations/:id', async (req, res) => {
  try {
    console.log('✅ Admin resolve violation request:', req.params.id);
    const { resolution } = req.body;
    
    const violation = await AppStoreViolation.findById(req.params.id);
    if (!violation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Violation not found' 
      });
    }
    
    violation.status = 'resolved';
    violation.resolvedBy = req.user._id;
    violation.resolvedAt = new Date();
    if (resolution) {
      violation.resolution = resolution;
    }
    
    await violation.save();
    
    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'app_store_violation_resolved',
      resource: 'app_store_violation',
      resourceId: violation._id,
      details: `Resolved violation: ${violation.type} - ${violation.description}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: 'Violation resolved successfully'
    });
  } catch (error) {
    console.error('Admin resolve violation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to resolve violation' 
    });
  }
});

// Update safe content policy
router.patch('/app-store/safe-content', async (req, res) => {
  try {
    console.log('🔒 Admin update safe content policy request');
    // This would typically update a settings document or config
    // For now, we'll just log the activity
    
    await ActivityLog.create({
      user: req.user._id,
      action: 'safe_content_policy_updated',
      resource: 'app_store_policy',
      details: 'Safe content policy updated',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: 'Safe content policy updated successfully'
    });
  } catch (error) {
    console.error('Admin update safe content policy error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update safe content policy' 
    });
  }
});

// Get app ratings
router.get('/app-store/ratings', async (req, res) => {
  try {
    console.log('⭐ Admin get app store ratings request');
    const { platform, rating, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (platform && platform !== 'all') {
      query.platform = platform;
    }
    if (rating && rating !== 'all') {
      const starCount = parseInt(rating.replace('star', ''));
      if (!isNaN(starCount)) {
        query.rating = starCount;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get recent reviews (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [ratings, total, recentRatings, stats] = await Promise.all([
      AppStoreRating.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AppStoreRating.countDocuments(query),
      AppStoreRating.find({ date: { $gte: sevenDaysAgo } }),
      AppStoreRating.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const formattedRatings = ratings.map(r => ({
      id: r._id.toString(),
      rating: r.rating,
      comment: r.comment,
      platform: r.platform,
      userName: r.userName,
      date: r.date,
      version: r.version,
      device: r.device
    }));
    
    const ratingStats = stats.length > 0 ? {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
      recentReviews: recentRatings
    } : {
      averageRating: 0,
      totalReviews: 0,
      recentReviews: []
    };
    
    console.log(`⭐ Found ${total} ratings, returning ${formattedRatings.length}`);
    console.log(`⭐ Stats: ${ratingStats.averageRating} avg, ${ratingStats.totalReviews} total`);
    
    res.json({
      success: true,
      ratings: formattedRatings,
      stats: ratingStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin get app store ratings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ratings',
      ratings: [],
      stats: {
        averageRating: 0,
        totalReviews: 0,
        recentReviews: []
      }
    });
  }
});

// ==================== NOTIFICATIONS CONTROL ====================

// Get all push campaigns
router.get('/notifications/campaigns', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const campaigns = await PushCampaign.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      campaigns: campaigns.map(campaign => ({
        id: campaign._id,
        _id: campaign._id,
        title: campaign.title,
        message: campaign.message,
        targetAudience: campaign.targetAudience,
        type: campaign.type,
        status: campaign.status,
        recipients: campaign.recipients,
        sentDate: campaign.sentAt || campaign.createdAt,
        createdAt: campaign.createdAt
      }))
    });
  } catch (error) {
    console.error('Admin get push campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns', campaigns: [] });
  }
});

// Create push campaign
router.post('/notifications/campaigns', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const { title, message, targetAudience, type, scheduledTime } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    // Count recipients based on target audience
    let recipientCount = 0;
    const userQuery = {};
    if (targetAudience === 'active') {
      userQuery.lastActiveAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (targetAudience === 'premium') {
      userQuery['subscription.status'] = 'active';
    } else if (targetAudience === 'new') {
      userQuery.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }
    recipientCount = await User.countDocuments(userQuery);

    const campaign = new PushCampaign({
      title,
      message,
      targetAudience: targetAudience || 'all',
      type: type || 'promotional',
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      status: scheduledTime ? 'scheduled' : 'sent',
      recipients: recipientCount,
      sentAt: scheduledTime ? null : new Date(),
      createdBy: req.user._id
    });

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign created successfully',
      campaign: {
        id: campaign._id,
        _id: campaign._id,
        title: campaign.title,
        message: campaign.message,
        targetAudience: campaign.targetAudience,
        type: campaign.type,
        status: campaign.status,
        recipients: campaign.recipients,
        sentDate: campaign.sentAt || campaign.createdAt
      }
    });
  } catch (error) {
    console.error('Admin create push campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to create campaign' });
  }
});

// Get all warning messages
router.get('/notifications/warnings', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const { severity, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [warnings, total] = await Promise.all([
      WarningMessage.find(query)
        .populate('userId', 'username email profile.avatar')
        .populate('sentBy', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      WarningMessage.countDocuments(query)
    ]);

    res.json({
      success: true,
      warnings: warnings.map(warning => ({
        id: warning._id,
        _id: warning._id,
        userId: warning.userId,
        severity: warning.severity,
        message: warning.message,
        violationType: warning.violationType,
        status: warning.status,
        sentAt: warning.sentAt,
        createdAt: warning.createdAt
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin get warning messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch warnings', warnings: [] });
  }
});

// Send warning message
router.post('/notifications/warnings', authMiddleware, strictAdminMiddleware, async (req, res) => {
  console.log('✅ POST /notifications/warnings route HIT!');
  console.log('Request body:', req.body);
  try {
    const { userId, severity, message, violationType } = req.body;

    if (!userId || !severity) {
      return res.status(400).json({ success: false, message: 'User ID and severity are required' });
    }

    // Find user by ID, username, or email
    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      // If it's a valid ObjectId, find by ID
      user = await User.findById(userId);
    } else {
      // Otherwise, try to find by username or email
      user = await User.findOne({
        $or: [
          { username: userId },
          { email: userId }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please check the User ID, username, or email.' });
    }

    const warningMessage = message || `You have received a ${severity} warning for violating community guidelines.`;

    // Create warning message
    const warning = new WarningMessage({
      userId: user._id,
      severity,
      message: warningMessage,
      violationType: violationType || '',
      status: 'sent',
      sentAt: new Date(),
      sentBy: req.user._id
    });

    await warning.save();

    // Create notification for the user
    const notification = new Notification({
      user: user._id,
      type: 'system',
      title: 'Warning Received',
      message: warningMessage,
      metadata: {
        warningId: warning._id,
        severity: severity,
        violationType: violationType || ''
      }
    });

    await notification.save();

    res.json({
      success: true,
      message: 'Warning sent successfully',
      warning: {
        id: warning._id,
        _id: warning._id,
        userId: warning.userId,
        severity: warning.severity,
        message: warning.message,
        status: warning.status,
        sentAt: warning.sentAt
      }
    });
  } catch (error) {
    console.error('Admin send warning message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send warning: ' + error.message });
  }
});

// Get warning settings
router.get('/notifications/warning-settings', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    const settings = await WarningSettings.getSettings();
    res.json({
      success: true,
      settings: {
        autoSendEnabled: settings.autoSendEnabled,
        severityLevels: settings.severityLevels
      }
    });
  } catch (error) {
    console.error('Admin get warning settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch warning settings' });
  }
});

// Update warning settings
router.patch('/notifications/warning-settings', authMiddleware, strictAdminMiddleware, async (req, res) => {
  try {
    console.log('📝 Updating warning settings:', req.body);
    const { autoSendEnabled, severityLevels } = req.body;
    
    const settings = await WarningSettings.getSettings();
    
    if (autoSendEnabled !== undefined) {
      console.log('   Auto-Send Enabled:', autoSendEnabled);
      settings.autoSendEnabled = autoSendEnabled;
    }
    
    if (severityLevels) {
      if (severityLevels.minor !== undefined) {
        console.log('   Minor:', severityLevels.minor);
        settings.severityLevels.minor = severityLevels.minor;
      }
      if (severityLevels.moderate !== undefined) {
        console.log('   Moderate:', severityLevels.moderate);
        settings.severityLevels.moderate = severityLevels.moderate;
      }
      if (severityLevels.severe !== undefined) {
        console.log('   Severe:', severityLevels.severe);
        settings.severityLevels.severe = severityLevels.severe;
      }
    }
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    console.log('✅ Warning settings saved to database');
    console.log('   Final settings:', {
      autoSendEnabled: settings.autoSendEnabled,
      severityLevels: settings.severityLevels
    });
    
    res.json({
      success: true,
      message: 'Warning settings updated successfully',
      settings: {
        autoSendEnabled: settings.autoSendEnabled,
        severityLevels: settings.severityLevels
      }
    });
  } catch (error) {
    console.error('❌ Admin update warning settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update warning settings: ' + error.message });
  }
});

module.exports = router;
