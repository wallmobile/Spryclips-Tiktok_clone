import api from '../config/axios';

// ==================== DUET ====================

// Create duet
export const createDuet = async (originalVideoId, data) => {
  const response = await api.post(`/api/video-features/duet/${originalVideoId}`, data);
  return response.data;
};

// Get duet by original video
export const getDuetsByVideo = async (videoId, params = {}) => {
  const response = await api.get(`/api/video-features/duet/${videoId}`, { params });
  return response.data;
};

// Get duet by ID
export const getDuet = async (duetId) => {
  const response = await api.get(`/api/video-features/duet/detail/${duetId}`);
  return response.data;
};

// Delete duet
export const deleteDuet = async (duetId) => {
  const response = await api.delete(`/api/video-features/duet/${duetId}`);
  return response.data;
};

// ==================== STITCH ====================

// Create stitch
export const createStitch = async (originalVideoId, data) => {
  const response = await api.post(`/api/video-features/stitch/${originalVideoId}`, data);
  return response.data;
};

// Get stitches by video
export const getStitchesByVideo = async (videoId, params = {}) => {
  const response = await api.get(`/api/video-features/stitch/${videoId}`, { params });
  return response.data;
};

// Get stitch by ID
export const getStitch = async (stitchId) => {
  const response = await api.get(`/api/video-features/stitch/detail/${stitchId}`);
  return response.data;
};

// Delete stitch
export const deleteStitch = async (stitchId) => {
  const response = await api.delete(`/api/video-features/stitch/${stitchId}`);
  return response.data;
};

// ==================== REACTIONS ====================

// Add reaction to video
export const addReaction = async (videoId, reactionType, data = {}) => {
  const response = await api.post(`/api/video-features/reactions/${videoId}`, { reactionType, ...data });
  return response.data;
};

// Remove reaction from video
export const removeReaction = async (videoId, reactionId) => {
  const response = await api.delete(`/api/video-features/reactions/${videoId}/${reactionId}`);
  return response.data;
};

// Get reactions for video
export const getVideoReactions = async (videoId, params = {}) => {
  const response = await api.get(`/api/video-features/reactions/${videoId}`, { params });
  return response.data;
};

// Get my reactions
export const getMyReactions = async () => {
  const response = await api.get('/api/video-features/reactions/my');
  return response.data;
};

// ==================== VIEW TRACKING ====================

// Track video view
export const trackVideoView = async (videoId, data = {}) => {
  const response = await api.post(`/api/video-features/views/${videoId}`, data);
  return response.data;
};

// Get video view count
export const getVideoViews = async (videoId) => {
  const response = await api.get(`/api/video-features/views/${videoId}`);
  return response.data;
};

// ==================== VIDEO DOWNLOAD ====================

// Get download URL for video
export const getVideoDownloadUrl = async (videoId) => {
  const response = await api.get(`/api/video-features/download/${videoId}`);
  return response.data;
};

// Download video (creates download link)
export const downloadVideo = async (videoId) => {
  const response = await api.post(`/api/video-features/download/${videoId}`);
  return response.data;
};
