import api from '../config/axios';

// ==================== DRAFTS ====================

// Save video as draft
export const saveDraft = async (draftData) => {
  const response = await api.post('/api/drafts/save', draftData);
  return response.data;
};

// Get all drafts
export const getDrafts = async () => {
  const response = await api.get('/api/drafts');
  return response.data;
};

// Get draft by ID
export const getDraftById = async (draftId) => {
  const response = await api.get(`/api/drafts/${draftId}`);
  return response.data;
};

// Update draft
export const updateDraft = async (draftId, draftData) => {
  const response = await api.put(`/api/drafts/${draftId}`, draftData);
  return response.data;
};

// Delete draft
export const deleteDraft = async (draftId) => {
  const response = await api.delete(`/api/drafts/${draftId}`);
  return response.data;
};

// Publish draft
export const publishDraft = async (draftId) => {
  const response = await api.post(`/api/drafts/${draftId}/publish`);
  return response.data;
};

// ==================== SCHEDULING ====================

// Schedule video
export const scheduleVideo = async (scheduleData) => {
  const response = await api.post('/api/drafts/schedule', scheduleData);
  return response.data;
};

// Get scheduled videos
export const getScheduledVideos = async () => {
  const response = await api.get('/api/drafts/scheduled');
  return response.data;
};

// Update scheduled video
export const updateScheduledVideo = async (videoId, scheduleData) => {
  const response = await api.put(`/api/drafts/scheduled/${videoId}`, scheduleData);
  return response.data;
};

// Cancel scheduled video
export const cancelScheduledVideo = async (videoId, action = 'cancel') => {
  const response = await api.delete(`/api/drafts/scheduled/${videoId}?action=${action}`);
  return response.data;
};

