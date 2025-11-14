const express = require('express');
const Sound = require('../models/Sound');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// ==================== GET TRENDING SOUNDS ====================
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category || 'all';

    let query = { status: 'active' };
    if (category !== 'all') {
      query.genre = category;
    }

    const sounds = await Sound.find(query)
      .sort({ trendingScore: -1, plays: -1 })
      .limit(limit)
      .select('name artist coverImage duration genre isOriginal plays saves usedInVideos formattedDuration')
      .populate('createdBy', 'username profile.avatar')
      .lean();

    // Add formatted duration
    const formattedSounds = sounds.map(sound => ({
      ...sound,
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays),
      saves: formatNumber(sound.saves)
    }));

    res.json({
      success: true,
      sounds: formattedSounds
    });
  } catch (error) {
    console.error('Error fetching trending sounds:', error);
    res.status(500).json({ message: 'Failed to fetch trending sounds', error: error.message });
  }
});

// ==================== SEARCH SOUNDS ====================
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 20;
    const category = req.query.category || 'all';

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        sounds: [],
        message: 'Please enter at least 2 characters to search'
      });
    }

    let searchQuery = {
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (category !== 'all') {
      searchQuery.genre = category;
    }

    const sounds = await Sound.find(searchQuery)
      .sort({ plays: -1, saves: -1 })
      .limit(limit)
      .select('name artist coverImage duration genre isOriginal plays saves usedInVideos')
      .populate('createdBy', 'username profile.avatar')
      .lean();

    const formattedSounds = sounds.map(sound => ({
      ...sound,
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays),
      saves: formatNumber(sound.saves)
    }));

    res.json({
      success: true,
      sounds: formattedSounds,
      query: query
    });
  } catch (error) {
    console.error('Error searching sounds:', error);
    res.status(500).json({ message: 'Failed to search sounds', error: error.message });
  }
});

// ==================== GET SOUND BY ID ====================
router.get('/:id', async (req, res) => {
  try {
    const sound = await Sound.findById(req.params.id)
      .populate('createdBy', 'username profile.avatar')
      .populate('originalVideo', 'url thumbnail description')
      .lean();

    if (!sound) {
      return res.status(404).json({ message: 'Sound not found' });
    }

    if (sound.status !== 'active') {
      return res.status(404).json({ message: 'Sound not available' });
    }

    // Increment plays
    await Sound.findByIdAndUpdate(req.params.id, {
      $inc: { plays: 1, trendingScore: 0.1 }
    });

    const formattedSound = {
      ...sound,
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays + 1),
      saves: formatNumber(sound.saves)
    };

    res.json({
      success: true,
      sound: formattedSound
    });
  } catch (error) {
    console.error('Error fetching sound:', error);
    res.status(500).json({ message: 'Failed to fetch sound', error: error.message });
  }
});

// ==================== SAVE SOUND TO USER LIBRARY ====================
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { soundId } = req.body;

    if (!soundId) {
      return res.status(400).json({ message: 'Sound ID is required' });
    }

    const sound = await Sound.findById(soundId);
    if (!sound) {
      return res.status(404).json({ message: 'Sound not found' });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already saved
    if (user.savedSounds && user.savedSounds.includes(soundId)) {
      return res.json({
        success: true,
        message: 'Sound already saved',
        saved: true
      });
    }

    // Add to user's saved sounds
    if (!user.savedSounds) {
      user.savedSounds = [];
    }
    user.savedSounds.push(soundId);
    await user.save();

    // Increment sound saves
    await Sound.findByIdAndUpdate(soundId, {
      $inc: { saves: 1, trendingScore: 0.5 }
    });

    res.json({
      success: true,
      message: 'Sound saved to library',
      saved: true
    });
  } catch (error) {
    console.error('Error saving sound:', error);
    res.status(500).json({ message: 'Failed to save sound', error: error.message });
  }
});

