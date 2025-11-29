const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
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

// Get app settings (must be before /:id)
router.get('/app-settings', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('appSettings preferredLanguage preferredRegion');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Default app settings
    const defaultSettings = {
      darkMode: false,
      dataSaver: false,
      autoPlay: true,
      notifications: true,
      locationServices: false,
      analytics: true
    };
    
    // If user has saved settings, use them; otherwise use defaults
    const hasSavedSettings = user.appSettings && Object.keys(user.appSettings).length > 0;
    const finalSettings = hasSavedSettings ? user.appSettings : defaultSettings;
    
    console.log('Returning app settings:', finalSettings);
    
    res.json({
      success: true,
      appSettings: finalSettings,
      preferredLanguage: user.preferredLanguage || 'English',
      preferredRegion: user.preferredRegion || 'United States'
    });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    res.status(500).json({ success: false, message: error.message });
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

// Get linked accounts (must be before /:id)
router.get('/linked-accounts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('linkedAccounts');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Default platforms
    const defaultPlatforms = [
      { platform: 'Google', icon: 'fa-brands fa-google', connected: false },
      { platform: 'Facebook', icon: 'fa-brands fa-facebook', connected: false },
      { platform: 'Instagram', icon: 'fa-brands fa-instagram', connected: false },
      { platform: 'Twitter', icon: 'fa-brands fa-twitter', connected: false },
      { platform: 'Apple', icon: 'fa-brands fa-apple', connected: false }
    ];
    
    // Merge with user's linked accounts
    const linkedAccounts = defaultPlatforms.map(platform => {
      const userLink = (user.linkedAccounts || []).find(acc => acc.platform === platform.platform);
      if (userLink) {
        return {
          ...platform,
          email: userLink.email,
          username: userLink.username,
          connected: userLink.connected,
          connectedAt: userLink.connectedAt
        };
      }
      return platform;
    });
    
    res.json({ success: true, linkedAccounts });
  } catch (error) {
    console.error('Error fetching linked accounts:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch linked accounts' });
  }
});

// Get account activity (must be before /:id)
router.get('/account-activity', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('accountActivity');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return last 20 activities
    const activities = (user.accountActivity || []).slice(0, 20);
    res.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching account activity:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch account activity' });
  }
});

// Direct data download - returns JSON file with user data (must be before /:id)
router.get('/download-data', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -emailVerificationToken -emailVerificationExpires')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prepare user data for download
    const userData = {
      exportDate: new Date().toISOString(),
      profile: {
        username: user.username,
        email: user.email,
        displayName: user.profile?.displayName || '',
        bio: user.profile?.bio || '',
        avatar: user.profile?.avatar || '',
        website: user.profile?.website || '',
        isVerified: user.profile?.isVerified || false,
        followers: user.profile?.followers || 0,
        following: user.profile?.following || 0,
        likes: user.profile?.likes || 0
      },
      accountInfo: {
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        accountStatus: user.accountStatus,
        authProvider: user.authProvider,
        emailVerified: user.emailVerified
      },
      settings: {
        appSettings: user.appSettings || {},
        notificationSettings: user.notificationSettings || {},
        privacySettings: user.privacy || {}
      },
      linkedAccounts: user.linkedAccounts || [],
      activityHistory: (user.accountActivity || []).slice(0, 50)
    };
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="my-data-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(userData);
  } catch (error) {
    console.error('Error downloading user data:', error);
    res.status(500).json({ message: error.message || 'Failed to download data' });
  }
});

// Delete account permanently (must be before /:id)
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete all user-related data
    // 1. Delete user's videos
    const Video = require('../models/Video');
    await Video.deleteMany({ user: user._id });
    
    // 2. Delete user's comments
    const Comment = require('../models/Comment');
    await Comment.deleteMany({ user: user._id });
    
    // 3. Remove user from other users' followers/following lists
    await User.updateMany(
      {},
      { $pull: { 'profile.followers': user._id } }
    );
    await User.updateMany(
      {},
      { $pull: { 'profile.following': user._id } }
    );
    
    // 4. Delete refresh tokens
    const RefreshToken = require('../models/RefreshToken');
    await RefreshToken.deleteMany({ user: user._id });
    
    // 5. Delete business profile if exists
    const { BusinessProfile } = require('../models/Business');
    await BusinessProfile.deleteOne({ user: user._id });
    
    // 6. Delete notifications related to this user
    const Notification = require('../models/Notification');
    await Notification.deleteMany({ 
      $or: [
        { userId: user._id },
        { relatedUserId: user._id }
      ]
    });
    
    // 7. Delete user's likes on videos
    await Video.updateMany(
      { likes: user._id },
      { $pull: { likes: user._id } }
    );
    
    // 8. Finally, delete the user account
    await User.findByIdAndDelete(user._id);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: error.message || 'Failed to delete account' });
  }
});

