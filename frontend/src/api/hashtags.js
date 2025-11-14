import api from '../config/axios';

// ==================== HASHTAGS ====================

// Get trending hashtags
export const getTrendingHashtags = async (limit = 50) => {
  const response = await api.get('/api/hashtags/trending', { params: { limit } });
  return response.data;
};

// Search hashtags
export const searchHashtags = async (query, params = {}) => {
  const response = await api.get(`/api/hashtags/search/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Get hashtag details
export const getHashtagDetails = async (hashtag) => {
  const response = await api.get(`/api/hashtags/${encodeURIComponent(hashtag)}`);
  return response.data;
};

// Get videos by hashtag
export const getHashtagVideos = async (hashtag, params = {}) => {
  const response = await api.get(`/api/hashtags/${encodeURIComponent(hashtag)}/videos`, { params });
  return response.data;
};

// ==================== HASHTAG CHALLENGES ====================

// Get all challenges
export const getAllChallenges = async (params = {}) => {
  const response = await api.get('/api/hashtags/challenges', { params });
  return response.data;
};

// Get trending challenges
export const getTrendingChallenges = async (limit = 20) => {
  const response = await api.get('/api/hashtags/challenges/trending', { params: { limit } });
  return response.data;
};

// Get challenge by ID
export const getChallenge = async (challengeId) => {
  const response = await api.get(`/api/hashtags/challenges/${challengeId}`);
  return response.data;
};

// Get challenge videos
export const getChallengeVideos = async (challengeId, params = {}) => {
  const response = await api.get(`/api/hashtags/challenges/${challengeId}/videos`, { params });
  return response.data;
};

// Join challenge (when uploading video with challenge hashtag)
export const joinChallenge = async (challengeId, videoId) => {
  const response = await api.post(`/api/hashtags/challenges/${challengeId}/join`, { videoId });
  return response.data;
};

// Get user's challenge participations
export const getMyChallengeParticipations = async () => {
  const response = await api.get('/api/hashtags/challenges/my');
  return response.data;
};
