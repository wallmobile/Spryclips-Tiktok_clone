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
        return parsed && parsed._id ? parsed : null;
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

  const fetchCurrentUser = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        console.debug('Auth check timeout - keeping cached user');
        // DON'T remove user on timeout - keep cached user
        setLoading(false);
      }
    }, 5000); // 5 second timeout
    
    try {
      const response = await api.get('/api/auth/verify');
      clearTimeout(timeoutId);
      if (isMountedRef.current && response?.data?.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error?.response?.status !== 401) {
        console.debug('Auth verification failed', error);
      }
      // Only clear user if it's a 401 (unauthorized)
      if (isMountedRef.current && error?.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      // For other errors (network, timeout), keep cached user
    } finally {
      clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Verify in background without blocking UI
    // If user is cached, don't show loading - verify silently
    fetchCurrentUser(false);
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      setAuthenticating(true);
      console.log('Attempting login with email:', email);
      const response = await api.post('/api/auth/login', { email, password });
      if (response?.data?.user) {
        setUser(response.data.user);
        // Save user to localStorage for persistence across refreshes
        localStorage.setItem('user', JSON.stringify(response.data.user));
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
      
      if (error?.response?.data) {
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
      if (response?.data?.user) {
        setUser(response.data.user);
        // Save user to localStorage for persistence across refreshes
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return { success: true };
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












