import React, { useEffect, useMemo, useState } from 'react';
import {
  disableTwoFactor,
  generateTwoFactorSecret,
  getTwoFactorStatus,
  regenerateBackupCodes,
  verifyTwoFactorToken
} from '../api/twoFactor';
import './TwoFactorManager.css';

const INITIAL_DISABLE_STATE = {
  token: '',
  backupCode: '',
  password: ''
};

const TwoFactorManager = ({ onClose, onStatusChange, initialStatus }) => {
  const [status, setStatus] = useState(initialStatus ?? null);
  const [loadingStatus, setLoadingStatus] = useState(!initialStatus);
  const [statusError, setStatusError] = useState(null);

  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);
  const [secretPayload, setSecretPayload] = useState(null);

  const [verificationToken, setVerificationToken] = useState('');
  const [verificationBackupCode, setVerificationBackupCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationSuccess, setVerificationSuccess] = useState(null);

  const [disableForm, setDisableForm] = useState(INITIAL_DISABLE_STATE);
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState(null);

  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState([]);
  const [regenerateError, setRegenerateError] = useState(null);

  const computedEnabled = Boolean(status?.enabled);

  useEffect(() => {
    let ignore = false;

    const loadStatus = async () => {
      if (initialStatus) {
        return;
      }

      setLoadingStatus(true);
      setStatusError(null);

      try {
        const data = await getTwoFactorStatus();
        if (!ignore) {
          setStatus(data);
        }
      } catch (error) {
        if (!ignore) {
          setStatusError(
            error?.response?.data?.message || 'Unable to fetch two-factor status right now.'
          );
        }
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
        }
      }
    };

    loadStatus();

    return () => {
      ignore = true;
    };
  }, [initialStatus]);

  const handleGenerateSecret = async () => {
    setIsGeneratingSecret(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      const data = await generateTwoFactorSecret();
      setSecretPayload(data);
    } catch (error) {
      setVerificationError(
        error?.response?.data?.message || 'Could not generate 2FA secret. Please try again.'
      );
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationToken.trim() && !verificationBackupCode.trim()) {
      setVerificationError('Enter a 6-digit code or a backup code to continue.');
      return;
    }

    setVerifying(true);
    setVerificationError(null);

    try {
      const payload = {
        token: verificationToken.trim() || undefined,
        backupCode: verificationBackupCode.trim() || undefined
      };
      await verifyTwoFactorToken(payload);
      setVerificationSuccess('Two-factor authentication is now enabled.');
      setVerificationToken('');
      setVerificationBackupCode('');
      setSecretPayload(null);

      const freshStatus = await getTwoFactorStatus();
      setStatus(freshStatus);
      onStatusChange?.(freshStatus);
    } catch (error) {
      setVerificationError(
        error?.response?.data?.message || 'Code verification failed. Please try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!disableForm.token && !disableForm.backupCode && !disableForm.password) {
      setDisableError('Provide a 6-digit code, a backup code, or your password to disable 2FA.');
      return;
    }

    setDisabling(true);
    setDisableError(null);

    try {
      await disableTwoFactor({
        token: disableForm.token || undefined,
        backupCode: disableForm.backupCode || undefined,
        password: disableForm.password || undefined
      });

      const freshStatus = await getTwoFactorStatus();
      setStatus(freshStatus);
      setSecretPayload(null);
      setDisableForm(INITIAL_DISABLE_STATE);
      setRegeneratedCodes([]);
      onStatusChange?.(freshStatus);
    } catch (error) {
      setDisableError(
        error?.response?.data?.message || 'Unable to disable 2FA with the provided details.'
      );
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerateCodes = async () => {
    setRegeneratingCodes(true);
    setRegenerateError(null);

    try {
      const data = await regenerateBackupCodes({
        password: disableForm.password || undefined
      });
      setRegeneratedCodes(data.backupCodes || []);
      const freshStatus = await getTwoFactorStatus();
      setStatus(freshStatus);
      onStatusChange?.(freshStatus);
    } catch (error) {
      setRegenerateError(
        error?.response?.data?.message || 'Could not regenerate codes. Check your password and try again.'
      );
    } finally {
      setRegeneratingCodes(false);
    }
  };

  const copyToClipboard = (value) => {
    if (!navigator?.clipboard) {
      return;
    }
    navigator.clipboard.writeText(value).catch(() => {
      // ignore clipboard failure
    });
  };

  const backupCodesToDisplay = useMemo(() => {
    if (regeneratedCodes.length > 0) {
      return regeneratedCodes;
    }
    if (secretPayload?.backupCodes?.length) {
      return secretPayload.backupCodes;
    }
    return [];
  }, [regeneratedCodes, secretPayload]);

  return (
    <div className="two-factor-overlay" onClick={onClose}>
      <div className="two-factor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="two-factor-header">
          <h2>Two-factor Authentication</h2>
          <button className="two-factor-close" onClick={onClose} aria-label="Close 2FA manager">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {loadingStatus ? (
          <div className="two-factor-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Checking two-factor status…</span>
          </div>
        ) : statusError ? (
          <div className="two-factor-error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <p>{statusError}</p>
          </div>
        ) : (
          <div className="two-factor-content">
            <section className="two-factor-status">
              <h3>Status</h3>
              <div className={`two-factor-status-pill ${computedEnabled ? 'enabled' : 'disabled'}`}>
                <i className={`fa-solid ${computedEnabled ? 'fa-lock' : 'fa-unlock'}`}></i>
                <span>
                  {computedEnabled ? 'Enabled' : 'Not enabled'}
                </span>
              </div>
              {status?.unusedBackupCodesCount !== undefined && (
                <p className="two-factor-meta">
                  Backup codes remaining: {status.unusedBackupCodesCount}
                </p>
              )}
            </section>

            {!computedEnabled ? (
              <section className="two-factor-setup">
                <h3>Enable two-factor authentication</h3>
                <p className="two-factor-description">
                  Secure your account with a one-time password generated by an authenticator app.
                  Scan the QR code or enter the secret provided below, then enter the 6-digit code from your app to complete setup.
                </p>

                {!secretPayload ? (
                  <button
                    className="two-factor-primary-btn"
                    onClick={handleGenerateSecret}
                    disabled={isGeneratingSecret}
                  >
                    {isGeneratingSecret ? 'Preparing…' : 'Generate setup QR code'}
                  </button>
                ) : (
                  <div className="two-factor-setup-details">
                    <div className="two-factor-qr">
                      {secretPayload.qrCode ? (
                        <img src={secretPayload.qrCode} alt="Scan this QR code with your authenticator app" />
                      ) : (
                        <div className="two-factor-qr-placeholder">
                          <i className="fa-solid fa-qrcode"></i>
                        </div>
                      )}
                    </div>
                    <div className="two-factor-secret-block">
                      <label>Secret key</label>
                      <div className="two-factor-secret">
                        <code>{secretPayload.secret}</code>
                        <button
                          type="button"
                          className="two-factor-copy"
                          onClick={() => copyToClipboard(secretPayload.secret)}
                          aria-label="Copy secret"
                        >
                          <i className="fa-solid fa-copy"></i>
                        </button>
                      </div>
                    </div>
                    {backupCodesToDisplay.length > 0 && (
                      <div className="two-factor-backup-codes">
                        <label>Backup codes (store these safely)</label>
                        <div className="two-factor-codes-grid">
                          {backupCodesToDisplay.map((code) => (
                            <button
                              type="button"
                              key={code}
                              className="two-factor-code-pill"
                              onClick={() => copyToClipboard(code)}
                            >
                              {code}
                              <i className="fa-solid fa-copy"></i>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {secretPayload && (
                  <div className="two-factor-verify-form">
                    <div className="two-factor-field">
                      <label htmlFor="twoFactorToken">6-digit code</label>
                      <input
                        id="twoFactorToken"
                        type="text"
                        inputMode="numeric"
                        placeholder="123456"
                        value={verificationToken}
                        onChange={(event) => setVerificationToken(event.target.value)}
                      />
                    </div>
                    <div className="two-factor-field">
                      <label htmlFor="twoFactorBackup">Backup code (optional)</label>
                      <input
                        id="twoFactorBackup"
                        type="text"
                        placeholder="ABCD-1234"
                        value={verificationBackupCode}
                        onChange={(event) => setVerificationBackupCode(event.target.value)}
                      />
                    </div>
                    {verificationError && (
                      <div className="two-factor-inline-error">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{verificationError}</span>
                      </div>
                    )}
                    {verificationSuccess && (
                      <div className="two-factor-inline-success">
                        <i className="fa-solid fa-circle-check"></i>
                        <span>{verificationSuccess}</span>
                      </div>
                    )}
                    <button
                      className="two-factor-primary-btn"
                      onClick={handleVerify}
                      disabled={verifying}
                    >
                      {verifying ? 'Verifying…' : 'Verify & enable'}
                    </button>
                  </div>
                )}
              </section>
            ) : (
              <section className="two-factor-manage">
                <h3>Manage two-factor authentication</h3>
                <p className="two-factor-description">
                  Two-factor authentication is currently enabled. Use the options below to regenerate backup codes or disable the feature.
                </p>

                <div className="two-factor-field">
                  <label htmlFor="twoFactorDisableToken">6-digit code</label>
                  <input
                    id="twoFactorDisableToken"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={disableForm.token}
                    onChange={(event) =>
                      setDisableForm((prev) => ({ ...prev, token: event.target.value }))
                    }
                  />
                </div>
                <div className="two-factor-field">
                  <label htmlFor="twoFactorDisableBackup">Backup code</label>
                  <input
                    id="twoFactorDisableBackup"
                    type="text"
                    placeholder="ABCD-1234"
                    value={disableForm.backupCode}
                    onChange={(event) =>
                      setDisableForm((prev) => ({ ...prev, backupCode: event.target.value }))
                    }
                  />
                </div>
                <div className="two-factor-field">
                  <label htmlFor="twoFactorDisablePassword">Password (optional)</label>
                  <input
                    id="twoFactorDisablePassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={disableForm.password}
                    onChange={(event) =>
                      setDisableForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>

                {disableError && (
                  <div className="two-factor-inline-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{disableError}</span>
                  </div>
                )}

                <div className="two-factor-actions">
                  <button
                    className="two-factor-secondary-btn"
                    onClick={handleRegenerateCodes}
                    disabled={regeneratingCodes}
                  >
                    {regeneratingCodes ? 'Regenerating…' : 'Regenerate backup codes'}
                  </button>
                  <button
                    className="two-factor-danger-btn"
                    onClick={handleDisable}
                    disabled={disabling}
                  >
                    {disabling ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                </div>

                {regenerateError && (
                  <div className="two-factor-inline-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{regenerateError}</span>
                  </div>
                )}

                {backupCodesToDisplay.length > 0 && (
                  <div className="two-factor-backup-codes">
                    <label>Backup codes (store these safely)</label>
                    <div className="two-factor-codes-grid">
                      {backupCodesToDisplay.map((code) => (
                        <button
                          type="button"
                          key={code}
                          className="two-factor-code-pill"
                          onClick={() => copyToClipboard(code)}
                        >
                          {code}
                          <i className="fa-solid fa-copy"></i>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoFactorManager;

