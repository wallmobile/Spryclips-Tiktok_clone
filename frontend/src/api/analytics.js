import api from '../config/axios';

// ==================== VIDEO ANALYTICS ====================

// Get video analytics
export const getVideoAnalytics = async (videoId) => {
  const response = await api.get(`/api/analytics/videos/${videoId}`);
  return response.data;
};

// Get video analytics summary
export const getVideoAnalyticsSummary = async (videoId) => {
  const response = await api.get(`/api/analytics/videos/${videoId}/summary`);
  return response.data;
};

// Get video engagement metrics
export const getVideoEngagement = async (videoId) => {
  const response = await api.get(`/api/analytics/videos/${videoId}/engagement`);
  return response.data;
};

// Get video demographics
export const getVideoDemographics = async (videoId) => {
  const response = await api.get(`/api/analytics/videos/${videoId}/demographics`);
  return response.data;
};

// ==================== CREATOR ANALYTICS ====================

// Get creator analytics overview
export const getCreatorAnalytics = async () => {
  const response = await api.get('/api/analytics/creator');
  return response.data;
};

// Get creator analytics summary
export const getCreatorAnalyticsSummary = async () => {
  const response = await api.get('/api/analytics/creator/summary');
  return response.data;
};

// Get all videos analytics
export const getAllVideosAnalytics = async () => {
  const response = await api.get('/api/analytics/videos');
  return response.data;
};

// Get top performing videos
export const getTopVideos = async (limit = 10, sortBy = 'views') => {
  const response = await api.get('/api/analytics/videos/top', {
    params: { limit, sortBy }
  });
  return response.data;
};

// ==================== AUDIENCE ANALYTICS ====================

// Get audience overview
export const getAudienceOverview = async () => {
  const response = await api.get('/api/analytics/audience');
  return response.data;
};

// Get audience growth
export const getAudienceGrowth = async () => {
  const response = await api.get('/api/analytics/audience/growth');
  return response.data;
};

// Get audience demographics
export const getAudienceDemographics = async () => {
  const response = await api.get('/api/analytics/audience/demographics');
  return response.data;
};

// Get audience activity
export const getAudienceActivity = async () => {
  const response = await api.get('/api/analytics/audience/activity');
  return response.data;
};
