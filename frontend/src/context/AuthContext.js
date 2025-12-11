/**
 * Authentication Context Provider
 * 
 * Recent Changes:
 * - Enhanced user persistence with localStorage
 * - Improved authentication verification flow
 * - Added support for access token storage
 * - Enhanced error handling for login/register
 * - Added timeout protection for auth verification
 * - Improved loading state management
 */

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import api from '../config/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage for instant UI - no loading screen needed
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'null' && savedUser !== 'undefined') {
        const parsed = JSON.parse(savedUser);
        // Normalize user object: ensure _id exists (use id if _id not present)
        if (parsed && (parsed._id || parsed.id)) {
          return {
            ...parsed,
            _id: parsed._id || parsed.id,
            id: parsed.id || parsed._id,
            role: parsed.role || 'user'
          };
        }
        return null;
      }
      return null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  
  // If we have a cached user, start with loading = false (instant UI)
  const [loading, setLoading] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      // If user exists and is valid, don't show loading
      if (savedUser && savedUser !== 'null' && savedUser !== 'undefined') {
        const parsed = JSON.parse(savedUser);
        return !(parsed && parsed._id);
      }
      return true;
    } catch {
      return true;
    }
  });
  
  const [authenticating, setAuthenticating] = useState(false);
  const isMountedRef = useRef(true);
  const isVerifyingRef = useRef(false); // Prevent duplicate verify calls
  const hasInitializedRef = useRef(false); // Prevent double initialization in StrictMode

  const fetchCurrentUser = async (showLoading = false) => {
    // Don't call verify on signup/login pages
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === '/login' || currentPath === '/signup';
    
    if (isAuthPage) {
      setLoading(false);
      return;
    }
    
    // Only call verify if user exists in localStorage (has JWT token in cookies from previous login)
    const hasCachedUser = localStorage.getItem('user') && 
                          localStorage.getItem('user') !== 'null' && 
                          localStorage.getItem('user') !== 'undefined';
    
    if (!hasCachedUser) {
      setLoading(false);
      return;
    }
    
    // Prevent duplicate calls (React StrictMode double renders)
    if (isVerifyingRef.current) {
      return;
    }
    
    isVerifyingRef.current = true;
    
    if (showLoading) {
      setLoading(true);
    }
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        console.debug('Auth check timeout - verify request taking too long; keeping cached user until a definitive response');
        // Don't clear cached user on slow responses — keep localStorage.user so UI remains authenticated
        setLoading(false);
      }
      isVerifyingRef.current = false;
    }, 5000); // 5 second timeout
    
    try {
      const response = await api.get('/api/auth/verify');
      clearTimeout(timeoutId);
      if (isMountedRef.current && response?.data?.user) {
        // Normalize user object: ensure _id exists (use id if _id not present)
        const userData = {
          ...response.data.user,
          _id: response.data.user._id || response.data.user.id,
          id: response.data.user.id || response.data.user._id,
          role: response.data.user.role || 'user'
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      // Don't clear user on 401 - might be a temporary network issue
      // Keep the cached user so user doesn't get logged out on refresh
      if (error?.response?.status === 401) {
        // Only clear if we're sure user is not authenticated
        // For now, keep cached user to prevent logout on refresh
        console.debug('Auth verification returned 401, but keeping cached user to prevent logout on refresh');
        // Don't clear user - keep it in localStorage
      } else if (error?.response?.status !== 401) {
        console.debug('Auth verification failed', error);
        // Only clear on non-401 errors (network issues, etc.)
        // But even then, keep cached user if it exists
        // if (isMountedRef.current) {
        //   setUser(null);
        //   localStorage.removeItem('user');
        // }
      }
      // Don't clear user on any error - keep cached user to prevent logout on refresh
    } finally {
      clearTimeout(timeoutId);
      isVerifyingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Prevent double calls in React StrictMode
    if (hasInitializedRef.current) {
      return;
    }
    
    // Check if we're on signup/login page - don't call verify on these pages
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === '/login' || currentPath === '/signup';
    
    // Mark as initialized immediately to prevent duplicate calls
    hasInitializedRef.current = true;
    
    // Only call verify if:
    // 1. We have a cached user in localStorage (meaning user logged in before)
    // 2. We're NOT on auth pages (login/signup)
    const hasCachedUser = localStorage.getItem('user') && 
                          localStorage.getItem('user') !== 'null' && 
                          localStorage.getItem('user') !== 'undefined';
    // If we have an access token stored, ensure axios attaches it immediately
    try {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        api.defaults.headers = api.defaults.headers || {};
        api.defaults.headers.common = api.defaults.headers.common || {};
        api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      }
    } catch (e) {
      // ignore localStorage errors
    }
    
    if (hasCachedUser && !isAuthPage) {
      // Verify in background without blocking UI
      // If user is cached, don't show loading - verify silently
      fetchCurrentUser(false);
    } else {
      // No cached user or on auth page - don't call verify
      setLoading(false);
    }
    
    return () => {
      isMountedRef.current = false;
      hasInitializedRef.current = false; // Reset on unmount for testing
    };
  }, []);

  const login = async (email, password) => {
    try {
      setAuthenticating(true);
      console.log('Attempting login with email:', email);
      const response = await api.post('/api/auth/login', { email, password });
      if (response?.data?.user) {
        // Normalize user object: ensure _id exists (use id if _id not present)
        const userData = {
          ...response.data.user,
          _id: response.data.user._id || response.data.user.id,
          id: response.data.user.id || response.data.user._id,
          role: response.data.user.role || 'user'
        };
        setUser(userData);
        // Save user to localStorage for persistence across refreshes
        localStorage.setItem('user', JSON.stringify(userData));
        // Save access token (if returned) so we can attach it to Authorization header
        const token = response.data.token || response.data.tokens?.accessToken || response.data.accessToken;
        if (token) {
          try { localStorage.setItem('accessToken', token); } catch {};
        }
      }
      console.log('Login successful');
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      // Extract error message from various possible locations
      let message = 'Login failed';
      
      // Check for network errors first
      if (!error.response) {
        if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
          message = 'Network error. Please check your internet connection and ensure the backend server is running.';
        } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
          message = 'Request timed out. Please check if the backend server is running and try again.';
        } else {
          message = error?.message || 'Unable to connect to server. Please try again later.';
        }
      } else if (error?.response?.data) {
        // Check for userMessage first (custom error format)
        message = error.response.data.userMessage || 
                  error.response.data.message || 
                  error.response.data.error ||
                  message;
        
        // If it's a validation error, extract the first error message
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          const firstError = error.response.data.errors[0];
          if (firstError?.msg) {
            message = firstError.msg;
          } else if (firstError?.message) {
            message = firstError.message;
          }
        }
        
        // Handle specific HTTP status codes
        if (error.response.status === 401 || error.response.status === 400) {
          // Already handled by message extraction above
        } else if (error.response.status === 500) {
          message = 'Server error. Please try again later or contact support.';
        } else if (error.response.status === 503) {
          message = 'Service temporarily unavailable. Please try again later.';
        }
      } else if (error?.userMessage) {
        message = error.userMessage;
      } else if (error?.message) {
        message = error.message;
      }
      
      return { success: false, message };
    } finally {
      setAuthenticating(false);
    }
  };

  const register = async (username, email, password) => {
    try {
      setAuthenticating(true);
      const response = await api.post('/api/auth/register', { username, email, password });
      
      // Return full response data including verification flags
      const result = {
        success: true,
        requiresEmailVerification: response?.data?.requiresEmailVerification,
        emailVerificationCodeSent: response?.data?.emailVerificationCodeSent,
        message: response?.data?.message
      };
      
      // Only set user if email is already verified (no verification needed)
      // If verification is required, don't set user yet
      if (response?.data?.user && !response?.data?.requiresEmailVerification) {
        setUser(response.data.user);
        // Save user to localStorage for persistence across refreshes
        localStorage.setItem('user', JSON.stringify(response.data.user));
        const token = response.data.token || response.data.tokens?.accessToken || response.data.accessToken;
        if (token) {
          try { localStorage.setItem('accessToken', token); } catch {};
        }
      }
      
      return result;
    } catch (error) {
      const message =
        (typeof error?.userMessage === 'string' && error.userMessage) ||
        error.response?.data?.userMessage ||
        error.response?.data?.details?.[0]?.msg ||
        error.response?.data?.message ||
        'Registration failed';
      
      // Extract field-level validation errors
      const details = error.response?.data?.details || error.response?.data?.errors || [];
      
      return { 
        success: false, 
        message,
        details: Array.isArray(details) ? details : []
      };
    } finally {
      setAuthenticating(false);
    }
  };

  const socialLogin = async (provider, payload) => {
    try {
      setAuthenticating(true);
      const response = await api.post(`/api/auth/social/${provider}`, payload);
      if (response?.data?.user) {
        setUser(response.data.user);
        // Save user to localStorage for persistence across refreshes
        localStorage.setItem('user', JSON.stringify(response.data.user));
        const token = response.data.token || response.data.tokens?.accessToken || response.data.accessToken;
        if (token) {
          try { localStorage.setItem('accessToken', token); } catch {};
        }
      }
      return { success: true, message: response?.data?.message || `${provider} sign-in successful` };
    } catch (error) {
      const message =
        (typeof error?.userMessage === 'string' && error.userMessage) ||
        error.response?.data?.userMessage ||
        error.response?.data?.message ||
        `${provider} login failed. Please try again.`;
      return { success: false, message };
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.debug('Logout request failed', error);
    } finally {
      setUser(null);
      // Clear user from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    authenticating,
    login,
    register,
    socialLogin,
    logout,
    updateUser,
    isAuthenticated: !!user,
    refreshUser: fetchCurrentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};












