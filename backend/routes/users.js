const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('../models/User');
const Video = require('../models/Video');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
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
      metadata: data.metadata || {}
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// ==================== STATIC ROUTES (Must be before /:id route) ====================

// Get QR stats for current user
router.get('/qr-stats', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      qrScans: user.profile?.qrScans || 0,
      profileViews: user.profile?.profileViews || 0
    });
  } catch (error) {
    console.error('Error fetching QR stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch QR stats' });
  }
});

// Get notification settings (must be before /:id)
router.get('/notification-settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationSettings notificationFrequency quietHours');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has saved settings
    const hasSavedSettings = user.notificationSettings && Object.keys(user.notificationSettings).length > 0;
    
    // Default notification settings (only used if no saved settings)
    const defaultSettings = {
      likes: { push: true, email: false, sms: false },
      comments: { push: true, email: true, sms: false },
      mentions: { push: true, email: true, sms: true },
      followers: { push: true, email: false, sms: false },
      liveAlerts: { push: true, email: false, sms: false },
      directMessages: { push: true, email: true, sms: false },
      videoUploads: { push: false, email: true, sms: false }
    };
    
    // If user has saved settings, use them directly
    // Otherwise use defaults
    let finalSettings;
    if (hasSavedSettings) {
      // User has saved settings - use them but fill any missing categories with defaults
      finalSettings = {};
      Object.keys(defaultSettings).forEach(category => {
        if (user.notificationSettings[category]) {
          finalSettings[category] = user.notificationSettings[category];
        } else {
          finalSettings[category] = defaultSettings[category];
        }
      });
    } else {
      finalSettings = defaultSettings;
    }
    
    console.log('Returning notification settings:', finalSettings);
    
    res.json({ 
      success: true, 
      notificationSettings: finalSettings,
      notificationFrequency: user.notificationFrequency || 'instant',
      quietHours: user.quietHours || { enabled: false, from: '22:00', to: '08:00' }
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get privacy settings
router.get('/privacy', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('privacy');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, privacy: user.privacy });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update privacy settings
router.put('/privacy', authMiddleware, async (req, res) => {
  try {
    const { 
      accountType, 
      showActivityStatus, 
      allowDirectMessages,
      commentFilter,
      downloadEnabled,
      mentionsEnabled,
      tagsEnabled,
      duetEnabled,
      stitchEnabled,
      filteredKeywords
    } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (accountType !== undefined) user.privacy.accountType = accountType;
    if (showActivityStatus !== undefined) user.privacy.showActivityStatus = showActivityStatus;
    if (allowDirectMessages !== undefined) user.privacy.allowDirectMessages = allowDirectMessages;
    if (commentFilter !== undefined) user.privacy.commentFilter = commentFilter;
    if (downloadEnabled !== undefined) user.privacy.downloadEnabled = downloadEnabled;
    if (mentionsEnabled !== undefined) user.privacy.mentionsEnabled = mentionsEnabled;
    if (tagsEnabled !== undefined) user.privacy.tagsEnabled = tagsEnabled;
    if (duetEnabled !== undefined) user.privacy.duetEnabled = duetEnabled;
    if (stitchEnabled !== undefined) user.privacy.stitchEnabled = stitchEnabled;
    if (filteredKeywords !== undefined) user.privacy.filteredKeywords = filteredKeywords;

    await user.save();
    res.json({ success: true, message: 'Privacy settings updated', privacy: user.privacy });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get blocked users
router.get('/blocked', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('privacy.blockedUsers.user', 'username profile.avatar');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const blockedUsers = (user.privacy.blockedUsers || []).filter(b => b.user).map(b => ({
      id: b.user._id,
      username: b.user.username,
      avatar: b.user.profile?.avatar,
      blockedDate: b.blockedAt
    }));

    res.json({ success: true, blockedUsers });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Block user
router.post('/block/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already blocked
    const alreadyBlocked = user.privacy.blockedUsers?.some(
      b => b.user.toString() === userId
    );
    
    if (alreadyBlocked) {
      return res.status(400).json({ success: false, message: 'User already blocked' });
    }

    user.privacy.blockedUsers = user.privacy.blockedUsers || [];
    user.privacy.blockedUsers.push({ user: userId, blockedAt: new Date() });
    await user.save();

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unblock user
router.delete('/block/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.privacy.blockedUsers = (user.privacy.blockedUsers || []).filter(
      b => b.user.toString() !== userId
    );
    await user.save();

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DYNAMIC ROUTES ====================

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let user;
    
    // Check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id)
      .select('-password')
      .populate('videos')
      .populate('followedUsers', 'username profile')
      .populate('followers', 'username profile')
      .populate('profile.pinnedVideo');
    } else {
      // Try to find by username (remove @ if present)
      const username = id.replace(/^@/, '').toLowerCase();
      user = await User.findOne({ username: username })
        .select('-password')
        .populate('videos')
        .populate('followedUsers', 'username profile')
        .populate('followers', 'username profile')
        .populate('profile.pinnedVideo');
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user is following this user (optional auth)
    let isFollowing = false;
    let isPending = false;
    
    try {
      // Try to get current user from token (optional)
      let token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.userId) {
          // IMPORTANT: Don't populate followedUsers, get fresh data from database
          const currentUser = await User.findById(decoded.userId).lean();
          if (currentUser) {
            const userIdStr = user._id.toString();
            const currentUserIdStr = currentUser._id.toString();
            
            console.log('🔍 Checking follow status in GET /:id:', {
              targetUserId: userIdStr,
              currentUserId: currentUserIdStr,
              followedUsersArray: (currentUser.followedUsers || []).map(id => id.toString()),
              followedUsersType: typeof currentUser.followedUsers
            });
            
            // Check if following - handle both ObjectId and string arrays
            const followedUsersArray = currentUser.followedUsers || [];
            isFollowing = followedUsersArray.some(
              followedId => {
                const followedIdStr = followedId?.toString() || followedId;
                const match = followedIdStr === userIdStr;
                if (match) {
                  console.log('✅ Found match:', { followedIdStr, userIdStr });
                }
                return match;
              }
            );
            
            console.log('📊 Follow status result:', {
              isFollowing,
              targetUserId: userIdStr,
              followedUsersCount: followedUsersArray.length
            });
            
            // Check if pending (for private accounts)
            if (!isFollowing && user.privacy?.accountType === 'private') {
              const pendingRequest = user.followRequests.find(
                req => req.user.toString() === currentUserIdStr && req.status === 'pending'
              );
              isPending = !!pendingRequest;
            }
          }
        }
      }
    } catch (authError) {
      // Not authenticated or token invalid - that's OK, isFollowing will remain false
      console.log('Optional auth check failed (this is OK):', authError.message);
    }

    // Convert to object and add isFollowing field
    const userObject = user.toObject();
    userObject.isFollowing = isFollowing;
    userObject.isPending = isPending;

    res.json({ user: userObject, isFollowing, isPending });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, displayName, bio, avatar, banner, website } = req.body;
    console.log('Profile update request:', { 
      userId: req.user._id, 
      username,
      displayName, 
      bio: bio?.substring(0, 50),
      avatar: avatar ? `${(avatar.length / 1024).toFixed(2)}KB base64` : 'none',
      banner: banner ? `${(banner.length / 1024).toFixed(2)}KB base64` : 'none',
      website 
    });
    
    let user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle username change
    if (username !== undefined && username !== user.username) {
      // Validate username
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores' });
      }
      
      // Check if username already taken
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(), 
        _id: { $ne: user._id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      user.username = username.toLowerCase();
      await user.save();
    }

    // Build update object for profile fields using $set operator
    // This ensures nested fields are properly saved in MongoDB
    const updateData = {};
    if (displayName !== undefined) updateData['profile.displayName'] = displayName;
    if (bio !== undefined) updateData['profile.bio'] = bio;
    if (avatar !== undefined) updateData['profile.avatar'] = avatar;
    if (banner !== undefined) {
      // Only update banner if it's explicitly provided
      // Empty string means user wants to clear it, non-empty means set it
      const previousBanner = user.profile.banner || '';
      updateData['profile.banner'] = banner;
      
      console.log('💾 Setting banner using $set:', {
        isDefined: banner !== undefined,
        isEmpty: banner === '',
        length: banner ? banner.length : 0,
        previousBanner: previousBanner ? 'exists' : 'none',
        previousLength: previousBanner ? previousBanner.length : 0,
        newLength: banner ? banner.length : 0
      });
    } else {
      // Banner not provided - preserve existing banner from database
      console.log('💾 Banner not provided in request - preserving existing banner:', {
        hasExistingBanner: !!user.profile.banner,
        existingBannerLength: user.profile.banner ? user.profile.banner.length : 0
      });
    }
    if (website !== undefined) updateData['profile.website'] = website;

    // Use $set operator to ensure nested fields are saved properly in MongoDB
    if (Object.keys(updateData).length > 0) {
      const updateResult = await User.findByIdAndUpdate(
        req.user._id, 
        { $set: updateData }, 
        { new: true, runValidators: true }
      );
      console.log('💾 Profile fields updated using $set:', {
        updatedFields: Object.keys(updateData),
        hasBanner: !!updateResult?.profile?.banner,
        bannerLength: updateResult?.profile?.banner ? updateResult.profile.banner.length : 0
      });
      
      // Reload user to get updated data
      user = await User.findById(req.user._id);
    }
    
    // Verify banner was saved by fetching from database
    const savedUser = await User.findById(req.user._id);
    console.log('✅ Banner save verification (from database):', {
      hasBanner: !!savedUser?.profile?.banner,
      bannerLength: savedUser?.profile?.banner ? savedUser.profile.banner.length : 0,
      bannerMatch: banner ? (savedUser?.profile?.banner === banner) : 'not provided',
      bannerInProfile: 'banner' in (savedUser?.profile || {}),
      allProfileKeys: Object.keys(savedUser?.profile || {})
    });
    console.log('Profile updated successfully:', { 
      username: user.username, 
      hasBanner: !!user.profile.banner,
      bannerLength: user.profile.banner ? user.profile.banner.length : 0,
      profile: {
        displayName: user.profile.displayName,
        bio: user.profile.bio?.substring(0, 50),
        hasAvatar: !!user.profile.avatar,
        hasBanner: !!user.profile.banner,
        website: user.profile.website
      }
    });
    // Fetch fresh user from database to ensure we return the saved data
    const updatedUser = await User.findById(req.user._id);
    
    // Ensure profile object includes all fields, even if empty
    const profile = updatedUser.profile || {};
    
    // ALWAYS include banner field, even if empty
    const profileWithBanner = {
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      avatar: profile.avatar || '',
      banner: profile.banner || '', // ALWAYS include banner
      website: profile.website || '',
      followers: profile.followers || 0,
      following: profile.following || 0,
      likes: profile.likes || 0,
      pinnedVideo: profile.pinnedVideo || null,
      isVerified: profile.isVerified || false,
      qrScans: profile.qrScans || 0,
      profileViews: profile.profileViews || 0
    };
    
    console.log('📤 Response being sent with profile:', {
      hasBanner: !!profileWithBanner.banner,
      bannerLength: profileWithBanner.banner ? profileWithBanner.banner.length : 0,
      bannerExists: profileWithBanner.banner !== undefined,
      bannerIsEmpty: profileWithBanner.banner === '',
      profileKeys: Object.keys(profileWithBanner),
      bannerInKeys: 'banner' in profileWithBanner,
      bannerValue: profileWithBanner.banner ? profileWithBanner.banner.substring(0, 50) + '...' : 'empty'
    });
    
    res.json({ 
      message: 'Profile updated', 
      username: updatedUser.username,
      profile: profileWithBanner
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
});

// Get app settings
router.get('/app-settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('appSettings preferredLanguage preferredRegion');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true,
      appSettings: user.appSettings || {},
      preferredLanguage: user.preferredLanguage || 'English',
      preferredRegion: user.preferredRegion || 'United States'
    });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch app settings' });
  }
});

