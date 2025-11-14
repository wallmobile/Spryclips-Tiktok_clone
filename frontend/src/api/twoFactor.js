import api from '../config/axios';

export const getTwoFactorStatus = async () => {
  const response = await api.get('/api/2fa/status');
  return response.data;
};

export const generateTwoFactorSecret = async () => {
  const response = await api.post('/api/2fa/generate');
  return response.data;
};

export const verifyTwoFactorToken = async ({ token, backupCode }) => {
  const response = await api.post('/api/2fa/verify', { token, backupCode });
  return response.data;
};

export const disableTwoFactor = async ({ token, backupCode, password }) => {
  const response = await api.post('/api/2fa/disable', { token, backupCode, password });
  return response.data;
};

export const regenerateBackupCodes = async ({ password }) => {
  const response = await api.post('/api/2fa/regenerate-backup-codes', { password });
  return response.data;
};

