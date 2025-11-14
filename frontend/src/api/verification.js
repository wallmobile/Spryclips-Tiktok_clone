import api from '../config/axios';

// ==================== CREATOR VERIFICATION ====================

export const getVerificationStatus = async () => {
  const response = await api.get('/api/verification/status');
  return response.data;
};

export const requestVerification = async (formData) => {
  const response = await api.post('/api/verification/request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ==================== ADMIN VERIFICATION MANAGEMENT ====================

export const getPendingVerifications = async () => {
  const response = await api.get('/api/verification/pending');
  return response.data;
};

export const approveVerification = async (verificationId, payload = {}) => {
  const response = await api.post(`/api/verification/${verificationId}/approve`, payload);
  return response.data;
};

export const rejectVerification = async (verificationId, payload) => {
  const response = await api.post(`/api/verification/${verificationId}/reject`, payload);
  return response.data;
};

const verificationApi = {
  getVerificationStatus,
  requestVerification,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
};

export default verificationApi;

