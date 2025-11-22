import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import api, { API_URL } from '../config/axios';

const AuthContext = createContext();
const hasExplicitApiConfig = Boolean(
  (typeof process !== 'undefined' && process.env && typeof process.env.REACT_APP_API_URL === 'string' && process.env.REACT_APP_API_URL.trim().length > 0) ||
  (typeof window !== 'undefined' && window.APP_CONFIG && typeof window.APP_CONFIG.API_URL === 'string' && window.APP_CONFIG.API_URL.trim().length > 0)
);
const assumeGuestMode = (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && API_URL === window.location.origin) || !hasExplicitApiConfig;
let skipAuthVerify = assumeGuestMode;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const isMountedRef = useRef(true);

  const fetchCurrentUser = async () => {
    if (skipAuthVerify) {
      if (isMountedRef.current) {
        setUser(null);
        setLoading(false);
      }
      return;
    }
    
    // Add timeout to prevent infinite loading - reduced to 3 seconds for faster UX
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Auth verification timeout'));
      }, 3000); // 3 second timeout for faster UX
    });
    
    try {
      const response = await Promise.race([
        api.get('/api/auth/verify'),
        timeoutPromise
      ]);
      if (isMountedRef.current && response?.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.debug('Auth verification failed', error);
      if (!skipAuthVerify) {
        console.info('Auth verification endpoint unavailable, continuing in guest mode.');
        skipAuthVerify = true;
      }
      if (isMountedRef.current) {
        setUser(null);
      }
    } finally {
      // Always set loading to false, even if component unmounted
      if (isMountedRef.current) {
        setLoading(false);
      } else {
        // If component unmounted, still try to set loading (might be needed for cleanup)
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCurrentUser();
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
      }
      skipAuthVerify = false;
      setLoading(true);
      await fetchCurrentUser();
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
      }
      skipAuthVerify = false;
      setLoading(true);
      await fetchCurrentUser();
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
      }
      skipAuthVerify = false;
      setLoading(true);
      await fetchCurrentUser();
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












