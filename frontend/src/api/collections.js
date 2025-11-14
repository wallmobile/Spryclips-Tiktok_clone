import api from '../config/axios';

// ==================== PLAYLISTS ====================

// Create playlist
export const createPlaylist = async (data) => {
  const response = await api.post('/api/collections/playlists', data);
  return response.data;
};

// Get user's playlists
export const getMyPlaylists = async () => {
  const response = await api.get('/api/collections/playlists/my');
  return response.data;
};

// Get playlist by ID
export const getPlaylist = async (id) => {
  const response = await api.get(`/api/collections/playlists/${id}`);
  return response.data;
};

// Update playlist
export const updatePlaylist = async (id, data) => {
  const response = await api.put(`/api/collections/playlists/${id}`, data);
  return response.data;
};

// Delete playlist
export const deletePlaylist = async (id) => {
  const response = await api.delete(`/api/collections/playlists/${id}`);
  return response.data;
};

// Add video to playlist
export const addVideoToPlaylist = async (playlistId, videoId) => {
  const response = await api.post(`/api/collections/playlists/${playlistId}/videos`, { videoId });
  return response.data;
};

// Remove video from playlist
export const removeVideoFromPlaylist = async (playlistId, videoId) => {
  const response = await api.delete(`/api/collections/playlists/${playlistId}/videos/${videoId}`);
  return response.data;
};

// Reorder videos in playlist
export const reorderPlaylistVideos = async (playlistId, videoIds) => {
  const response = await api.put(`/api/collections/playlists/${playlistId}/reorder`, { videoIds });
  return response.data;
};

// ==================== VIDEO SERIES ====================

// Create video series
export const createVideoSeries = async (data) => {
  const response = await api.post('/api/collections/series', data);
  return response.data;
};

// Get user's video series
export const getMyVideoSeries = async () => {
  const response = await api.get('/api/collections/series');
  return response.data;
};

// Get video series by ID
export const getVideoSeries = async (id) => {
  const response = await api.get(`/api/collections/series/${id}`);
  return response.data;
};

// Update video series
export const updateVideoSeries = async (id, data) => {
  const response = await api.put(`/api/collections/series/${id}`, data);
  return response.data;
};

// Delete video series
export const deleteVideoSeries = async (id) => {
  const response = await api.delete(`/api/collections/series/${id}`);
  return response.data;
};

// Add episode to series
export const addEpisodeToSeries = async (seriesId, videoId, episodeNumber) => {
  const response = await api.post(`/api/collections/series/${seriesId}/episodes`, { videoId, episodeNumber });
  return response.data;
};

// ==================== COLLECTIONS ====================

// Create collection
export const createCollection = async (data) => {
  const response = await api.post('/api/collections', data);
  return response.data;
};

// Get user's collections
export const getMyCollections = async () => {
  const response = await api.get('/api/collections');
  return response.data;
};

// Get collection by ID
export const getCollection = async (id) => {
  const response = await api.get(`/api/collections/${id}`);
  return response.data;
};

// Update collection
export const updateCollection = async (id, data) => {
  const response = await api.put(`/api/collections/${id}`, data);
  return response.data;
};

// Delete collection
export const deleteCollection = async (id) => {
  const response = await api.delete(`/api/collections/${id}`);
  return response.data;
};

// Add video to collection
export const addVideoToCollection = async (collectionId, videoId) => {
  const response = await api.post(`/api/collections/${collectionId}/videos`, { videoId });
  return response.data;
};

// Remove video from collection
export const removeVideoFromCollection = async (collectionId, videoId) => {
  const response = await api.delete(`/api/collections/${collectionId}/videos/${videoId}`);
  return response.data;
};

// ==================== WATCH LATER ====================

// Add video to watch later
export const addToWatchLater = async (videoId) => {
  const response = await api.post('/api/collections/watch-later', { videoId });
  return response.data;
};

// Get watch later videos
export const getWatchLater = async () => {
  const response = await api.get('/api/collections/watch-later');
  return response.data;
};

// Remove video from watch later
export const removeFromWatchLater = async (videoId) => {
  const response = await api.delete(`/api/collections/watch-later/${videoId}`);
  return response.data;
};

// Clear watch later
export const clearWatchLater = async () => {
  const response = await api.delete('/api/collections/watch-later');
  return response.data;
};
