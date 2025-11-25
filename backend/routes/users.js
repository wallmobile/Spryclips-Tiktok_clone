const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Video = require('../models/Video');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('videos')
      .populate('followedUsers', 'username profile')
      .populate('followers', 'username profile')
      .populate('profile.pinnedVideo');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { displayName, bio, avatar, website } = req.body;
    console.log('Profile update request:', { 
      userId: req.user._id, 
      displayName, 
      bio: bio?.substring(0, 50),
      avatar: avatar ? `${(avatar.length / 1024).toFixed(2)}KB base64` : 'none',
      website 
    });
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (displayName !== undefined) user.profile.displayName = displayName;
    if (bio !== undefined) user.profile.bio = bio;
    if (avatar !== undefined) user.profile.avatar = avatar;
    if (website !== undefined) user.profile.website = website;

    await user.save();
    console.log('Profile updated successfully:', user.profile);
    res.json({ message: 'Profile updated', profile: user.profile });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
});

// Update privacy settings
router.put('/privacy', authMiddleware, async (req, res) => {
  try {
    const { accountType, showActivityStatus, allowDirectMessages } = req.body;
    const user = await User.findById(req.user._id);

    if (accountType) user.privacy.accountType = accountType;
    if (showActivityStatus !== undefined) user.privacy.showActivityStatus = showActivityStatus;
    if (allowDirectMessages) user.privacy.allowDirectMessages = allowDirectMessages;

    await user.save();
    res.json({ message: 'Privacy settings updated', privacy: user.privacy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update app settings
router.put('/app-settings', authMiddleware, async (req, res) => {
  try {
    const { appSettings, preferredLanguage, preferredRegion } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (appSettings) {
      user.appSettings = appSettings;
    }

    if (preferredLanguage) {
      user.preferredLanguage = preferredLanguage;
    }

    if (preferredRegion) {
      user.preferredRegion = preferredRegion;
    }

    await user.save();
    res.json({ 
      message: 'App settings updated', 
      appSettings: user.appSettings,
      preferredLanguage: user.preferredLanguage,
      preferredRegion: user.preferredRegion
    });
  } catch (error) {
    console.error('Error updating app settings:', error);
    res.status(500).json({ message: error.message || 'Failed to update app settings' });
  }
});

// Change password
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.authProvider !== 'local') {
      return res.status(400).json({ message: 'Password change not available for social login accounts' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
});

// Change email
router.put('/change-email', authMiddleware, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    if (user.authProvider === 'local') {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Password is incorrect' });
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Update email (will require verification)
    user.email = newEmail.toLowerCase();
    user.emailVerified = false;
    await user.save();

    // In production, send verification email here
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({ message: error.message || 'Failed to change email' });
  }
});

// Change phone
router.put('/change-phone', authMiddleware, async (req, res) => {
  try {
    const { newPhone, verificationCode } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // In production, verify the code here
    // For now, just update the phone
    user.phone = newPhone;
    await user.save();

    res.json({ message: 'Phone number updated successfully' });
  } catch (error) {
    console.error('Error changing phone:', error);
    res.status(500).json({ message: error.message || 'Failed to change phone number' });
  }
});

// Send phone verification code
router.post('/send-phone-verification', authMiddleware, async (req, res) => {
  try {
    const { phone } = req.body;
    // In production, send SMS verification code here
    res.json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Error sending phone verification:', error);
    res.status(500).json({ message: error.message || 'Failed to send verification code' });
  }
});

// Request account verification
router.post('/request-verification', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // In production, send verification email here
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({ message: error.message || 'Failed to request verification' });
  }
});

// Request data download
router.post('/request-data-download', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // In production, queue data export job here
    res.json({ message: 'Data download request submitted. You will receive an email within 24 hours.' });
  } catch (error) {
    console.error('Error requesting data download:', error);
    res.status(500).json({ message: error.message || 'Failed to request data download' });
  }
});

// Deactivate account
router.post('/deactivate', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.accountStatus = 'suspended';
    await user.save();
    res.json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({ message: error.message || 'Failed to deactivate account' });
  }
});

// Unlink social account
router.post('/unlink-account', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // In production, unlink the social account here
    res.json({ message: `${platform} account unlinked successfully` });
  } catch (error) {
    console.error('Error unlinking account:', error);
    res.status(500).json({ message: error.message || 'Failed to unlink account' });
  }
});

// Update notification settings
router.put('/notifications', authMiddleware, async (req, res) => {
  try {
    const { notificationSettings, notificationFrequency, quietHours } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (notificationSettings) {
      user.notificationSettings = notificationSettings;
    }

    if (notificationFrequency) {
      user.notificationFrequency = notificationFrequency;
    }

    if (quietHours) {
      user.quietHours = {
        enabled: quietHours.enabled !== undefined ? quietHours.enabled : user.quietHours?.enabled || false,
        from: quietHours.from || user.quietHours?.from || '22:00',
        to: quietHours.to || user.quietHours?.to || '08:00'
      };
    }

    await user.save();
    res.json({ 
      message: 'Notification settings updated', 
      notificationSettings: user.notificationSettings || {},
      notificationFrequency: user.notificationFrequency,
      quietHours: user.quietHours
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: error.message || 'Failed to update notification settings' });
  }
});