// Update app settings
router.put('/app-settings', authMiddleware, async (req, res) => {
  try {
    const { appSettings, preferredLanguage, preferredRegion } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
      success: true,
      message: 'App settings updated', 
      appSettings: user.appSettings,
      preferredLanguage: user.preferredLanguage,
      preferredRegion: user.preferredRegion
    });
  } catch (error) {
    console.error('Error updating app settings:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update app settings' });
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
    
    // Add to password history (optional, for security)
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }
    user.passwordHistory.push({
      password: user.password,
      changedAt: new Date()
    });
    
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.accountStatus = 'suspended';
    await user.save();
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating account:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to deactivate account' });
  }
});

// Delete account permanently
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userId = user._id;

    // Delete all user's videos
    const videos = await Video.find({ user: userId });
    for (const video of videos) {
      // Delete video file if exists
      if (video.videoUrl && fs.existsSync('.' + video.videoUrl)) {
        try {
          fs.unlinkSync('.' + video.videoUrl);
        } catch (err) {
          console.error('Error deleting video file:', err);
        }
      }
      // Delete thumbnail if exists
      if (video.thumbnailUrl && fs.existsSync('.' + video.thumbnailUrl)) {
        try {
          fs.unlinkSync('.' + video.thumbnailUrl);
        } catch (err) {
          console.error('Error deleting thumbnail file:', err);
        }
      }
    }
    await Video.deleteMany({ user: userId });

    // Remove user from followers/following lists
    await User.updateMany(
      { $or: [{ followers: userId }, { followedUsers: userId }] },
      { $pull: { followers: userId, followedUsers: userId } }
    );

    // Delete user's notifications
    await Notification.deleteMany({ user: userId });

    // Delete user's conversations and messages
    const conversations = await Conversation.find({ participants: userId });
    const conversationIds = conversations.map(c => c._id);
    await Message.deleteMany({ conversation: { $in: conversationIds } });
    await Conversation.deleteMany({ participants: userId });

    // Finally delete the user
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete account' });
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
    
    console.log('📥 Follow request received:', {
      userId,
      userIdType: typeof userId,
      currentUserId: req.user._id.toString()
    });
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('❌ Invalid user ID:', userId);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user ID',
        userId: userId 
      });
    }
    
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      console.error('❌ Current user not found:', req.user._id);
      return res.status(404).json({ message: 'Current user not found' });
    }
    
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

    // Check if following - convert all to strings for comparison
    const userIdStr = userId.toString();
    const currentUserIdStr = req.user._id.toString();
    
    const isFollowing = currentUser.followedUsers.some(
      id => id.toString() === userIdStr
    );

    console.log('Follow/Unfollow Check:', {
      userId: userIdStr,
      currentUserId: currentUserIdStr,
      isFollowing,
      followedUsers: currentUser.followedUsers.map(id => id.toString()),
      followers: targetUser.followers.map(id => id.toString())
    });

    if (isFollowing) {
      // Unfollow
      currentUser.followedUsers = currentUser.followedUsers.filter(
        id => id.toString() !== userIdStr
      );
      targetUser.followers = targetUser.followers.filter(
        id => id.toString() !== currentUserIdStr
      );
      if (targetUser.profile.followers > 0) {
        targetUser.profile.followers--;
      }
      if (currentUser.profile.following > 0) {
        currentUser.profile.following--;
      }
      console.log('✅ Unfollowed:', {
        newFollowedUsers: currentUser.followedUsers.map(id => id.toString()),
        newFollowers: targetUser.followers.map(id => id.toString()),
        targetFollowers: targetUser.profile.followers,
        currentFollowing: currentUser.profile.following
      });
    } else {
      // Follow
      // Check if already in array to avoid duplicates
      if (!currentUser.followedUsers.some(id => id.toString() === userIdStr)) {
        currentUser.followedUsers.push(userId);
      }
      if (!targetUser.followers.some(id => id.toString() === currentUserIdStr)) {
        targetUser.followers.push(req.user._id);
      }
      targetUser.profile.followers++;
      currentUser.profile.following++;
      
      console.log('✅ Followed:', {
        newFollowedUsers: currentUser.followedUsers.map(id => id.toString()),
        newFollowers: targetUser.followers.map(id => id.toString()),
        targetFollowers: targetUser.profile.followers,
        currentFollowing: currentUser.profile.following
      });
      
      // Create notification for new follower
      await createNotification({
        userId: targetUser._id,
        type: 'follows',
        title: 'New Follower',
        message: 'started following you',
        relatedUserId: req.user._id,
        metadata: { followerUsername: currentUser.username }
      });
    }

    await currentUser.save();
    await targetUser.save();

    // IMPORTANT: Refetch from database to ensure we have the latest data
    const refreshedCurrentUser = await User.findById(req.user._id).lean();
    const refreshedTargetUser = await User.findById(userId).lean();
    
    // Double check the actual state after save using fresh data
    const verifyFollowing = (refreshedCurrentUser?.followedUsers || []).some(
      id => {
        const idStr = id?.toString() || id;
        return idStr === userIdStr;
      }
    );

    console.log('✅ Final state after save and refresh:', {
      verifyFollowing,
      followedUsersInDB: (refreshedCurrentUser?.followedUsers || []).map(id => (id?.toString() || id)),
      targetUserId: userIdStr,
      response: { isFollowing: verifyFollowing, isPending: false }
    });

    res.json({ 
      success: true,
      isFollowing: verifyFollowing, 
      isPending: false,
      message: verifyFollowing ? 'User followed successfully' : 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('❌ Follow/Unfollow error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to follow/unfollow user',
      error: error.toString()
    });
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
// Get following users list
router.get('/following', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('followedUsers', 'username profile.avatar profile.displayName profile.followers profile.bio');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Filter out any null/undefined followedUsers (in case of deleted users)
    const validFollowedUsers = (user.followedUsers || []).filter(fu => fu && fu._id);
    
    const following = validFollowedUsers.map(followedUser => ({
      _id: followedUser._id,
      id: followedUser._id.toString(),
      username: followedUser.username,
      profile: {
        avatar: followedUser.profile?.avatar,
        displayName: followedUser.profile?.displayName || followedUser.username,
        followers: followedUser.profile?.followers || 0,
        bio: followedUser.profile?.bio || '',
        isVerified: followedUser.profile?.isVerified || false
      },
      isFollowing: true
    }));

    res.json({ 
      success: true, 
      following: following,
      count: following.length
    });
  } catch (error) {
    console.error('Error fetching following users:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch following users' });
  }
});

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
    const userId = req.params.id;
    
    // Try to find user by ID or username
    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Find videos for this user - include all statuses except deleted
    const videos = await Video.find({ 
      user: user._id,
      status: { $ne: 'deleted' } // Exclude deleted videos
    })
      .populate('user', 'username profile displayName')
      .sort({ isPinned: -1, createdAt: -1 })
      .select('url thumbnail description hashtags likes comments shares views createdAt user music category transcoded status isPrivate isPinned duration processedVideos');

    console.log(`📹 Found ${videos.length} videos for user ${user.username} (${user._id})`);
    
    res.json({
      success: true,
      videos: videos,
      count: videos.length
    });
  } catch (error) {
    console.error('Error fetching user videos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== QR CODE TRACKING ====================

// Track QR code scan (when someone visits profile via QR)
router.post('/qr-scan/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Increment QR scan count
    user.profile.qrScans = (user.profile.qrScans || 0) + 1;
    await user.save();

    res.json({ 
      success: true, 
      message: 'QR scan tracked',
      qrScans: user.profile.qrScans 
    });
  } catch (error) {
    console.error('Error tracking QR scan:', error);
    res.status(500).json({ success: false, message: 'Failed to track QR scan' });
  }
});

