const express = require('express');
const mongoose = require('mongoose');
const Playlist = require('../models/Playlist');
const VideoSeries = require('../models/VideoSeries');
const Collection = require('../models/Collection');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toPlainObject = (doc) =>
  doc && typeof doc.toObject === 'function' ? doc.toObject({ getters: true, virtuals: false }) : doc;

// Helper function to ensure absolute URL
const ensureAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  // Already absolute
  if (/^(https?:)?\/\//i.test(trimmed)) {
    if (/^\/\//.test(trimmed)) {
      const protocol = process.env.PROTOCOL || 'http:';
      return `${protocol}${trimmed}`;
    }
    return trimmed;
  }
  // Data or blob URL
  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  // Make relative URL absolute
  const baseUrl = "https://spryclips.com/";
  //process.env.API_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = trimmed.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

const populateWatchLaterEntries = async (userDoc) => {
  if (!userDoc) {
    return [];
  }

  await userDoc.populate({
    path: 'watchLater.video',
    select: 'thumbnail description url duration createdAt user processedUrl transcoded',
    populate: { path: 'user', select: 'username profile' }
  });

  return (userDoc.watchLater || [])
    .filter((entry) => Boolean(entry?.video))
    .sort(
      (a, b) =>
        new Date(b?.addedAt || b?.createdAt || 0).getTime() - new Date(a?.addedAt || a?.createdAt || 0).getTime()
    )
    .map((entry) => {
      const video = toPlainObject(entry.video);
      if (video?.user) {
        video.user = toPlainObject(video.user);
      }

      // Ensure absolute URLs for video and thumbnail
      const rawVideoUrl = video?.transcoded?.playbackUrl || video?.processedUrl || video?.url || '';
      const rawThumbnail = video?.thumbnail || '';

      if (video) {
        video.url = ensureAbsoluteUrl(rawVideoUrl);
        video.videoUrl = video.url; // Also set videoUrl for compatibility
        video.thumbnail = ensureAbsoluteUrl(rawThumbnail);
      }

      return {
        video,
        addedAt: entry?.addedAt || entry?.createdAt || new Date().toISOString()
      };
    });
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

    if (!videoId || !isValidObjectId(videoId)) {
      return res.status(400).json({ message: 'Please provide a valid video id.' });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const exists =
      Array.isArray(user.watchLater) &&
      user.watchLater.some((entry) => entry?.video?.toString() === videoId.toString());
    if (exists) {
      return res.status(400).json({ message: 'Video is already in your Watch Later list.' });
    }

    user.watchLater.push({ video: videoId, addedAt: new Date() });
    await user.save();

    const watchLater = await populateWatchLaterEntries(user);
    return res.json({ message: 'Added to Watch Later', watchLater });
  } catch (error) {
    return respondWithServerError(res, error, 'Unable to add video to Watch Later right now.');
  }
});

// Get watch later
router.get('/watch-later', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const watchLater = await populateWatchLaterEntries(user);
    return res.json({ watchLater });
  } catch (error) {
    return respondWithServerError(res, error, 'Unable to load your Watch Later list right now.');
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
