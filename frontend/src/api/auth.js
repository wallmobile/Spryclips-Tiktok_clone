import api from '../config/axios';

// ==================== AUTHENTICATION ====================

// Register
export const register = async (userData) => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

// Login
export const login = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

// OIDC Login
export const oidcLogin = async (idToken, providerId) => {
  const response = await api.post('/api/auth/oidc/login', { id_token: idToken, providerId });
  return response.data;
};

// Verify token
export const verifyToken = async () => {
  const response = await api.get('/api/auth/verify');
  return response.data;
};

// ==================== PASSWORD MANAGEMENT ====================

// Forgot password
export const forgotPassword = async (email) => {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
};

// Reset password
export const resetPassword = async (token, newPassword) => {
  const response = await api.post('/api/auth/reset-password', { token, newPassword });
  return response.data;
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/api/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

// ==================== EMAIL VERIFICATION ====================

// Verify email
export const verifyEmail = async (token) => {
  const response = await api.post('/api/auth/verify-email', { token });
  return response.data;
};

// Resend verification
export const resendVerification = async () => {
  const response = await api.post('/api/auth/resend-verification');
  return response.data;
};