// Follow/Unfollow user
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Check if user is blocked
    if (currentUser.blockedUsers.includes(userId) || targetUser.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ message: 'Cannot follow this user' });
    }

    // If target user is private, create follow request
    if (targetUser.privacy.accountType === 'private') {
      const existingRequest = targetUser.followRequests.find(
        followReq => followReq.user.toString() === req.user._id.toString() && followReq.status === 'pending'
      );

      if (!existingRequest) {
        targetUser.followRequests.push({
          user: req.user._id,
          status: 'pending'
        });
        await targetUser.save();
        return res.json({ isFollowing: false, isPending: true, message: 'Follow request sent' });
      } else {
        return res.json({ isFollowing: false, isPending: true, message: 'Follow request already pending' });
      }
    }

    const isFollowing = currentUser.followedUsers.includes(userId);

    if (isFollowing) {
      // Unfollow
      currentUser.followedUsers = currentUser.followedUsers.filter(id => id.toString() !== userId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user._id.toString());
      targetUser.profile.followers--;
      currentUser.profile.following--;
    } else {
      // Follow
      currentUser.followedUsers.push(userId);
      targetUser.followers.push(req.user._id);
      targetUser.profile.followers++;
      currentUser.profile.following++;
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ isFollowing: !isFollowing, isPending: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Block/Unblock user
router.post('/:id/block', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const isBlocked = currentUser.blockedUsers.includes(userId);

    if (isBlocked) {
      // Unblock
      currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userId);
    } else {
      // Block
      currentUser.blockedUsers.push(userId);
      // Remove from followers/following if exists
      currentUser.followedUsers = currentUser.followedUsers.filter(id => id.toString() !== userId);
      currentUser.followers = currentUser.followers.filter(id => id.toString() !== userId);
      targetUser.followedUsers = targetUser.followedUsers.filter(id => id.toString() !== req.user._id.toString());
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== req.user._id.toString());
      await targetUser.save();
    }

    await currentUser.save();

    res.json({ isBlocked: !isBlocked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get blocked users
router.get('/blocked/list', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('blockedUsers', 'username profile');
    
    res.json({ blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pin/Unpin video
router.post('/pin-video/:videoId', authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.videoId;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }
    const user = await User.findById(req.user._id);
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to pin this video' });
    }

    if (user.profile.pinnedVideo && user.profile.pinnedVideo.toString() === videoId) {
      // Unpin
      user.profile.pinnedVideo = null;
      video.isPinned = false;
    } else {
      // Pin new video (unpin previous if any)
      if (user.profile.pinnedVideo) {
        const previousVideo = await Video.findById(user.profile.pinnedVideo);
        if (previousVideo) {
          previousVideo.isPinned = false;
          await previousVideo.save();
        }
      }
      user.profile.pinnedVideo = videoId;
      video.isPinned = true;
    }

    await user.save();
    await video.save();

    res.json({ 
      pinned: !!user.profile.pinnedVideo,
      pinnedVideo: user.profile.pinnedVideo 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get follow requests (for private accounts)
router.get('/follow-requests', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followRequests.user', 'username profile');
    
    const pendingRequests = user.followRequests.filter(req => req.status === 'pending');
    
    res.json({ requests: pendingRequests });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept/Reject follow request
router.post('/follow-requests/:requestId/:action', authMiddleware, async (req, res) => {
  try {
    const { requestId, action } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID' });
    }
    
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be accept or reject' });
    }
    const user = await User.findById(req.user._id);
    const request = user.followRequests.id(requestId);

    if (!request || request.status !== 'pending') {
      return res.status(404).json({ message: 'Request not found' });
    }

    const requesterId = request.user;

    if (action === 'accept') {
      request.status = 'accepted';
      
      // Add to followers
      if (!user.followers.includes(requesterId)) {
        user.followers.push(requesterId);
        user.profile.followers++;
      }

      // Add to requester's following
      const requester = await User.findById(requesterId);
      if (!requester.followedUsers.includes(req.user._id)) {
        requester.followedUsers.push(req.user._id);
        requester.profile.following++;
        await requester.save();
      }
    } else if (action === 'reject') {
      request.status = 'rejected';
    }

    await user.save();

    res.json({ 
      status: request.status,
      message: `Follow request ${action}ed` 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's videos
router.get('/:id/videos', async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const videos = await Video.find({ user: req.params.id })
      .populate('user', 'username profile')
      .sort({ isPinned: -1, createdAt: -1 });

    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
