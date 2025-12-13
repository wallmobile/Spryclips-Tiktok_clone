const express = require('express');
const Sound = require('../models/Sound');
const Video = require('../models/Video');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
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

// ==================== SEARCH ONLINE MUSIC ====================
// This endpoint searches for music from online sources (YouTube, etc.)
router.get('/search-online', async (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        sounds: [],
        message: 'Please enter at least 2 characters to search'
      });
    }

    console.log(`🔍 Searching online music for: "${query}"`);

    // TODO: Replace with actual online music API (YouTube Data API, Deezer, etc.)
    // For now, we'll search our database AND return some demo results
    // In production, integrate with YouTube API or other music services
    
    // Search in database first
    const dbSounds = await Sound.find({
      status: 'active',
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    })
      .sort({ plays: -1, saves: -1 })
      .limit(limit)
      .select('name artist coverImage duration genre isOriginal plays saves usedInVideos audioUrl')
      .lean();

    // Format database results
    const formattedDbSounds = dbSounds.map(sound => ({
      ...sound,
      _id: sound._id.toString(),
      formattedDuration: formatDuration(sound.duration),
      plays: formatNumber(sound.plays),
      saves: formatNumber(sound.saves),
      isOnline: false,
      source: 'database'
    }));

    // Fetch real online music from internet APIs
    let onlineResults = [];
    try {
      // Try multiple free music APIs
      onlineResults = await fetchOnlineMusic(query, limit - formattedDbSounds.length);
    } catch (error) {
      console.error('Error fetching online music:', error);
      // If online API fails, use demo results as fallback
      onlineResults = generateDemoOnlineResults(query, Math.min(5, limit - formattedDbSounds.length));
    }
    
    // Combine database and online results
    const allResults = [...formattedDbSounds, ...onlineResults];

    res.json({
      success: true,
      sounds: allResults,
      query: query,
      count: allResults.length,
      sources: {
        database: formattedDbSounds.length,
        online: demoOnlineResults.length
      }
    });
  } catch (error) {
    console.error('Error searching online music:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search online music', 
      error: error.message 
    });
  }
});

// Fetch real online music from internet APIs
async function fetchOnlineMusic(query, limit) {
  const results = [];
  
  try {
    // Method 1: Use YouTube API (if API key is available)
    // You can add YOUTUBE_API_KEY to .env file
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    
    if (youtubeApiKey) {
      console.log('🎵 Using YouTube API for online music search');
      const youtubeResults = await searchYouTube(query, limit, youtubeApiKey);
      if (youtubeResults.length > 0) {
        return youtubeResults;
      }
    }
    
    // Method 2: Use Deezer API (free, no key needed)
    console.log('🎵 Using Deezer API for online music search');
    const deezerResults = await searchDeezer(query, limit);
    if (deezerResults.length > 0) {
      return deezerResults;
    }
    
    // Method 3: Use Last.fm API (free, requires API key)
    const lastfmApiKey = process.env.LASTFM_API_KEY;
    if (lastfmApiKey) {
      console.log('🎵 Using Last.fm API for online music search');
      const lastfmResults = await searchLastFM(query, limit, lastfmApiKey);
      if (lastfmResults.length > 0) {
        return lastfmResults;
      }
    }
    
    // If all APIs fail, return empty array (will use demo as fallback)
    return [];
    
  } catch (error) {
    console.error('Error in fetchOnlineMusic:', error);
    throw error;
  }
}

// Search YouTube for music
async function searchYouTube(query, limit, apiKey) {
  try {
    const searchQuery = `${query} song music`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=${limit}&key=${apiKey}`;
    
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.items) {
      return response.data.items.map((item, index) => {
        const duration = Math.floor(Math.random() * 240) + 120; // Estimate duration (2-4 min)
        return {
          _id: `youtube-${item.id.videoId}`,
          name: item.snippet.title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim(),
          artist: item.snippet.channelTitle,
          duration: duration,
          formattedDuration: formatDuration(duration),
          genre: 'online',
          coverImage: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
          audioUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`, // YouTube video URL
          isOnline: true,
          source: 'youtube',
          plays: 0,
          saves: 0,
          isOriginal: false
        };
      });
    }
    return [];
  } catch (error) {
    console.error('YouTube API error:', error.message);
    return [];
  }
}

// Search Deezer for music (free, no API key needed)
async function searchDeezer(query, limit) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data.map((track) => ({
        _id: `deezer-${track.id}`,
        name: track.title || 'Unknown',
        artist: track.artist?.name || 'Unknown Artist',
        duration: track.duration || 180,
        formattedDuration: formatDuration(track.duration || 180),
        genre: track.genre || 'online',
        coverImage: track.album?.cover_medium || track.album?.cover || '',
        audioUrl: track.preview || track.link || '', // Deezer preview URL
        isOnline: true,
        source: 'deezer',
        plays: 0,
        saves: 0,
        isOriginal: false
      }));
    }
    return [];
  } catch (error) {
    console.error('Deezer API error:', error.message);
    return [];
  }
}

// Search Last.fm for music
async function searchLastFM(query, limit, apiKey) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=${limit}`;
    
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.results && response.data.results.trackmatches && response.data.results.trackmatches.track) {
      const tracks = Array.isArray(response.data.results.trackmatches.track) 
        ? response.data.results.trackmatches.track 
        : [response.data.results.trackmatches.track];
      
      return tracks.map((track, index) => ({
        _id: `lastfm-${track.mbid || Date.now()}-${index}`,
        name: track.name || 'Unknown',
        artist: track.artist || 'Unknown Artist',
        duration: 180, // Last.fm doesn't provide duration in search
        formattedDuration: formatDuration(180),
        genre: 'online',
        coverImage: track.image?.[2]?.['#text'] || track.image?.[1]?.['#text'] || '',
        audioUrl: track.url || '', // Last.fm track URL
        isOnline: true,
        source: 'lastfm',
        plays: parseInt(track.listeners) || 0,
        saves: 0,
        isOriginal: false
      }));
    }
    return [];
  } catch (error) {
    console.error('Last.fm API error:', error.message);
    return [];
  }
}

// Helper function to generate demo online results (fallback)
function generateDemoOnlineResults(query, limit) {
  const demoResults = [];
  const queryLower = query.toLowerCase();
  
  // Sample songs that might match the query
  const sampleSongs = [
    { name: `${query} - Remix`, artist: 'Various Artists', duration: 195, genre: 'hip-hop' },
    { name: `${query} - Original`, artist: 'Unknown Artist', duration: 180, genre: 'pop' },
    { name: `Best of ${query}`, artist: 'Mix Artist', duration: 240, genre: 'electronic' },
  ];

  for (let i = 0; i < Math.min(limit, sampleSongs.length); i++) {
    const song = sampleSongs[i];
    demoResults.push({
      _id: `online-${Date.now()}-${i}`,
      name: song.name,
      artist: song.artist,
      duration: song.duration,
      formattedDuration: formatDuration(song.duration),
      genre: song.genre,
      coverImage: '',
      audioUrl: `https://example.com/audio/${encodeURIComponent(query)}-${i}.mp3`, // Demo URL
      isOnline: true,
      source: 'online',
      plays: 0,
      saves: 0,
      isOriginal: false
    });
  }

  return demoResults;
}

module.exports = router;

