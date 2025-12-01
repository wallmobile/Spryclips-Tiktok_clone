import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';
import ForgotPasswordModal from './ForgotPasswordModal';

const Login = ({ onClose, onSwitchToSignup }) => {
  useEffect(() => {
    // Check if we're on a standalone route (not a modal)
    const isStandaloneRoute = window.location.pathname === '/login' || window.location.pathname === '/signup';
    
    const sidebar = document.querySelector('.sidebar');
    const previousBodyOverflow = document.body.style.overflow || '';
    const previousHtmlOverflow = document.documentElement.style.overflow || '';

    // Only manipulate DOM if NOT on standalone route (i.e., if it's a modal)
    if (!isStandaloneRoute) {
      document.body.classList.add('signup-page-open');
      document.documentElement.classList.add('signup-page-open');
      if (sidebar) {
        sidebar.classList.add('page-open');
      }
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (!isStandaloneRoute) {
        document.body.classList.remove('signup-page-open');
        document.documentElement.classList.remove('signup-page-open');
        if (sidebar) {
          sidebar.classList.remove('page-open');
        }
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isMountedRef = useRef(true);
  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const { login } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Sync DOM values to React state (for browser automation compatibility)
  useEffect(() => {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    
    if (emailInput && passwordInput) {
      const checkAndSync = () => {
        const emailValue = emailInput.value || '';
        const passwordValue = passwordInput.value || '';
        
        setFormState(prev => {
          // Only update if values actually changed (prevents infinite loops)
          if (prev.email !== emailValue || prev.password !== passwordValue) {
            return { email: emailValue, password: passwordValue };
          }
          return prev;
        });
      };

      // Check on mount and periodically
      checkAndSync();
      const interval = setInterval(checkAndSync, 200);
      
      // Also listen to input events
      emailInput.addEventListener('input', checkAndSync);
      passwordInput.addEventListener('input', checkAndSync);
      
      return () => {
        clearInterval(interval);
        emailInput.removeEventListener('input', checkAndSync);
        passwordInput.removeEventListener('input', checkAndSync);
      };
    }
  }, []); // Empty dependency array - only run on mount

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get values from formState, fallback to DOM if formState is empty (for browser automation)
      const emailInput = document.getElementById('login-email');
      const passwordInput = document.getElementById('login-password');
      const email = formState.email?.trim() || emailInput?.value?.trim() || '';
      const password = formState.password || passwordInput?.value || '';

      if (!email || !password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Client-side email validation - MUST be valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address (e.g., yourname@example.com)');
        setLoading(false);
        return;
      }

      // Call login function - it handles errors internally and returns { success, message }
      console.log('Attempting login for email:', email);
      const result = await login(email, password);
      console.log('Login result:', result);

      // Always reset loading state
      setLoading(false);

      if (result && result.success) {
        console.log('Login successful, closing modal');
        onClose();
      } else {
        // Show the error message from backend
        const errorMsg = result?.message || 'Login failed. Please check your credentials and try again.';
        setError(errorMsg);
        console.error('Login failed:', errorMsg, result);
      }
    } catch (err) {
      console.error('Login error:', err);
      // Always reset loading state on error
      setLoading(false);
      
      // Extract error message from various possible locations
      let errorMsg = 
        err?.response?.data?.message ||
        err?.response?.data?.userMessage ||
        err?.message ||
        'An unexpected error occurred. Please try again.';
      
      // Check for network/timeout errors
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMsg = 'Request timed out. Please check if the backend server is running and try again.';
      } else if (err?.message?.includes('Network Error') || err?.code === 'ERR_NETWORK') {
        errorMsg = 'Network error. Please check your internet connection and ensure the backend server is running.';
      }
      
      setError(errorMsg);
    }
  };

  return (
    <div className="tiktok-signup-container">
      <button 
        className="close-btn-tiktok" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onClose && typeof onClose === 'function') {
            onClose();
          }
        }} 
        aria-label="Close login dialog"
        type="button"
      >
        ×
      </button>

      <div className="signup-left">
        <div className="hero-animation" aria-hidden="true">
          <div className="floating-videos">
            <div className="video-bubble" />
            <div className="video-bubble" />
            <div className="video-bubble" />
            <div className="video-bubble" />
          </div>
        </div>
      </div>

      <div className="signup-right">
        <div className="tiktok-logo-container">
          <div className="tiktok-logo-text">TikTok</div>
        </div>

        <h2 className="signup-heading">Log in to TikTok</h2>
        <p className="auth-subheading">Enter your credentials or continue with a connected account.</p>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tiktok-auth-form" noValidate>
          <div className="form-group-tiktok">
            <label htmlFor="login-email" className="input-label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={formState.email}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, email: e.target.value }));
                setError('');
              }}
              required
              placeholder="you@example.com"
              className="tiktok-input"
            />
          </div>

          <div className="form-group-tiktok">
            <label htmlFor="login-password" className="input-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={formState.password}
              onChange={(e) => {
                setFormState((prev) => ({ ...prev, password: e.target.value }));
                setError('');
              }}
              required
              placeholder="Your password"
              className="tiktok-input"
            />
            <button
              type="button"
              className="auth-forgot-password"
              onClick={() => {
                setError('');
                setShowForgotPassword(true);
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="tiktok-gradient-btn"
            disabled={loading || (!formState.email?.trim() && !document.getElementById('login-email')?.value?.trim()) || (!formState.password?.trim() && !document.getElementById('login-password')?.value?.trim())}
          >
            {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>

      </div>

      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
    </div>
  );
};

export default Login;













