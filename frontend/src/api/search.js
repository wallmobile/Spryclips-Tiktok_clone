import api from '../config/axios';

// ==================== GLOBAL SEARCH ====================

// Search everything (videos, users, hashtags, music)
export const searchAll = async (query, params = {}) => {
  const response = await api.get(`/api/search/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Search videos only
export const searchVideos = async (query, params = {}) => {
  const response = await api.get(`/api/search/videos/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Search users only
export const searchUsers = async (query, params = {}) => {
  const response = await api.get(`/api/search/users/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Search hashtags only
export const searchHashtags = async (query, params = {}) => {
  const response = await api.get(`/api/search/hashtags/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Search music/sounds
export const searchMusic = async (query, params = {}) => {
  const response = await api.get(`/api/search/music/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// ==================== TRENDING SEARCHES ====================

// Get trending searches
export const getTrendingSearches = async (limit = 20) => {
  const response = await api.get('/api/search/trending', { params: { limit } });
  return response.data;
};

// Get search suggestions
export const getSearchSuggestions = async (query) => {
  const response = await api.get(`/api/search/suggestions/${encodeURIComponent(query)}`);
  return response.data;
};

// Get search history
export const getSearchHistory = async () => {
  const response = await api.get('/api/search/history');
  return response.data;
};

// Clear search history
export const clearSearchHistory = async () => {
  const response = await api.delete('/api/search/history');
  return response.data;
};

// Delete search history item
export const deleteSearchHistoryItem = async (searchId) => {
  const response = await api.delete(`/api/search/history/${searchId}`);
  return response.data;
};
