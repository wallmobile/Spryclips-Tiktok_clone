import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserVerification from './UserVerification';
import './ManageAccount.css';

const ManageAccount = ({ onClose }) => {
  const { user, logout } = useAuth();
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [showAccountVerification, setShowAccountVerification] = useState(false);
  const [showDownloadData, setShowDownloadData] = useState(false);
  const [showDeactivateAccount, setShowDeactivateAccount] = useState(false);
  const [showLinkedAccounts, setShowLinkedAccounts] = useState(false);
  const [showAccountActivity, setShowAccountActivity] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });

  const [phoneForm, setPhoneForm] = useState({
    newPhone: '',
    verificationCode: ''
  });

  const [accountInfo] = useState({
    email: user?.email || 'user@example.com',
    phone: user?.phone || '+1 (555) 123-4567',
    joinDate: '2023-05-15',
    lastLogin: '2024-10-28 14:30',
    accountStatus: 'Active',
    verificationStatus: 'Verified',
    twoFactorEnabled: true
  });

  const [linkedAccounts] = useState([
    { platform: 'Google', email: 'user@gmail.com', connected: true, icon: 'fa-brands fa-google' },
    { platform: 'Facebook', email: 'user@facebook.com', connected: true, icon: 'fa-brands fa-facebook' },
    { platform: 'Instagram', username: '@username', connected: false, icon: 'fa-brands fa-instagram' },
    { platform: 'Twitter', username: '@username', connected: false, icon: 'fa-brands fa-twitter' },
    { platform: 'Apple', email: 'user@icloud.com', connected: false, icon: 'fa-brands fa-apple' }
  ]);

  const [accountActivity] = useState([
    { action: 'Login', device: 'iPhone 14 Pro', location: 'New York, US', time: '2024-10-28 14:30', status: 'success' },
    { action: 'Password Changed', device: 'MacBook Pro', location: 'New York, US', time: '2024-10-25 09:15', status: 'success' },
    { action: 'Login Attempt', device: 'Unknown Device', location: 'London, UK', time: '2024-10-24 22:45', status: 'blocked' },
    { action: 'Profile Updated', device: 'iPhone 14 Pro', location: 'New York, US', time: '2024-10-23 16:20', status: 'success' },
    { action: 'Email Verified', device: 'MacBook Pro', location: 'New York, US', time: '2024-10-20 11:30', status: 'success' }
  ]);

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    alert('Password changed successfully!');
    setShowChangePassword(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleEmailChange = (e) => {
    e.preventDefault();
    if (!emailForm.newEmail.includes('@')) {
      alert('Please enter a valid email address!');
      return;
    }
    alert(`Verification email sent to ${emailForm.newEmail}. Please check your inbox.`);
    setShowChangeEmail(false);
    setEmailForm({ newEmail: '', password: '' });
  };

  const handlePhoneChange = (e) => {
    e.preventDefault();
    if (phoneForm.verificationCode.length !== 6) {
      alert('Please enter the 6-digit verification code!');
      return;
    }
    alert('Phone number updated successfully!');
    setShowChangePhone(false);
    setPhoneForm({ newPhone: '', verificationCode: '' });
  };

  const handleAccountAction = (action) => {
    switch(action) {
      case 'verify':
        alert('Account verification process started. Please check your email for instructions.');
        break;
      case 'download':
        alert('Data download request submitted. You will receive an email with download link within 24 hours.');
        break;
      case 'deactivate':
        if (window.confirm('Are you sure you want to deactivate your account? You can reactivate it by logging in again within 30 days.')) {
          alert('Account deactivated successfully. You have 30 days to reactivate.');
          logout();
          onClose();
        }
        break;
      default:
        break;
    }
  };

  const handleLinkAccount = (platform) => {
    alert(`Redirecting to ${platform} for account linking...`);
  };

  const handleUnlinkAccount = (platform) => {
    if (window.confirm(`Are you sure you want to unlink your ${platform} account?`)) {
      alert(`${platform} account unlinked successfully!`);
    }
  };

  const manageAccountSections = [
    {
      id: 'security',
      title: 'Security',
      items: [
        {
          id: 'password',
          title: 'Change Password',
          description: 'Update your account password',
          icon: 'fa-solid fa-key',
          action: () => setShowChangePassword(true)
        },
        {
          id: 'email',
          title: 'Change Email',
          description: accountInfo.email,
          icon: 'fa-solid fa-envelope',
          action: () => setShowChangeEmail(true)
        },
        {
          id: 'phone',
          title: 'Change Phone Number',
          description: accountInfo.phone,
          icon: 'fa-solid fa-phone',
          action: () => setShowChangePhone(true)
        }
      ]
    },
    {
      id: 'verification',
      title: 'Account Verification',
      items: [
        {
          id: 'verify',
          title: 'Verify Account',
          description: `Status: ${accountInfo.verificationStatus}`,
          icon: 'fa-solid fa-certificate',
          action: () => setShowAccountVerification(true)
        },
        {
          id: 'activity',
          title: 'Account Activity',
          description: 'View recent account activity',
          icon: 'fa-solid fa-clock-rotate-left',
          action: () => setShowAccountActivity(true)
        }
      ]
    },
    {
      id: 'connections',
      title: 'Connected Accounts',
      items: [
        {
          id: 'linked',
          title: 'Linked Accounts',
          description: 'Manage social media connections',
          icon: 'fa-solid fa-link',
          action: () => setShowLinkedAccounts(true)
        }
      ]
    },
    {
      id: 'data',
      title: 'Data & Privacy',
      items: [
        {
          id: 'download',
          title: 'Download My Data',
          description: 'Get a copy of your account data',
          icon: 'fa-solid fa-download',
          action: () => setShowDownloadData(true)
        }
      ]
    },
    {
      id: 'account',
      title: 'Account Management',
      items: [
        {
          id: 'deactivate',
          title: 'Deactivate Account',
          description: 'Temporarily deactivate your account',
          icon: 'fa-solid fa-user-slash',
          action: () => setShowDeactivateAccount(true),
          danger: true
        }
      ]
    }
  ];

  return (
    <div className="manage-account-overlay" onClick={onClose}>
      <div className="manage-account-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="manage-account-header">
          <button className="manage-account-close-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-x"></i>
          </button>
          <h2>Manage Account</h2>
          <div className="manage-account-header-placeholder"></div>
        </div>

        {/* Account Info */}
        <div className="account-info-section">
          <div className="account-info-card">
            <div className="account-avatar">
              <img
                src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=E50914&color=fff`}
                alt={user?.username}
              />
            </div>
            <div className="account-details">
              <h3>{user?.profile?.displayName || user?.username}</h3>
              <p>@{user?.username}</p>
              <div className="account-stats">
                <div className="stat-item">
                  <span className="stat-label">Member since</span>
                  <span className="stat-value">{accountInfo.joinDate}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Last login</span>
                  <span className="stat-value">{accountInfo.lastLogin}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Status</span>
                  <span className={`stat-value status ${accountInfo.accountStatus.toLowerCase()}`}>
                    {accountInfo.accountStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="manage-account-content">
          {manageAccountSections.map((section) => (
            <div key={section.id} className="manage-account-section">
              <h3 className="section-title">{section.title}</h3>
              <div className="section-items">
                {section.items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`manage-account-item ${item.danger ? 'danger' : ''}`}
                    onClick={item.action}
                  >
                    <div className="account-item-icon">
                      <i className={item.icon}></i>
                    </div>
                    <div className="account-item-content">
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </div>
                    <div className="account-item-arrow">
                      <i className="fa-solid fa-chevron-right"></i>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="account-modal-overlay" onClick={() => setShowChangePassword(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Change Password</h3>
                <button className="account-modal-close" onClick={() => setShowChangePassword(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <form onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                      minLength="8"
                    />
                    <small>Password must be at least 8 characters long</small>
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowChangePassword(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Change Email Modal */}
        {showChangeEmail && (
          <div className="account-modal-overlay" onClick={() => setShowChangeEmail(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Change Email</h3>
                <button className="account-modal-close" onClick={() => setShowChangeEmail(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <form onSubmit={handleEmailChange}>
                  <div className="current-info">
                    <p>Current Email: <strong>{accountInfo.email}</strong></p>
                  </div>
                  <div className="form-group">
                    <label>New Email Address</label>
                    <input
                      type="email"
                      value={emailForm.newEmail}
                      onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({...emailForm, password: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowChangeEmail(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Send Verification
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Change Phone Modal */}
        {showChangePhone && (
          <div className="account-modal-overlay" onClick={() => setShowChangePhone(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Change Phone Number</h3>
                <button className="account-modal-close" onClick={() => setShowChangePhone(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <form onSubmit={handlePhoneChange}>
                  <div className="current-info">
                    <p>Current Phone: <strong>{accountInfo.phone}</strong></p>
                  </div>
                  <div className="form-group">
                    <label>New Phone Number</label>
                    <input
                      type="tel"
                      value={phoneForm.newPhone}
                      onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })}
                      required
                      placeholder="+1 555-123-4567"
                    />
                  </div>
                  <div className="form-group">
                    <label>Verification Code</label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        value={phoneForm.verificationCode}
                        onChange={(e) => setPhoneForm({ ...phoneForm, verificationCode: e.target.value })}
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        placeholder="Enter 6-digit code"
                      />
                      <button
                        type="button"
                        className="secondary-action-btn"
                        onClick={() => alert(`Verification code sent to ${phoneForm.newPhone || accountInfo.phone}`)}
                      >
                        Send Code
                      </button>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowChangePhone(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Update Phone
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Account Activity Modal */}
        {showAccountActivity && (
          <div className="account-modal-overlay" onClick={() => setShowAccountActivity(false)}>
            <div className="account-modal-content large" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Account Activity</h3>
                <button className="account-modal-close" onClick={() => setShowAccountActivity(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <div className="activity-list">
                  {accountActivity.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        <i className={`fa-solid ${
                          activity.action.includes('Login') ? 'fa-sign-in-alt' :
                          activity.action.includes('Password') ? 'fa-key' :
                          activity.action.includes('Profile') ? 'fa-user-edit' :
                          activity.action.includes('Email') ? 'fa-envelope-check' : 'fa-clock'
                        }`}></i>
                      </div>
                      <div className="activity-details">
                        <div className="activity-action">{activity.action}</div>
                        <div className="activity-info">
                          <span>{activity.device}</span> • <span>{activity.location}</span>
                        </div>
                        <div className="activity-time">{activity.time}</div>
                      </div>
                      <div className={`activity-status ${activity.status}`}>
                        {activity.status === 'success' ? (
                          <i className="fa-solid fa-check"></i>
                        ) : activity.status === 'blocked' ? (
                          <i className="fa-solid fa-ban"></i>
                        ) : (
                          <i className="fa-solid fa-exclamation"></i>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Data Modal */}
        {showDownloadData && (
          <div className="account-modal-overlay" onClick={() => setShowDownloadData(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Download Your Data</h3>
                <button className="account-modal-close" onClick={() => setShowDownloadData(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <p>
                  We will prepare a downloadable archive with your videos, comments, messages, and account information.
                  You will receive an email with a secure download link within 24 hours.
                </p>
                <ul className="download-details">
                  <li><i className="fa-solid fa-video"></i> Videos & drafts</li>
                  <li><i className="fa-solid fa-comments"></i> Comments & interactions</li>
                  <li><i className="fa-solid fa-user-shield"></i> Account settings</li>
                  <li><i className="fa-solid fa-file-alt"></i> Profile details</li>
                </ul>
                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowDownloadData(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={() => {
                      handleAccountAction('download');
                      setShowDownloadData(false);
                    }}
                  >
                    Request Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Account Modal */}
        {showDeactivateAccount && (
          <div className="account-modal-overlay" onClick={() => setShowDeactivateAccount(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Deactivate Account</h3>
                <button className="account-modal-close" onClick={() => setShowDeactivateAccount(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <p>
                  Deactivating your account will hide your profile, videos, and comments. You can reactivate your account
                  by logging in within 30 days.
                </p>
                <div className="warning-box">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Keep in mind that any scheduled live events will be canceled.</span>
                </div>
                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowDeactivateAccount(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit-btn danger"
                    onClick={() => {
                      handleAccountAction('deactivate');
                      setShowDeactivateAccount(false);
                    }}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Linked Accounts Modal */}
        {showLinkedAccounts && (
          <div className="account-modal-overlay" onClick={() => setShowLinkedAccounts(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header">
                <h3>Linked Accounts</h3>
                <button className="account-modal-close" onClick={() => setShowLinkedAccounts(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <div className="linked-accounts-list">
                  {linkedAccounts.map((account, index) => (
                    <div key={index} className="linked-account-item">
                      <div className="linked-account-info">
                        <div className="linked-account-icon">
                          <i className={account.icon}></i>
                        </div>
                        <div className="linked-account-details">
                          <h4>{account.platform}</h4>
                          <p>{account.email || account.username}</p>
                        </div>
                      </div>
                      <div className="linked-account-action">
                        {account.connected ? (
                          <button 
                            className="unlink-btn"
                            onClick={() => handleUnlinkAccount(account.platform)}
                          >
                            Unlink
                          </button>
                        ) : (
                          <button 
                            className="link-btn"
                            onClick={() => handleLinkAccount(account.platform)}
                          >
                            Link
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Verification Modal */}
        {showAccountVerification && (
          <UserVerification onClose={() => setShowAccountVerification(false)} />
        )}
      </div>
    </div>
  );
};

export default ManageAccount;














