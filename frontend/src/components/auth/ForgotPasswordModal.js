import React, { useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { forgotPassword, resetPassword, verifyResetCode } from '../../api/auth';
import './ForgotPasswordModal.css';

const STEP_REQUEST = 'request';
const STEP_VERIFY_CODE = 'verify_code';
const STEP_RESET = 'reset';
const STEP_SUCCESS = 'success';

const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState(STEP_REQUEST);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [timer, setTimer] = useState(0);
  const [codeSendSuccess, setCodeSendSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (cleaned.toLowerCase().includes('too many') || cleaned.toLowerCase().includes('rate limit')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    
    if (cleaned.toLowerCase().includes('locked') || cleaned.toLowerCase().includes('temporarily')) {
      return 'Too many failed attempts. Please try again after some time.';
    }
    
    if (cleaned.toLowerCase().includes('invalid') && cleaned.toLowerCase().includes('code')) {
      return 'Invalid or expired verification code. Please check and try again.';
    }
    
    if (cleaned.toLowerCase().includes('expired')) {
      return 'Verification code has expired. Please request a new code.';
    }
    
    if (cleaned.toLowerCase().includes('not found') || cleaned.toLowerCase().includes('does not exist')) {
      return 'No account found with this email address.';
    }
    
    // Return cleaned message or default
    return cleaned || 'Something went wrong. Please try again.';
  };

  const canSubmitRequest = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }, [email]);
  
  const canVerifyCode = useMemo(() => {
    return code.trim().length === 6;
  }, [code]);

  const canSubmitReset = useMemo(() => {
    const passwordValid = newPassword.trim().length >= 8 && newPassword === confirmPassword;
    return passwordValid;
  }, [newPassword, confirmPassword]);

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

  // Handle send verification code (same as signup)
  const handleSendVerificationCode = async () => {
    const emailValue = email.trim();
    
    if (!emailValue) {
      setError('Please enter your email address first.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSendingCode(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await forgotPassword(emailValue);
      if (response?.success || response?.message) {
        setCodeSendSuccess(true);
        setCodeSent(true);
        setTimer(90); // 90 seconds timer
        setInfoMessage('Verification code sent successfully! Please check your email.');
        setError(null);
        setTimeout(() => {
          setCodeSendSuccess(false);
        }, 2000);
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.message || 'Failed to send verification code. Please try again.';
      setError(cleanErrorMessage(errorMsg));
    } finally {
      setSendingCode(false);
    }
  };


  const handleVerifyCodeInput = async () => {
    if (code.trim().length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setVerifying(true);
    setError(null);
    setInfoMessage(null);

    try {
      // Verify code with backend (send email for tracking failed attempts)
      await verifyResetCode(code.trim(), email.trim());
      setCodeVerified(true);
      setError(null);
      setInfoMessage('Code verified! Now set your new password.');
      // Move to password step after a short delay
      setTimeout(() => {
        setStep(STEP_RESET);
      }, 500);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || 'Invalid or expired verification code. Please check and try again.';
      setError(cleanErrorMessage(errorMsg));
      setCodeVerified(false);
      setCode(''); // Clear invalid code
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!canSubmitReset || !codeVerified) return;

    setResetting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await resetPassword(code.trim(), newPassword.trim());
      setInfoMessage(response?.message || 'Your password has been reset successfully.');
      setStep(STEP_SUCCESS);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || 'Unable to reset password with the provided code.';
      setError(cleanErrorMessage(errorMsg));
      // If code is invalid, go back to verify step
      const cleanedMsg = cleanErrorMessage(errorMsg);
      if (cleanedMsg.toLowerCase().includes('invalid') || cleanedMsg.toLowerCase().includes('expired')) {
        setStep(STEP_REQUEST);
        setCodeVerified(false);
        setCode('');
      }
    } finally {
      setResetting(false);
    }
  };

  return ReactDOM.createPortal(
    (
      <div className="forgot-password-overlay" onClick={onClose}>
      <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        <header className="forgot-password-header">
          <h2>
            {step === STEP_REQUEST || step === STEP_VERIFY_CODE ? 'Forgot password' : 
             step === STEP_RESET ? 'Reset your password' : 
             'Password updated'}
          </h2>
          <button className="forgot-password-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-times"></i>
          </button>
        </header>

        <div className="forgot-password-body">
          {(step === STEP_REQUEST || step === STEP_VERIFY_CODE) && (
            <form className="forgot-password-form" onSubmit={(e) => { e.preventDefault(); handleVerifyCodeInput(); }}>
              <p className="forgot-password-description">
                Enter your email and verification code to reset your password.
              </p>
              
              {/* Email Field */}
              <div className="forgot-password-field">
                <label htmlFor="forgotEmail">Email</label>
                <input
                  id="forgotEmail"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                    // Reset verification states when email changes
                    setCodeSent(false);
                    setCodeSendSuccess(false);
                    setCodeVerified(false);
                    setTimer(0);
                    setCode('');
                  }}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Verification Code Input - Same page as email (like signup) */}
              <div className="forgot-password-field" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="resetCode" style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                      Verification code
                    </label>
                    <input
                      id="resetCode"
                      type="text"
                      value={code}
                      onChange={(event) => {
                        // Only allow numbers, max 6 digits
                        const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                        setCode(value);
                        setCodeVerified(false);
                        setError(null);
                      }}
                      placeholder="------"
                      maxLength={6}
                      required
                      pattern="[0-9]{6}"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      style={{
                        textAlign: 'center',
                        fontSize: '20px',
                        letterSpacing: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
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
                      {sendingCode ? "Sending..." : codeSendSuccess ? "Code Sent ✓" : timer > 0 ? `Resend (${timer}s)` : "Send code"}
                    </button>
                  </div>
                </div>
                
                {codeSent && !codeVerified && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: 0 }}>
                    {timer > 0 
                      ? `Enter the code sent to ${email}. Time remaining: ${timer}s` 
                      : 'Code expired. Please request a new code.'}
                  </p>
                )}
                {codeVerified && (
                  <p style={{ fontSize: '12px', color: '#25F4EE', marginTop: '4px', marginBottom: 0, fontWeight: '500' }}>
                    ✓ Code verified successfully!
                  </p>
                )}
              </div>

              {error && (
                <div className="forgot-password-error">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}
              {infoMessage && (
                <div className="forgot-password-info">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* Verify Code Button - Auto verify when code is entered and proceed to password reset */}
              {codeSent && (
                <button
                  type="submit"
                  className="forgot-password-primary"
                  disabled={!canVerifyCode || verifying || !codeSent}
                  onClick={(e) => {
                    e.preventDefault();
                    handleVerifyCodeInput();
                  }}
                >
                  {verifying ? 'Verifying…' : codeVerified ? 'Continue to reset password' : 'Verify Code'}
                </button>
              )}
            </form>
          )}


          {step === STEP_RESET && (
            <form className="forgot-password-form" onSubmit={handleResetPassword}>
              <p className="forgot-password-description">
                Code verified! Now choose a new password for your account.
              </p>
              <div className="forgot-password-field">
                <label htmlFor="resetPassword">New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="resetPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    autoFocus
                    style={{ paddingRight: '40px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showNewPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
                  </button>
                </div>
              </div>
              <div className="forgot-password-field">
                <label htmlFor="resetConfirm">Confirm new password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="resetConfirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    minLength={8}
                    required
                    style={{ paddingRight: '40px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#666',
                      padding: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showConfirmPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
                  </button>
                </div>
              </div>
              {error && (
                <div className="forgot-password-error">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                className="forgot-password-primary"
                disabled={!canSubmitReset || resetting}
              >
                {resetting ? 'Resetting…' : 'Reset password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(STEP_VERIFY_CODE);
                  setNewPassword('');
                  setConfirmPassword('');
                  setError(null);
                  setInfoMessage(null);
                }}
                className="forgot-password-back-btn"
              >
                <i className="fa-solid fa-arrow-left" style={{ fontSize: '12px' }}></i>
                Back to code
              </button>
            </form>
          )}

          {step === STEP_SUCCESS && (
            <div className="forgot-password-success">
              <i className="fa-solid fa-circle-check"></i>
              <h3>Password updated</h3>
              <p>{infoMessage || 'You can now sign in with your new password.'}</p>
              <button
                className="forgot-password-primary"
                onClick={onClose}
              >
                Return to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    ),
    document.body
  );
};

export default ForgotPasswordModal;

