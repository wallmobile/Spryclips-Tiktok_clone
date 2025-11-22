import api from '../config/axios';

// ==================== DUET ====================

// Create duet
export const createDuet = async (duetData) => {
  const response = await api.post('/api/video-interactions/duet', duetData);
  return response.data;
};

// Get duets of video
export const getDuets = async (videoId, params = {}) => {
  const response = await api.get(`/api/video-interactions/${videoId}/duets`, { params });
  return response.data;
};

// Toggle duet permission
export const toggleDuetPermission = async (videoId, duetDisabled) => {
  const response = await api.put(`/api/video-interactions/${videoId}/duet-permission`, { duetDisabled });
  return response.data;
};

// ==================== STITCH ====================

// Create stitch
export const createStitch = async (stitchData) => {
  const response = await api.post('/api/video-interactions/stitch', stitchData);
  return response.data;
};

// Get stitches of video
export const getStitches = async (videoId, params = {}) => {
  const response = await api.get(`/api/video-interactions/${videoId}/stitches`, { params });
  return response.data;
};

// Toggle stitch permission
export const toggleStitchPermission = async (videoId, stitchDisabled) => {
  const response = await api.put(`/api/video-interactions/${videoId}/stitch-permission`, { stitchDisabled });
  return response.data;
};

