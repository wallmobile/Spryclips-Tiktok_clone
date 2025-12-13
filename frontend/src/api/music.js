import api from '../config/axios';

// ==================== GET TRENDING SOUNDS ====================
export const getTrendingSounds = async (limit = 20, category = 'all') => {
  try {
    const response = await api.get('/api/music/trending', {
      params: { limit, category }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching trending sounds:', error);
    throw error;
  }
};

// ==================== SEARCH SOUNDS ====================
export const searchSounds = async (query, limit = 20, category = 'all') => {
  try {
    const response = await api.get('/api/music/search', {
      params: { q: query, limit, category }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching sounds:', error);
    throw error;
  }
};

// ==================== GET SOUND BY ID ====================
export const getSoundById = async (soundId) => {
  try {
    const response = await api.get(`/api/music/${soundId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sound:', error);
    throw error;
  }
};

// ==================== SAVE SOUND TO LIBRARY ====================
export const saveSoundToLibrary = async (soundId) => {
  try {
    const response = await api.post('/api/music/save', { soundId });
    return response.data;
  } catch (error) {
    console.error('Error saving sound:', error);
    throw error;
  }
};

// ==================== REMOVE SOUND FROM LIBRARY ====================
export const removeSoundFromLibrary = async (soundId) => {
  try {
    const response = await api.delete(`/api/music/unsave/${soundId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing sound:', error);
    throw error;
  }
};

// ==================== GET USER'S SAVED SOUNDS ====================
export const getMySavedSounds = async () => {
  try {
    const response = await api.get('/api/music/my-sounds');
    return response.data;
  } catch (error) {
    console.error('Error fetching saved sounds:', error);
    throw error;
  }
};

// ==================== EXTRACT AUDIO FROM VIDEO ====================
export const extractAudioFromVideo = async (videoId) => {
  try {
    const response = await api.post('/api/music/extract', { videoId });
    return response.data;
  } catch (error) {
    console.error('Error extracting audio:', error);
    throw error;
  }
};

// ==================== GET SOUNDS BY CATEGORY ====================
export const getSoundsByCategory = async (category, limit = 20) => {
  try {
    const response = await api.get(`/api/music/category/${category}`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sounds by category:', error);
    throw error;
  }
};

// ==================== SEARCH ONLINE MUSIC ====================
export const searchOnlineMusic = async (query, limit = 20) => {
  try {
    const response = await api.get('/api/music/search-online', {
      params: { q: query, limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching online music:', error);
    throw error;
  }
};

