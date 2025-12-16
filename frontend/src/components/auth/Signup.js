import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { verifyEmail, sendSignupVerificationCode, verifySignupCode } from '../../api/auth';
import './Auth.css';

const initialFormState = {
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const Signup = ({ onClose, onSwitchToLogin }) => {
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
  const sendCodeButtonRef = useRef(null);
  
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Email verification states (before signup)
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [timer, setTimer] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [codeSendSuccess, setCodeSendSuccess] = useState(false);
  
  // Post-signup verification step states (after account creation)
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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

  // Function to clean error messages and make them user-friendly
  const cleanErrorMessage = (errorMsg) => {
    if (!errorMsg) return '';
    
    let cleaned = errorMsg;
    
    // Remove technical reference codes (Ref #...)
    cleaned = cleaned.replace(/Ref\s*#[\w\d]+/gi, '');
    
    // Remove BAD_REQUEST, INTERNAL_SERVER_ERROR, etc.
    cleaned = cleaned.replace(/\b(BAD_REQUEST|INTERNAL_SERVER_ERROR|UNAUTHORIZED|FORBIDDEN|NOT_FOUND)\b/gi, '');
    
    // Remove extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // User-friendly error message mapping
    if (cleaned.toLowerCase().includes('already exists') || cleaned.toLowerCase().includes('duplicate')) {
      if (cleaned.toLowerCase().includes('email') && cleaned.toLowerCase().includes('username')) {
        return 'This email or username is already taken. Please use a different one.';
      } else if (cleaned.toLowerCase().includes('email')) {
        return 'This email is already registered. Please use a different email or try logging in.';
      } else if (cleaned.toLowerCase().includes('username')) {
        return 'This username is already taken. Please choose a different one.';
      }
      return 'This account already exists. Please use a different email or username.';
    }
    
    // Return cleaned message or default
    return cleaned || 'Something went wrong. Please try again.';
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

    // Verify OTP code before signup
    if (!emailVerificationCode || emailVerificationCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code before signing up.');
      return;
    }

    setLoading(true);
    try {
      // Code will be verified automatically during registration
      const email = formData.email.trim();
      const code = emailVerificationCode.trim();
      
      // Register with verification code - backend will verify and mark email as verified
      const result = await register({
        username: formData.username.trim(),
        email: email,
        password: formData.password,
        verificationCode: code
      });

      if (result.success) {
        // Email already verified before signup, so no need for post-signup verification
        // Complete signup directly
        if (isMountedRef.current) {
          setSuccess('Welcome aboard! Redirecting you to Spryclips…');
          setFormData(initialFormState);
          setErrors({});
          setEmailVerificationCode('');
          setEmailVerified(false);
        }
        setTimeout(() => {
          onClose();
        }, 900);
      } else if (isMountedRef.current) {
        // Extract field-level errors from backend response
        // Backend uses express-validator format: { field: 'fieldName', message: 'error message' }
        const backendErrors = {};
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach((detail) => {
            // Handle both old format (param/msg) and new format (field/message)
            const fieldName = detail.field || detail.param;
            const errorMessage = detail.message || detail.msg;
            
            if (fieldName) {
              // Map backend field names to frontend field names
              const fieldMap = {
                'username': 'username',
                'email': 'email',
                'password': 'password',
                'verificationCode': 'emailVerificationCode'
              };
              const frontendField = fieldMap[fieldName] || fieldName;
              backendErrors[frontendField] = cleanErrorMessage(errorMessage);
            }
          });
        }
        
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
          // Show first error as main error message
          const firstError = Object.values(backendErrors)[0];
          setError(cleanErrorMessage(firstError));
        } else {
          // Set general error message
          const errorMessage = result.message || 'Registration failed. Please try again.';
          setError(cleanErrorMessage(errorMessage));
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        // Extract detailed error information
        const errorData = err?.response?.data;
        let errorMsg = errorData?.message || err?.message || 'An unexpected error occurred. Please try again.';
        
        // If there are field-specific errors, show them
        if (errorData?.details && Array.isArray(errorData.details)) {
          const backendErrors = {};
          errorData.details.forEach((detail) => {
            const fieldName = detail.field || detail.param;
            const errorMessage = detail.message || detail.msg;
            if (fieldName) {
              const fieldMap = {
                'username': 'username',
                'email': 'email',
                'password': 'password',
                'verificationCode': 'emailVerificationCode'
              };
              const frontendField = fieldMap[fieldName] || fieldName;
              backendErrors[frontendField] = cleanErrorMessage(errorMessage);
            }
          });
          
          if (Object.keys(backendErrors).length > 0) {
            setErrors(backendErrors);
            errorMsg = Object.values(backendErrors)[0]; // Show first error
          }
        }
        
        setError(cleanErrorMessage(errorMsg));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Timer effect for 90 seconds countdown
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && codeSent) {
      setCodeSent(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer, codeSent]);

  // Handle send verification code (before signup)
  const handleSendVerificationCode = async () => {
    const email = formData.email.trim();
    
    if (!email) {
      setError('Please enter your email address first.');
      setSuccess('');
      return;
    }

    setSendingCode(true);
    setError('');
    setSuccess('');

    try {
      const response = await sendSignupVerificationCode(email);
      
      if (response?.success) {
        setError('');
        // User-friendly success message - code is sent via email only
        const successMsg = response?.message || '✅ Verification code sent successfully! Please check your email inbox.';
        setSuccess(successMsg);
        // Start timer if code was sent
        setCodeSent(true);
        setTimer(90); // 90 seconds timer
      } else {
        setError(response?.message || 'Failed to send verification code. Please try again.');
      }
    } catch (error) {
      console.error("Error sending code", error);
      console.error("Full error details:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      
      // Better error messages
      let errorMsg = 'Failed to send verification code. Please try again.';
      
      if (error?.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        errorMsg = 'Network error. Please check if the backend server is running.';
      } else if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out. Please check if the backend server is running.';
      } else if (error?.response?.status === 500) {
        errorMsg = 'Server error. Please check backend console for details.';
      }
      
      setError(cleanErrorMessage(errorMsg));
      setSuccess('');
    } finally {
      setSendingCode(false);
    }
  };

  // Handle verify email code (before signup)
  const handleVerifyEmailCode = async () => {
    const email = formData.email.trim();
    const code = emailVerificationCode.trim();
    
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setVerifyingEmail(true);
    setError('');
    setSuccess('');

    try {
      await verifySignupCode(email, code);
      if (isMountedRef.current) {
        setEmailVerified(true);
        setSuccess('Email verified successfully! You can now continue with signup.');
        setEmailVerificationCode('');
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMsg = err?.response?.data?.message || 'Invalid or expired verification code. Please check and try again.';
        setError(cleanErrorMessage(errorMsg));
        setEmailVerificationCode('');
      }
    } finally {
      if (isMountedRef.current) {
        setVerifyingEmail(false);
      }
    }
  };

  // Post-signup verification handler (after account creation)
  const handleVerifyCode = async (event) => {
    event.preventDefault();
    if (verificationCode.trim().length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setVerifying(true);
    setError('');
    setSuccess('');

    try {
      await verifyEmail(null, verificationCode.trim(), userEmail);
      if (isMountedRef.current) {
        setSuccess('Email verified successfully! Welcome to Spryclips…');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMsg = err?.response?.data?.message || 'Invalid or expired verification code. Please check and try again.';
        setError(cleanErrorMessage(errorMsg));
        setVerificationCode('');
      }
    } finally {
      if (isMountedRef.current) {
        setVerifying(false);
      }
    }
  };

  return (
    <div className="tiktok-signup-container">
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
          <div className="tiktok-logo-text">Spryclips</div>
        </div>

        <h2 className="signup-heading">
          {showVerification ? 'Verify your email' : 'Create your Spryclips account'}
        </h2>
        <p className="auth-subheading">
          {showVerification 
            ? `Enter the 6-digit verification code sent to ${userEmail}. Codes expire after 24 hours.`
            : 'Pick a username, add your email, and secure your account. You can always update details later from your profile.'}
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

        {showVerification ? (
          <form onSubmit={handleVerifyCode} className="tiktok-auth-form" noValidate>
            <div className="form-group-tiktok">
              <label htmlFor="verification-code" className="input-label">
                Verification code
              </label>
              <input
                id="verification-code"
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  // Only allow numbers, max 6 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                  setError('');
                }}
                placeholder="000000"
                className="tiktok-input"
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '8px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}
                required
                maxLength={6}
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="tiktok-gradient-btn"
              disabled={verifying || verificationCode.trim().length !== 6}
            >
              {verifying ? 'Verifying…' : 'Verify email'}
            </button>

            <button
              type="button"
              className="link-text"
              onClick={() => {
                setShowVerification(false);
                setVerificationCode('');
                setError('');
                setSuccess('');
              }}
              style={{ marginTop: '16px', textAlign: 'center', display: 'block' }}
            >
              ← Back to signup form
            </button>
          </form>
        ) : (
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
                // Reset email verification when email changes
                setEmailVerified(false);
                setCodeSent(false);
                setCodeSendSuccess(false);
                setTimer(0);
                setEmailVerificationCode('');
              }}
              placeholder="you@example.com"
              className={`tiktok-input ${errors.email ? 'input-invalid' : ''}`}
              required
            />
            {errors.email && <div className="inline-error">{errors.email}</div>}
            
            {/* Email Verification Code Input */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="email-verification-code" className="input-label" style={{ fontSize: '14px', marginBottom: '4px' }}>
                    Verification code
                  </label>
                  <input
                    id="email-verification-code"
                    type="text"
                    value={emailVerificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setEmailVerificationCode(value);
                      setError('');
                    }}
                    placeholder="------"
                    className="tiktok-input"
                    style={{
                      textAlign: 'center',
                      fontSize: '20px',
                      letterSpacing: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      width: '100%'
                    }}
                    maxLength={6}
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={handleSendVerificationCode}
                    disabled={sendingCode || timer > 0}
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      borderRadius: '4px',
                      border: 'none',
                      background: sendingCode || timer > 0
                        ? '#ccc'
                        : 'linear-gradient(135deg, #FF0050 0%, #FE2C55 50%, #25F4EE 100%)',
                      color: sendingCode || timer > 0 ? '#999' : '#fff',
                      cursor: sendingCode || timer > 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      minWidth: '100px'
                    }}
                  >
                    {sendingCode ? "Sending..." : timer > 0 ? `Resend (${timer}s)` : "Send Verification Code"}
                  </button>
                </div>
              </div>
              {codeSent && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: 0 }}>
                  {timer > 0 
                    ? `Enter the 6-digit code sent to ${formData.email.trim()}. Code will be verified automatically when you click Sign Up. Time remaining: ${timer}s` 
                    : 'Code expired. Please request a new code.'}
                </p>
              )}
            </div>
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
              !formData.confirmPassword ||
              !emailVerificationCode || 
              emailVerificationCode.trim().length !== 6
            }
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
          {formData.email.trim() && (!emailVerificationCode || emailVerificationCode.trim().length !== 6) && (
            <p style={{ fontSize: '12px', color: '#FF0050', marginTop: '8px', textAlign: 'center' }}>
              Please enter the 6-digit verification code to continue
            </p>
          )}
        </form>
        )}

        {!showVerification && (
          <>
            <p className="terms-hint">
              By continuing, you agree to the Spryclips Terms of Service and confirm that you have read our Privacy Policy.
            </p>

            <p className="signup-footer">
              Already have an account?{' '}
              <span className="link-text" onClick={onSwitchToLogin}>
                Log in
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
