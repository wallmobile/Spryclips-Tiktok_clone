const express = require('express');
const mongoose = require('mongoose');
const Playlist = require('../models/Playlist');
const VideoSeries = require('../models/VideoSeries');
const Collection = require('../models/Collection');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { ensureAbsoluteUrl } = require('../utils/urlHelpers');
const router = express.Router();

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toPlainObject = (doc) =>
  doc && typeof doc.toObject === 'function' ? doc.toObject({ getters: true, virtuals: false }) : doc;

const populateWatchLaterEntries = async (userDoc) => {
  if (!userDoc) {
    console.log('[Watch Later] No user document provided');
    return [];
  }

  // Get raw watchLater array length for logging
  const rawCount = userDoc.watchLater?.length || 0;
  console.log(`[Watch Later] User ${userDoc._id} has ${rawCount} raw entries in watchLater array`);

  // Initialize watchLater if it doesn't exist
  if (!Array.isArray(userDoc.watchLater)) {
    console.warn(`[Watch Later] watchLater is not an array, initializing...`);
    userDoc.watchLater = [];
    return [];
  }

  try {
    await userDoc.populate({
      path: 'watchLater.video',
      select: 'thumbnail description url duration createdAt user processedUrl transcoded status isPrivate views likes comments shares hashtags',
      populate: { path: 'user', select: 'username profile' }
    });
  } catch (error) {
    console.error('[Watch Later] Error populating watchLater entries:', error);
    return [];
  }

  const entries = (userDoc.watchLater || [])
    .map((entry, index) => {
      // Log entries that don't have video populated
      if (!entry?.video) {
        console.warn(`[Watch Later] Entry ${index} has no video (videoId: ${entry?.video})`);
        return null;
      }
      // Check if video is deleted or private
      if (entry.video && entry.video.isPrivate && entry.video.user?.toString() !== userDoc._id.toString()) {
        console.warn(`[Watch Later] Entry ${index} video is private and user doesn't own it`);
        return null;
      }
      return entry;
    })
    .filter((entry) => Boolean(entry?.video))
    .sort(
      (a, b) =>
        new Date(b?.addedAt || b?.createdAt || 0).getTime() - new Date(a?.addedAt || a?.createdAt || 0).getTime()
    )
    .map((entry) => {
      const video = toPlainObject(entry.video);
      if (!video) {
        return null;
      }
      
      if (video?.user) {
        video.user = toPlainObject(video.user);
      }
      
      // Ensure absolute URLs for video and thumbnail
      const rawVideoUrl = video?.transcoded?.playbackUrl || video?.processedUrl || video?.url || '';
      const rawThumbnail = video?.thumbnail || video?.thumbnailUrl || '';
      
      if (video) {
        video.url = ensureAbsoluteUrl(rawVideoUrl);
        video.videoUrl = video.url; // Also set videoUrl for compatibility
        
        // Set thumbnail with fallback
        if (rawThumbnail) {
          video.thumbnail = ensureAbsoluteUrl(rawThumbnail);
        } else {
          // Generate thumbnail from video URL if no thumbnail exists
          const videoUrl = video.url;
          if (videoUrl) {
            // Try to use video as poster/thumbnail (browsers will show first frame)
            video.thumbnail = videoUrl;
          } else {
            video.thumbnail = '';
          }
        }
        
        console.log(`[Watch Later] Video ${video._id}: thumbnail="${video.thumbnail}", url="${video.url}"`);
      }
      
      return {
        video,
        addedAt: entry?.addedAt || entry?.createdAt || new Date().toISOString()
      };
    })
    .filter(Boolean); // Remove any null entries
    
  console.log(`[Watch Later] After filtering, ${entries.length} valid entries remain`);
  return entries;
};

const respondWithServerError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  return res.status(500).json({
    message: fallbackMessage,
    ...(process.env.NODE_ENV !== 'production' && { detail: error?.message })
  });
};

