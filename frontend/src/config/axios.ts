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
  if (isBrowser && window.APP_CONFIG?.API_URL) {
    return window.APP_CONFIG.API_URL;
  }

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (isBrowser && window.location?.origin) {
    const origin = window.location.origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) {
      return 'http://localhost:5000';
    }
    return origin;
  }

  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
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

    if (status === 401 && !originalRequest._retry && !isAuthRefresh && !isAuthVerify) {
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
        // Normalize refresh error to ensure user-friendly message
        if (isAxiosError(refreshError)) {
          // Normalize the error to get the correct userMessage
          const normalized = normalizeAxiosError(refreshError);
          // Attach normalized userMessage to the error object
          (refreshError as any).userMessage = normalized.userMessage;
          // Also update the response data to ensure consistency
          if (refreshError.response?.data && typeof refreshError.response.data === 'object') {
            (refreshError.response.data as any).userMessage = normalized.userMessage;
          }
          
          // Only broadcast refresh errors if they're not expected (e.g., user is logged out)
          if (!hasBeenBroadcast(refreshError)) {
            const refreshStatus = refreshError.response?.status;
            // Don't broadcast 401 for refresh if it's expected (user not logged in)
            if (refreshStatus !== 401) {
              broadcastAxiosError(refreshError);
            }
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Don't broadcast expected 401 errors for auth endpoints
    if (isAxiosError(error) && !hasBeenBroadcast(error) && !shouldSuppress401) {
      // Normalize the error before broadcasting to ensure user-friendly messages
      const normalized = normalizeAxiosError(error);
      // Attach normalized userMessage to the error
      (error as any).userMessage = normalized.userMessage;
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
