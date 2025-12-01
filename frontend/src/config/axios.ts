import axios, { AxiosRequestConfig, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { broadcastAxiosError, normalizeAxiosError } from '../utils/apiError';

declare global {
  interface Window {
    APP_CONFIG?: {
      API_URL?: string;
    };
  }
}

const isBrowser = typeof window !== 'undefined';

const getAPIURL = (): string => {
  // Priority 1: Runtime config from window.APP_CONFIG (set in public/config.js)
  // This should ALWAYS win if set, even if it's an empty string
  if (isBrowser && window.APP_CONFIG && 'API_URL' in window.APP_CONFIG) {
    return window.APP_CONFIG.API_URL || '';
  }

  // Priority 2: Build-time env variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Priority 3: Auto-detect based on current location
  if (isBrowser && window.location?.origin) {
    const origin = window.location.origin;
    // Development mode: use localhost:5000
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) {
      return 'http://localhost:5000';
    }
    // Production mode: use empty string (same origin, nginx proxies /api)
    return '';
  }

  // Fallback
  return '';
};

const API_URL = getAPIURL();

const createClient = (overrides?: Partial<AxiosRequestConfig>) =>
  axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 10000,
    maxRedirects: 3,
    validateStatus: (status) => status >= 200 && status < 300,
    withCredentials: true,
    ...overrides
  });

const api = createClient();
const refreshClient = createClient();

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: RetryableRequestConfig) => {
    config.withCredentials = true;
    return config;
  },
  (requestError) => Promise.reject(requestError)
);

const isAxiosError = (error: unknown): error is AxiosError => axios.isAxiosError(error);
const hasBeenBroadcast = (error: AxiosError & { __broadcasted?: boolean }) =>
  Boolean(error.__broadcasted);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error?.config ?? {}) as RetryableRequestConfig & { url?: string };
    const status = error?.response?.status;
    const isAuthRefresh = originalRequest?.url?.includes('/api/auth/refresh');
    const isAuthVerify = originalRequest?.url?.includes('/api/auth/verify');
    const isAuthLogin = originalRequest?.url?.includes('/api/auth/login');
    const isAuthRegister = originalRequest?.url?.includes('/api/auth/register');

    // Suppress 401 errors for auth endpoints when user is not authenticated (expected behavior)
    const shouldSuppress401 = status === 401 && (
      isAuthVerify || 
      isAuthRefresh ||
      (isAuthLogin && !originalRequest._retry) ||
      (isAuthRegister && !originalRequest._retry)
    );

    // Suppress 404 errors to prevent noise - these are often non-critical
    const shouldSuppress404 = status === 404;
    
    // Suppress 408 timeout errors for analytics endpoints - handled locally
    const isAnalyticsEndpoint = originalRequest?.url?.includes('/api/analytics');
    const shouldSuppress408 = status === 408 && isAnalyticsEndpoint;
    
    // Suppress 400 "Invalid user ID" errors for follow endpoint - handled locally with validation
    const isFollowEndpoint = originalRequest?.url?.includes('/api/users/') && originalRequest?.url?.includes('/follow');
    const isInvalidUserIdError = status === 400 && isFollowEndpoint && 
      (error?.response?.data?.message?.toLowerCase().includes('invalid user id') ||
       error?.response?.data?.message?.toLowerCase().includes('invalid user'));
    const shouldSuppress400Follow = isInvalidUserIdError;

    if (status === 401 && !originalRequest._retry && !isAuthRefresh && !isAuthVerify) {
      // Check if user has any stored auth data - if not, skip refresh attempt
      const hasStoredUser = localStorage.getItem('user');
      if (!hasStoredUser) {
        // No user data - don't try to refresh, just fail immediately
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshClient.post('/api/auth/refresh', {}, { withCredentials: true });
        processQueue();
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Clear stored user on refresh failure
        localStorage.removeItem('user');
        // Only broadcast refresh errors if they're not expected (e.g., user is logged out)
        if (isAxiosError(refreshError) && !hasBeenBroadcast(refreshError)) {
          const refreshStatus = refreshError.response?.status;
          // Don't broadcast 401 for refresh if it's expected (user not logged in)
          if (refreshStatus !== 401) {
            broadcastAxiosError(refreshError);
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Don't broadcast expected 401 errors for auth endpoints, 404 errors, 408 analytics timeouts, or 400 invalid user ID for follow
    if (isAxiosError(error) && !hasBeenBroadcast(error) && !shouldSuppress401 && !shouldSuppress404 && !shouldSuppress408 && !shouldSuppress400Follow) {
      broadcastAxiosError(error);
    }

    return Promise.reject(error);
  }
);

export const refreshSession = async () => {
  const response = await refreshClient.post('/api/auth/refresh', {}, { withCredentials: true });
  return response.data;
};

refreshClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isAxiosError(error) && !hasBeenBroadcast(error)) {
      broadcastAxiosError(error);
    }
    return Promise.reject(error);
  }
);

export { API_URL };

export default api;