// ========== PLAYLISTS ==========

// Create playlist
router.post('/playlists', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const playlist = new Playlist({
      user: req.user._id,
      name,
      description: description || '',
      isPublic: isPublic !== false
    });
    await playlist.save();
    
    await User.findByIdAndUpdate(req.user._id, {
      $push: { playlists: playlist._id }
    });

    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's playlists
router.get('/playlists/my', authMiddleware, async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user._id })
      .populate('videos.video', 'thumbnail description url')
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get playlist by ID
router.get('/playlists/:id', async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('user', 'username profile')
      .populate('videos.video');
    
    if (!playlist || (!playlist.isPublic && playlist.user._id.toString() !== req.user?._id?.toString())) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add video to playlist
router.post('/playlists/:id/videos', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist || playlist.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Playlist not found or unauthorized' });
    }
    
    const existingIndex = playlist.videos.findIndex(v => v.video.toString() === videoId);
    if (existingIndex >= 0) {
      return res.status(400).json({ message: 'Video already in playlist' });
    }
    
    playlist.videos.push({
      video: videoId,
      order: playlist.videos.length
    });
    await playlist.save();
    
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove video from playlist
router.delete('/playlists/:id/videos/:videoId', authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist || playlist.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Playlist not found or unauthorized' });
    }
    
    playlist.videos = playlist.videos.filter(v => v.video.toString() !== req.params.videoId);
    await playlist.save();
    
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== VIDEO SERIES ==========

// Create video series
router.post('/series', authMiddleware, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const series = new VideoSeries({
      user: req.user._id,
      title,
      description: description || '',
      status: status || 'ongoing'
    });
    await series.save();
    
    await User.findByIdAndUpdate(req.user._id, {
      $push: { videoSeries: series._id }
    });

    res.status(201).json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's series
router.get('/series/my', authMiddleware, async (req, res) => {
  try {
    const series = await VideoSeries.find({ user: req.user._id })
      .populate('videos.video', 'thumbnail description url')
      .sort({ createdAt: -1 });
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add episode to series
router.post('/series/:id/episodes', authMiddleware, async (req, res) => {
  try {
    const { videoId, episodeNumber, title } = req.body;
    const series = await VideoSeries.findById(req.params.id);
    
    if (!series || series.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Series not found or unauthorized' });
    }
    
    series.videos.push({
      video: videoId,
      episodeNumber,
      title: title || ''
    });
    series.totalEpisodes = series.videos.length;
    await series.save();
    
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== COLLECTIONS ==========

// Create collection
router.post('/collections', authMiddleware, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const collection = new Collection({
      user: req.user._id,
      name,
      description: description || '',
      isPublic: isPublic || false
    });
    await collection.save();
    
    await User.findByIdAndUpdate(req.user._id, {
      $push: { collections: collection._id }
    });

    res.status(201).json(collection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's collections
router.get('/collections/my', authMiddleware, async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user._id })
      .populate('videos.video', 'thumbnail description url')
      .sort({ createdAt: -1 });
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Save video to collection
router.post('/collections/:id/videos', authMiddleware, async (req, res) => {
  try {
    const { videoId, note } = req.body;
    const collection = await Collection.findById(req.params.id);
    
    if (!collection || collection.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Collection not found or unauthorized' });
    }
    
    const existingIndex = collection.videos.findIndex(v => v.video.toString() === videoId);
    if (existingIndex >= 0) {
      return res.status(400).json({ message: 'Video already in collection' });
    }
    
    collection.videos.push({
      video: videoId,
      note: note || ''
    });
    await collection.save();
    
    res.json(collection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========== WATCH LATER ==========

// Add to watch later
router.post('/watch-later', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.body || {};

    console.log(`[Watch Later] POST request to add video: ${videoId} for user: ${req.user._id}`);

    if (!videoId || !isValidObjectId(videoId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid video id.',
        watchLater: [],
        count: 0
      });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      console.error(`[Watch Later] Video not found: ${videoId}`);
      return res.status(404).json({ 
        success: false,
        message: 'Video not found.',
        watchLater: [],
        count: 0
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.error(`[Watch Later] User not found: ${req.user._id}`);
      return res.status(404).json({ 
        success: false,
        message: 'User not found.',
        watchLater: [],
        count: 0
      });
    }

    // Initialize watchLater array if it doesn't exist
    if (!Array.isArray(user.watchLater)) {
      console.log(`[Watch Later] Initializing watchLater array for user ${req.user._id}`);
      user.watchLater = [];
    }

    const exists = user.watchLater.some((entry) => entry?.video?.toString() === videoId.toString());
    if (exists) {
      console.log(`[Watch Later] Video ${videoId} already in watch later for user ${req.user._id}`);
      const watchLater = await populateWatchLaterEntries(user);
      return res.status(200).json({ 
        success: true,
        message: 'Video is already in your Watch Later list.',
        watchLater: watchLater || [],
        count: watchLater?.length || 0
      });
    }

    user.watchLater.push({ video: videoId, addedAt: new Date() });
    await user.save();

    console.log(`[Watch Later] Successfully saved video ${videoId} to database`);

    const watchLater = await populateWatchLaterEntries(user);
    
    console.log(`[Watch Later] Added video ${videoId} to user ${req.user._id}'s watch later. Total: ${watchLater.length}`);
    
    return res.json({ 
      success: true,
      message: 'Added to Watch Later', 
      watchLater: watchLater || [],
      count: watchLater?.length || 0
    });
  } catch (error) {
    console.error('[Watch Later] Error adding to watch later:', error);
    console.error('[Watch Later] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Unable to add video to Watch Later right now.',
      watchLater: [],
      count: 0,
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

// Get watch later
router.get('/watch-later', authMiddleware, async (req, res) => {
  try {
    console.log(`[Watch Later] Fetching watch later for user: ${req.user._id}`);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('[Watch Later] User not found:', req.user._id);
      return res.status(404).json({ 
        success: false,
        message: 'User not found.',
        watchLater: [],
        count: 0
      });
    }

    console.log(`[Watch Later] User found, raw watchLater count: ${user.watchLater?.length || 0}`);
    
    const watchLater = await populateWatchLaterEntries(user);
    
    // Log for debugging
    console.log(`[Watch Later] User ${req.user._id} has ${watchLater.length} populated videos in watch later`);
    
    // Return in consistent format - always include watchLater array
    return res.json({ 
      success: true,
      watchLater: Array.isArray(watchLater) ? watchLater : [],
      count: watchLater?.length || 0
    });
  } catch (error) {
    console.error('[Watch Later] Error fetching watch later:', error);
    console.error('[Watch Later] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Unable to load your Watch Later list right now.',
      watchLater: [],
      count: 0,
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
});

// Remove from watch later
router.delete('/watch-later/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId || !isValidObjectId(videoId)) {
      return res.status(400).json({ message: 'Please provide a valid video id.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const initialLength = user.watchLater?.length ?? 0;
    user.watchLater = (user.watchLater || []).filter((entry) => entry.video.toString() !== videoId);

    if (user.watchLater.length === initialLength) {
      return res.status(404).json({ message: 'That video is not in your Watch Later list.' });
    }

    await user.save();
    const watchLater = await populateWatchLaterEntries(user);
    return res.json({ message: 'Removed from Watch Later', watchLater });
  } catch (error) {
    return respondWithServerError(res, error, 'Unable to remove that video from Watch Later right now.');
  }
});

// Clear watch later
router.delete('/watch-later', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.watchLater = [];
    await user.save();

    return res.json({ message: 'Cleared Watch Later list', watchLater: [] });
  } catch (error) {
    return respondWithServerError(res, error, 'Unable to clear your Watch Later list right now.');
  }
});

module.exports = router;
