import api from '../config/axios';

// ==================== MODERATION RULES ====================

// Get moderation rules (admin only)
export const getModerationRules = async () => {
  const response = await api.get('/api/moderation/rules');
  return response.data;
};

// Create moderation rule (admin only)
export const createModerationRule = async (data) => {
  const response = await api.post('/api/moderation/rules', data);
  return response.data;
};

// Update moderation rule (admin only)
export const updateModerationRule = async (id, data) => {
  const response = await api.put(`/api/moderation/rules/${id}`, data);
  return response.data;
};

// Delete moderation rule (admin only)
export const deleteModerationRule = async (id) => {
  const response = await api.delete(`/api/moderation/rules/${id}`);
  return response.data;
};

// ==================== REPORT CONTENT ====================

// Report video
export const reportVideo = async (videoId, reason, details = {}) => {
  const response = await api.post(`/api/moderation/report/video/${videoId}`, { reason, ...details });
  return response.data;
};

// Report comment
export const reportComment = async (commentId, reason, details = {}) => {
  const response = await api.post(`/api/moderation/report/comment/${commentId}`, { reason, ...details });
  return response.data;
};

// Report user
export const reportUser = async (userId, reason, details = {}) => {
  const response = await api.post(`/api/moderation/report/user/${userId}`, { reason, ...details });
  return response.data;
};

// Get my reports
export const getMyReports = async () => {
  const response = await api.get('/api/moderation/reports/my');
  return response.data;
};

// ==================== MODERATION LOGS (admin only) ====================

// Get moderation logs
export const getModerationLogs = async (params = {}) => {
  const response = await api.get('/api/moderation/logs', { params });
  return response.data;
};

// Get moderation log by ID
export const getModerationLog = async (id) => {
  const response = await api.get(`/api/moderation/logs/${id}`);
  return response.data;
};

// ==================== AGE VERIFICATION ====================

// Submit age verification
export const submitAgeVerification = async (data) => {
  const response = await api.post('/api/moderation/age-verification', data);
  return response.data;
};

// Get age verification status
export const getAgeVerificationStatus = async () => {
  const response = await api.get('/api/moderation/age-verification');
  return response.data;
};
