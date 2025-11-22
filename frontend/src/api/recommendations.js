import api from '../config/axios';

// ==================== RECOMMENDATIONS ====================

// Get recommended videos
export const getRecommendedVideos = async (params = {}) => {
  const response = await api.get('/api/recommendations/videos', { params });
  return response.data;
};

// Get For You feed
export const getForYouFeed = async (params = {}) => {
  const response = await api.get('/api/recommendations/for-you', { params });
  return response.data;
};

// Get Following feed
export const getFollowingFeed = async (params = {}) => {
  const response = await api.get('/api/recommendations/following', { params });
  return response.data;
};

// Get trending videos
export const getTrendingVideos = async (params = {}) => {
  const response = await api.get('/api/recommendations/trending', { params });
  return response.data;
};

