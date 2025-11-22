import api from '../config/axios';

// ==================== CREATOR ACADEMY CONTENT ====================

// Get all academy content
export const getAllAcademyContent = async (params = {}) => {
  const response = await api.get('/api/creator-academy', { params });
  return response.data;
};

// Get academy content by ID
export const getAcademyContent = async (id) => {
  const response = await api.get(`/api/creator-academy/${id}`);
  return response.data;
};

// Search academy content
export const searchAcademyContent = async (query, params = {}) => {
  const response = await api.get(`/api/creator-academy/search/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Get content by category
export const getAcademyContentByCategory = async (category, params = {}) => {
  const response = await api.get(`/api/creator-academy/category/${category}`, { params });
  return response.data;
};

// Mark content as completed
export const markContentCompleted = async (contentId) => {
  const response = await api.post(`/api/creator-academy/${contentId}/complete`);
  return response.data;
};

// Get user's progress
export const getMyAcademyProgress = async () => {
  const response = await api.get('/api/creator-academy/progress');
  return response.data;
};

// ==================== LEARNING PATHS ====================

// Get all learning paths
export const getAllLearningPaths = async () => {
  const response = await api.get('/api/creator-academy/paths');
  return response.data;
};

// Get learning path by ID
export const getLearningPath = async (id) => {
  const response = await api.get(`/api/creator-academy/paths/${id}`);
  return response.data;
};

// Enroll in learning path
export const enrollInLearningPath = async (pathId) => {
  const response = await api.post(`/api/creator-academy/paths/${pathId}/enroll`);
  return response.data;
};

// Get user's enrolled paths
export const getMyEnrolledPaths = async () => {
  const response = await api.get('/api/creator-academy/paths/enrolled');
  return response.data;
};

// Get path progress
export const getPathProgress = async (pathId) => {
  const response = await api.get(`/api/creator-academy/paths/${pathId}/progress`);
  return response.data;
};
