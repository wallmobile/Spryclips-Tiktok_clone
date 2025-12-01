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

// Verify reset code (check if code is valid)
export const verifyResetCode = async (code, email) => {
  const response = await api.post('/api/auth/verify-reset-code', { code, email });
  return response.data;
};

// Reset password (accepts code or token for backward compatibility)
export const resetPassword = async (code, newPassword) => {
  const response = await api.post('/api/auth/reset-password', { code, newPassword });
  return response.data;
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/api/auth/change-password', { currentPassword, newPassword });
  return response.data;
};

// ==================== EMAIL VERIFICATION ====================

// Verify email (accepts token for backward compatibility, or code + email)
export const verifyEmail = async (token, code, email) => {
  const payload = {};
  if (code && email) {
    payload.code = code;
    payload.email = email;
  } else if (token) {
    payload.token = token;
  } else {
    throw new Error('Either token or code+email must be provided');
  }
  const response = await api.post('/api/auth/verify-email', payload);
  return response.data;
};

// Resend verification
export const resendVerification = async () => {
  const response = await api.post('/api/auth/resend-verification');
  return response.data;
};

// Send signup verification code (before account creation)
export const sendSignupVerificationCode = async (email) => {
  const response = await api.post('/api/auth/send-signup-verification', { email });
  return response.data;
};

// Verify signup code (before account creation)
export const verifySignupCode = async (email, code) => {
  const response = await api.post('/api/auth/verify-signup-code', { email, code });
  return response.data;
};
