import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocialAuth from '../hooks/useSocialAuth';
import './Auth.css';

const initialFormState = {
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const Signup = ({ onClose, onSwitchToLogin }) => {
  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.classList.add('signup-page-open');
    document.documentElement.classList.add('signup-page-open');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('signup-page-open');
      document.documentElement.classList.remove('signup-page-open');
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const { register } = useAuth();
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { googleReady, facebookReady, startGoogleLogin, startFacebookLogin } = useSocialAuth({
    onSuccess: () => {
      if (isMountedRef.current) {
        setError('');
        setSuccess('Account connected! Redirecting…');
        setSocialLoading(false);
      }
      onClose();
    },
    onError: (message) => {
      if (isMountedRef.current) {
        setSocialLoading(false);
        setError(message);
      }
    }
  });

  const validate = () => {
    const validationErrors = {};
    const username = formData.username.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!username) {
      validationErrors.username = 'Username is required.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      validationErrors.username = 'Use only letters, numbers, or underscores.';
    } else if (username.length < 3) {
      validationErrors.username = 'Username must be at least 3 characters.';
    }

    if (!email) {
      validationErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      validationErrors.password = 'Password is required.';
    } else {
      const passwordChecks = [
        { test: /.{8,}/.test(password), message: '8 characters minimum.' },
        { test: /[A-Z]/.test(password), message: 'One uppercase letter.' },
        { test: /[a-z]/.test(password), message: 'One lowercase letter.' },
        { test: /\d/.test(password), message: 'One number.' },
        { test: /[^A-Za-z0-9]/.test(password), message: 'One special character.' }
      ];
      const failed = passwordChecks.filter((check) => !check.test);
      if (failed.length) {
        validationErrors.password = `Password needs: ${failed.map((f) => f.message).join(' ')}`;
      }
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword = 'Please re-enter your password.';
    } else if (confirmPassword !== password) {
      validationErrors.confirmPassword = 'Passwords do not match.';
    }

    return validationErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setErrors({});
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData.username.trim(), formData.email.trim(), formData.password);

      if (result.success) {
        if (isMountedRef.current) {
          setSuccess('Welcome aboard! Redirecting you to TikTok…');
          setFormData(initialFormState);
          setErrors({});
        }
        setTimeout(() => {
          onClose();
        }, 900);
      } else if (isMountedRef.current) {
        // Extract field-level errors from backend response
        // Backend uses express-validator format: { param: 'fieldName', msg: 'error message' }
        const backendErrors = {};
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((detail) => {
            if (detail.param) {
              // Map backend field names to frontend field names
              const fieldMap = {
                'username': 'username',
                'email': 'email',
                'password': 'password'
              };
              const frontendField = fieldMap[detail.param] || detail.param;
              backendErrors[frontendField] = detail.msg || detail.message;
            }
          });
        }
        
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
        }
        
        // Set general error message
        const errorMessage = result.message || 'Registration failed. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSocialAction = async (provider) => {
    setError('');
    setSuccess('');
    setSocialLoading(true);
    try {
      if (provider === 'google') {
        await startGoogleLogin();
      } else if (provider === 'facebook') {
        await startFacebookLogin();
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Social sign up failed. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setSocialLoading(false);
      }
    }
  };
  const googleButtonTitle = !googleReady
    ? 'Google sign up requires REACT_APP_GOOGLE_CLIENT_ID environment variable'
    : 'Sign up with Google';
  const facebookButtonTitle = !facebookReady
    ? 'Facebook sign up requires REACT_APP_FACEBOOK_APP_ID environment variable'
    : 'Sign up with Facebook';

  return (
    <div className="tiktok-signup-container">
      <button className="close-btn-tiktok" onClick={onClose} aria-label="Close sign up dialog">
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

        <h2 className="signup-heading">Create your TikTok account</h2>
        <p className="auth-subheading">
          Pick a username, add your email, and secure your account. You can always update details later from your profile.
        </p>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="success-box" role="status">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tiktok-auth-form" noValidate>
          <div className="form-group-tiktok">
            <label htmlFor="signup-username" className="input-label">
              Username
            </label>
            <input
              id="signup-username"
              type="text"
              value={formData.username}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, username: e.target.value }));
                if (errors.username) {
                  setErrors((prev) => ({ ...prev, username: '' }));
                }
                setError('');
              }}
              placeholder="awesome_creator"
              className={`tiktok-input ${errors.username ? 'input-invalid' : ''}`}
              required
            />
            {errors.username && <div className="inline-error">{errors.username}</div>}
          </div>

          <div className="form-group-tiktok">
            <label htmlFor="signup-email" className="input-label">
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: '' }));
                }
                setError('');
              }}
              placeholder="you@example.com"
              className={`tiktok-input ${errors.email ? 'input-invalid' : ''}`}
              required
            />
            {errors.email && <div className="inline-error">{errors.email}</div>}
          </div>

          <div className="form-group-tiktok">
            <label htmlFor="signup-password" className="input-label">
              Password
            </label>
            <div className="password-wrapper">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, password: e.target.value }));
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }
                  setError('');
                }}
                placeholder="Create a strong password"
                className={`tiktok-input ${errors.password ? 'input-invalid' : ''}`}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {errors.password && <div className="inline-error">{errors.password}</div>}
            <p className="password-hint">
              Use at least 8 characters with a mix of letters, numbers, and symbols.
            </p>
          </div>

          <div className="form-group-tiktok">
            <label htmlFor="signup-confirm-password" className="input-label">
              Confirm password
            </label>
            <div className="password-wrapper">
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                  setError('');
                }}
                placeholder="Repeat your password"
                className={`tiktok-input ${errors.confirmPassword ? 'input-invalid' : ''}`}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {errors.confirmPassword && <div className="inline-error">{errors.confirmPassword}</div>}
          </div>

          <button
            type="submit"
            className="tiktok-gradient-btn"
            disabled={
              loading ||
              !formData.username.trim() ||
              !formData.email.trim() ||
              !formData.password ||
              !formData.confirmPassword
            }
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <div className="divider-option" aria-hidden="true">
          <span />
          <span>OR</span>
          <span />
        </div>

        <div className="social-login-buttons">
          <button
            type="button"
            className="social-btn google-btn"
            disabled={socialLoading}
            onClick={() => handleSocialAction('google')}
            title={googleButtonTitle}
          >
            <i className="fa-brands fa-google" aria-hidden="true" />
            {socialLoading ? 'Connecting…' : 'Sign up with Google'}
          </button>
          <button
            type="button"
            className="social-btn facebook-btn"
            disabled={socialLoading}
            onClick={() => handleSocialAction('facebook')}
            title={facebookButtonTitle}
          >
            <i className="fa-brands fa-facebook" aria-hidden="true" />
            {socialLoading ? 'Connecting…' : 'Sign up with Facebook'}
          </button>
          <button type="button" className="social-btn apple-btn" disabled>
            <i className="fa-brands fa-apple" aria-hidden="true" />
            Coming soon: Sign up with Apple
          </button>
        </div>

        <p className="terms-hint">
          By continuing, you agree to the TikTok Terms of Service and confirm that you have read our Privacy Policy.
        </p>

        <p className="signup-footer">
          Already have an account?{' '}
          <span className="link-text" onClick={onSwitchToLogin}>
            Log in
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;