// Track profile view
router.post('/profile-view/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Increment profile view count
    user.profile.profileViews = (user.profile.profileViews || 0) + 1;
    await user.save();

    res.json({ 
      success: true, 
      profileViews: user.profile.profileViews 
    });
  } catch (error) {
    console.error('Error tracking profile view:', error);
    res.status(500).json({ success: false, message: 'Failed to track profile view' });
  }
});

// Get linked accounts
router.get('/linked-accounts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('authProvider providerId');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const linkedAccounts = [
      { platform: 'Google', icon: 'fa-brands fa-google', connected: user.authProvider === 'google' },
      { platform: 'Facebook', icon: 'fa-brands fa-facebook', connected: user.authProvider === 'facebook' },
      { platform: 'Instagram', icon: 'fa-brands fa-instagram', connected: false },
      { platform: 'Twitter', icon: 'fa-brands fa-twitter', connected: false },
      { platform: 'Apple', icon: 'fa-brands fa-apple', connected: false }
    ];

    res.json({ success: true, linkedAccounts });
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch linked accounts' });
  }
});

// Link account
router.post('/link-account', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // In production, this would handle OAuth flow
    // For now, just return success
    res.json({ success: true, message: `${platform} account linked successfully` });
  } catch (error) {
    console.error('Error linking account:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to link account' });
  }
});

// Unlink account
router.post('/unlink-account', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Can't unlink if it's the only auth method
    if (user.authProvider === platform && !user.password) {
      return res.status(400).json({ success: false, message: 'Cannot unlink your only authentication method' });
    }

    // In production, this would handle OAuth unlinking
    res.json({ success: true, message: `${platform} account unlinked successfully` });
  } catch (error) {
    console.error('Error unlinking account:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to unlink account' });
  }
});

// Get account activity
router.get('/account-activity', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('lastLogin createdAt');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate activity log from user data
    const activities = [
      {
        id: '1',
        type: 'account_created',
        description: 'Account created',
        time: user.createdAt,
        ip: 'N/A',
        device: 'N/A'
      }
    ];

    if (user.lastLogin) {
      activities.push({
        id: '2',
        type: 'login',
        description: 'Last login',
        time: user.lastLogin,
        ip: 'N/A',
        device: 'N/A'
      });
    }

    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching account activity:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch account activity' });
  }
});

module.exports = router;