// ==================== REMOVE SOUND FROM LIBRARY ====================
router.delete('/unsave/:soundId', authMiddleware, async (req, res) => {
  try {
    const { soundId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user.savedSounds || !user.savedSounds.includes(soundId)) {
      return res.json({
        success: true,
        message: 'Sound not in library',
        saved: false
      });
    }

    user.savedSounds = user.savedSounds.filter(
      id => id.toString() !== soundId.toString()
    );
    await user.save();

    res.json({
      success: true,
      message: 'Sound removed from library',
      saved: false
    });
  } catch (error) {
    console.error('Error unsaving sound:', error);
    res.status(500).json({ message: 'Failed to remove sound', error: error.message });
  }
});

// ==================== GET USER'S SAVED SOUNDS ====================
router.get('/my-sounds', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedSounds');
    
    if (!user.savedSounds || user.savedSounds.length === 0) {
      return res.json({
        success: true,
        sounds: []
      });
    }

    const soundIds = user.savedSounds.map(id => id.toString());
    const sounds = await Sound.find({
      _id: { $in: user.savedSounds },
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .select('name artist coverImage duration genre isOriginal plays saves usedInVideos')
      .populate('createdBy', 'username profile.avatar')
      .lean();

    const formattedSounds = sounds.map(sound => ({
      ...sound,
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays),
      saves: formatNumber(sound.saves)
    }));

    res.json({
      success: true,
      sounds: formattedSounds
    });
  } catch (error) {
    console.error('Error fetching saved sounds:', error);
    res.status(500).json({ message: 'Failed to fetch saved sounds', error: error.message });
  }
});

// ==================== EXTRACT AUDIO FROM VIDEO ====================
router.post('/extract', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    const video = await Video.findById(videoId).populate('user');
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check if user owns the video or video is public
    if (video.user._id.toString() !== req.user._id.toString() && video.isPrivate) {
      return res.status(403).json({ message: 'Unauthorized to extract audio from this video' });
    }

    // In a real implementation, you would use FFmpeg or similar to extract audio
    // For now, we'll create a sound entry with the video reference
    
    // Check if sound already exists for this video
    let sound = await Sound.findOne({ originalVideo: videoId });

    if (!sound) {
      sound = new Sound({
        name: video.description || 'Original Sound',
        artist: `@${video.user.username || 'user'}`,
        audioUrl: video.url, // In production, extract actual audio file
        coverImage: video.thumbnail || '',
        duration: 30, // Default, should be extracted from video
        genre: 'trending',
        isOriginal: true,
        originalVideo: videoId,
        createdBy: video.user._id,
        tags: video.hashtags || []
      });

      await sound.save();
    }

    res.json({
      success: true,
      message: 'Audio extracted successfully',
      sound: {
        id: sound._id,
        name: sound.name,
        artist: sound.artist,
        audioUrl: sound.audioUrl,
        coverImage: sound.coverImage,
        duration: sound.duration,
        formattedDuration: formatDuration(sound.duration),
        isOriginal: true
      }
    });
  } catch (error) {
    console.error('Error extracting audio:', error);
    res.status(500).json({ message: 'Failed to extract audio', error: error.message });
  }
});

// ==================== GET SOUNDS BY CATEGORY ====================
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const sounds = await Sound.find({
      genre: category,
      status: 'active'
    })
      .sort({ plays: -1, trendingScore: -1 })
      .limit(limit)
      .select('name artist coverImage duration genre isOriginal plays saves usedInVideos')
      .populate('createdBy', 'username profile.avatar')
      .lean();

    const formattedSounds = sounds.map(sound => ({
      ...sound,
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays),
      saves: formatNumber(sound.saves)
    }));

    res.json({
      success: true,
      sounds: formattedSounds,
      category: category
    });
  } catch (error) {
    console.error('Error fetching sounds by category:', error);
    res.status(500).json({ message: 'Failed to fetch sounds', error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

module.exports = router;