// ==================== DYNAMIC ROUTES ====================

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
    const { username, displayName, bio, avatar, website } = req.body;
    console.log('Profile update request:', { 
      userId: req.user._id, 
      username,
      displayName, 
      bio: bio?.substring(0, 50),
      avatar: avatar ? `${(avatar.length / 1024).toFixed(2)}KB base64` : 'none',
      website 
    });
    
    const user = await User.findById(req.user._id);
    
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
    }

    if (displayName !== undefined) user.profile.displayName = displayName;
    if (bio !== undefined) user.profile.bio = bio;
    if (avatar !== undefined) user.profile.avatar = avatar;
    if (website !== undefined) user.profile.website = website;

    await user.save();
    console.log('Profile updated successfully:', { username: user.username, profile: user.profile });
    res.json({ 
      message: 'Profile updated', 
      username: user.username,
      profile: user.profile 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message || 'Failed to update profile' });
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
    
    // Log activity
    if (!user.accountActivity) {
      user.accountActivity = [];
    }
    user.accountActivity.unshift({
      action: 'Password Changed',
      device: req.get('user-agent') || 'Unknown Device',
      location: 'Unknown Location',
      ip: req.ip,
      status: 'success'
    });
    
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
    
    // Log activity
    if (!user.accountActivity) {
      user.accountActivity = [];
    }
    user.accountActivity.unshift({
      action: 'Email Changed',
      device: req.get('user-agent') || 'Unknown Device',
      location: 'Unknown Location',
      ip: req.ip,
      status: 'success'
    });
    
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
    
    // Log activity
    if (!user.accountActivity) {
      user.accountActivity = [];
    }
    user.accountActivity.unshift({
      action: 'Phone Number Changed',
      device: req.get('user-agent') || 'Unknown Device',
      location: 'Unknown Location',
      ip: req.ip,
      status: 'success'
    });
    
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
// Deactivate account
router.post('/deactivate', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update account status
    user.accountStatus = 'suspended';
    
    // Add deactivated timestamp (if field exists in schema)
    if (user.deactivatedAt !== undefined) {
      user.deactivatedAt = new Date();
    }
    
    // Log activity
    if (!user.accountActivity) {
      user.accountActivity = [];
    }
    user.accountActivity.unshift({
      action: 'Account Deactivated',
      device: req.get('user-agent') || 'Unknown Device',
      location: 'Unknown Location',
      ip: req.ip,
      status: 'success'
    });
    
    await user.save();
    res.json({ message: 'Account deactivated successfully. You can reactivate by logging in within 30 days.' });
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
    
    // Remove the linked account
    user.linkedAccounts = user.linkedAccounts.filter(acc => acc.platform !== platform);
    
    // Log this activity
    user.accountActivity.unshift({
      action: `${platform} Account Unlinked`,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Unknown Location',
      ip: req.ip,
      status: 'success'
    });
    
    await user.save();
    res.json({ message: `${platform} account unlinked successfully` });
  } catch (error) {
    console.error('Error unlinking account:', error);
    res.status(500).json({ message: error.message || 'Failed to unlink account' });
  }
});

// Link social account
router.post('/link-account', authMiddleware, async (req, res) => {
  try {
    const { platform, email, username, providerId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already linked
    const existingLink = user.linkedAccounts.find(acc => acc.platform === platform);
    if (existingLink) {
      return res.status(400).json({ message: `${platform} account already linked` });
    }
    
    // Add linked account
    user.linkedAccounts.push({
      platform,
      email,
      username,
      providerId,
      connected: true,
      connectedAt: new Date()
    });
    
    // Log this activity
    user.accountActivity.unshift({
      action: `${platform} Account Linked`,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Unknown Location',
      ip: req.ip,
      status: 'success'
    });
    
    await user.save();
    res.json({ message: `${platform} account linked successfully`, linkedAccount: user.linkedAccounts.find(acc => acc.platform === platform) });
  } catch (error) {
    console.error('Error linking account:', error);
    res.status(500).json({ message: error.message || 'Failed to link account' });
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

module.exports = router;
