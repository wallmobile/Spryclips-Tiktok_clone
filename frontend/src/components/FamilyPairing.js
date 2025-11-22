import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './FamilyPairing.css';

const FamilyPairing = ({ onClose }) => {
  const { user } = useAuth();
  const [isParent, setIsParent] = useState(true);
  const [pairingCode, setPairingCode] = useState('');
  const [linkedAccounts, setLinkedAccounts] = useState([
    { id: 1, username: 'teen_account', role: 'teen', linkedDate: '2024-01-15' }
  ]);
  const [parentalSettings, setParentalSettings] = useState({
    screenTimeLimit: true,
    screenTimeHours: 2,
    directMessages: false,
    comments: true,
    privateAccount: true,
    downloads: false,
    inappropriateContent: true
  });

  const generatePairingCode = () => {
    // Generate a 6-digit pairing code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(code);
  };

  const handleLinkAccount = () => {
    if (pairingCode.length === 6) {
      // In production, this would link the account via API
      alert('Account linked successfully!');
      setPairingCode('');
    } else {
      alert('Please enter a valid 6-digit pairing code');
    }
  };

  const handleUnlinkAccount = (accountId) => {
    setLinkedAccounts(linkedAccounts.filter(acc => acc.id !== accountId));
    alert('Account unlinked successfully!');
  };

  const handleSettingChange = (setting) => {
    setParentalSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return (
    <div className="family-pairing-overlay" onClick={onClose}>
      <div className="family-pairing-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="family-header">
          <button className="family-close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Family Pairing</h2>
          <div className="family-header-placeholder"></div>
        </div>

        <div className="family-content">
          {/* Role Selection */}
          <div className="family-role-section">
            <h3>I am a...</h3>
            <div className="role-buttons">
              <button
                className={`role-btn ${isParent ? 'active' : ''}`}
                onClick={() => setIsParent(true)}
              >
                <i className="fa-solid fa-user-shield"></i>
                <span>Parent/Guardian</span>
              </button>
              <button
                className={`role-btn ${!isParent ? 'active' : ''}`}
                onClick={() => setIsParent(false)}
              >
                <i className="fa-solid fa-user"></i>
                <span>Teen/Family Member</span>
              </button>
            </div>
          </div>

          {isParent ? (
            <>
              {/* Parent View - Create Pairing Code */}
              <div className="pairing-section">
                <h3>Link Your Teen's Account</h3>
                <div className="pairing-code-section">
                  {!pairingCode ? (
                    <>
                      <p className="pairing-description">
                        Generate a pairing code to link your teen's account. 
                        Share this code with them to connect your accounts.
                      </p>
                      <button className="generate-code-btn" onClick={generatePairingCode}>
                        <i className="fa-solid fa-link"></i>
                        <span>Generate Pairing Code</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="pairing-code-display">
                        <h4>Share this code with your teen:</h4>
                        <div className="pairing-code-number">{pairingCode}</div>
                        <button className="copy-code-btn" onClick={() => {
                          navigator.clipboard.writeText(pairingCode);
                          alert('Code copied to clipboard!');
                        }}>
                          <i className="fa-solid fa-copy"></i>
                          Copy Code
                        </button>
                      </div>
                      <button
                        className="generate-new-code-btn"
                        onClick={() => setPairingCode('')}
                      >
                        Generate New Code
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Linked Accounts */}
              <div className="linked-accounts-section">
                <h3>Linked Accounts ({linkedAccounts.length})</h3>
                {linkedAccounts.length === 0 ? (
                  <div className="empty-linked">
                    <i className="fa-solid fa-link-slash"></i>
                    <p>No linked accounts</p>
                    <span>Linked accounts will appear here</span>
                  </div>
                ) : (
                  <div className="linked-accounts-list">
                    {linkedAccounts.map(account => (
                      <div key={account.id} className="linked-account-item">
                        <div className="linked-account-info">
                          <div className="linked-account-avatar">
                            <i className="fa-solid fa-user"></i>
                          </div>
                          <div className="linked-account-details">
                            <span className="linked-username">@{account.username}</span>
                            <span className="linked-role">{account.role === 'teen' ? 'Teen Account' : 'Family Account'}</span>
                            <span className="linked-date">Linked on {account.linkedDate}</span>
                          </div>
                        </div>
                        <div className="linked-account-actions">
                          <button
                            className="manage-settings-btn"
                            onClick={() => alert('Manage settings for ' + account.username)}
                          >
                            <i className="fa-solid fa-cog"></i>
                            Manage
                          </button>
                          <button
                            className="unlink-btn"
                            onClick={() => handleUnlinkAccount(account.id)}
                          >
                            <i className="fa-solid fa-unlink"></i>
                            Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Parental Controls */}
              <div className="parental-controls-section">
                <h3>Parental Controls</h3>
                <div className="control-settings">
                  <div className="control-item">
                    <div className="control-info">
                      <h4>Screen Time Limit</h4>
                      <p>Set daily screen time limits for linked accounts</p>
                    </div>
                    <div className="control-toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={parentalSettings.screenTimeLimit}
                          onChange={() => handleSettingChange('screenTimeLimit')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  {parentalSettings.screenTimeLimit && (
                    <div className="control-subsetting">
                      <label>Daily Limit (hours)</label>
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={parentalSettings.screenTimeHours}
                        onChange={(e) => setParentalSettings(prev => ({
                          ...prev,
                          screenTimeHours: parseFloat(e.target.value)
                        }))}
                        className="screen-time-input"
                      />
                    </div>
                  )}

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Direct Messages</h4>
                      <p>Control who can send direct messages</p>
                    </div>
                    <div className="control-toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={parentalSettings.directMessages}
                          onChange={() => handleSettingChange('directMessages')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Allow Comments</h4>
                      <p>Enable or disable comments on videos</p>
                    </div>
                    <div className="control-toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={parentalSettings.comments}
                          onChange={() => handleSettingChange('comments')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Private Account</h4>
                      <p>Make account private by default</p>
                    </div>
                    <div className="control-toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={parentalSettings.privateAccount}
                          onChange={() => handleSettingChange('privateAccount')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Allow Downloads</h4>
                      <p>Allow downloading videos to device</p>
                    </div>
                    <div className="control-toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={parentalSettings.downloads}
                          onChange={() => handleSettingChange('downloads')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="control-item">
                    <div className="control-info">
                      <h4>Restrict Inappropriate Content</h4>
                      <p>Filter out potentially inappropriate content</p>
                    </div>
                    <div className="control-toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={parentalSettings.inappropriateContent}
                          onChange={() => handleSettingChange('inappropriateContent')}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Teen View - Enter Pairing Code */}
              <div className="pairing-section">
                <h3>Link to Parent Account</h3>
                <p className="pairing-description">
                  Enter the 6-digit pairing code from your parent or guardian 
                  to link your account.
                </p>
                <div className="enter-code-section">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="pairing-code-input"
                  />
                  <button
                    className="link-account-btn"
                    onClick={handleLinkAccount}
                    disabled={pairingCode.length !== 6}
                  >
                    <i className="fa-solid fa-link"></i>
                    <span>Link Account</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyPairing;
