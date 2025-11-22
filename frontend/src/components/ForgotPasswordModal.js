import React, { useMemo, useState } from 'react';
import { forgotPassword, resetPassword } from '../api/auth';
import './ForgotPasswordModal.css';

const STEP_REQUEST = 'request';
const STEP_RESET = 'reset';
const STEP_SUCCESS = 'success';

const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState(STEP_REQUEST);
  const [requesting, setRequesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const canSubmitRequest = useMemo(() => email.trim().length > 3, [email]);
  const canSubmitReset = useMemo(() => {
    const passwordValid = newPassword.trim().length >= 8 && newPassword === confirmPassword;
    return (token.trim().length > 0) && passwordValid;
  }, [token, newPassword, confirmPassword]);

  const handleRequestReset = async (event) => {
    event.preventDefault();
    if (!canSubmitRequest) return;

    setRequesting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await forgotPassword(email.trim());
      setInfoMessage(
        response?.message ||
          'If an account exists with that email, a verification code has been sent to you.'
      );
      setStep(STEP_RESET);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to start password reset right now.');
    } finally {
      setRequesting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!canSubmitReset) return;

    setResetting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await resetPassword(token.trim(), newPassword.trim());
      setInfoMessage(response?.message || 'Your password has been reset successfully.');
      setStep(STEP_SUCCESS);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset password with the provided code.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="forgot-password-overlay" onClick={onClose}>
      <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        <header className="forgot-password-header">
          <h2>{step === STEP_REQUEST ? 'Forgot password' : 'Reset your password'}</h2>
          <button className="forgot-password-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-times"></i>
          </button>
        </header>

        <div className="forgot-password-body">
          {step === STEP_REQUEST && (
            <form className="forgot-password-form" onSubmit={handleRequestReset}>
              <p className="forgot-password-description">
                Enter the email associated with your account and we&apos;ll send you a verification code.
              </p>
              <div className="forgot-password-field">
                <label htmlFor="forgotEmail">Email</label>
                <input
                  id="forgotEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
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
                disabled={!canSubmitRequest || requesting}
              >
                {requesting ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          )}

          {step === STEP_RESET && (
            <form className="forgot-password-form" onSubmit={handleResetPassword}>
              <p className="forgot-password-description">
                Enter the verification code from your email and choose a new password. Codes expire after a short time.
              </p>
              <div className="forgot-password-field">
                <label htmlFor="resetToken">Verification code</label>
                <input
                  id="resetToken"
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Paste your code"
                  required
                />
              </div>
              <div className="forgot-password-field">
                <label htmlFor="resetPassword">New password</label>
                <input
                  id="resetPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                />
              </div>
              <div className="forgot-password-field">
                <label htmlFor="resetConfirm">Confirm new password</label>
                <input
                  id="resetConfirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  minLength={8}
                  required
                />
              </div>
              {error && (
                <div className="forgot-password-error">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{error}</span>
                </div>
              )}
              {infoMessage && (
                <div className="forgot-password-info">
                  <i className="fa-solid fa-envelope-circle-check"></i>
                  <span>{infoMessage}</span>
                </div>
              )}
              <button
                type="submit"
                className="forgot-password-primary"
                disabled={!canSubmitReset || resetting}
              >
                {resetting ? 'Resetting…' : 'Reset password'}
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
  );
};

export default ForgotPasswordModal;

