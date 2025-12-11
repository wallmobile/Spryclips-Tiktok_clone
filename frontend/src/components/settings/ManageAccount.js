import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserVerification from '../profile/UserVerification';
import api from '../../config/axios';
import './ManageAccount.css';

const ManageAccount = ({ onClose }) => {
  const { user, logout } = useAuth();
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [showAccountVerification, setShowAccountVerification] = useState(false);
  const [showDownloadData, setShowDownloadData] = useState(false);
  const [showDeactivateAccount, setShowDeactivateAccount] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
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

  const [accountInfo, setAccountInfo] = useState({
    email: user?.email || 'user@example.com',
    phone: user?.phone || '+1 (555) 123-4567',
    joinDate: user?.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '2023-05-15',
    lastLogin: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '2024-10-28 14:30',
    accountStatus: user?.accountStatus || 'Active',
    verificationStatus: user?.emailVerified ? 'Verified' : 'Unverified'
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load account info from backend
  useEffect(() => {
    const loadAccountInfo = async () => {
      try {
        const response = await api.get('/api/auth/verify');
        const userData = response.data.user;
        if (userData) {
          setAccountInfo({
            email: userData.email || 'user@example.com',
            phone: userData.phone || 'Not set',
            joinDate: userData.createdAt ? new Date(userData.createdAt).toISOString().split('T')[0] : '2023-05-15',
            lastLogin: userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never',
            accountStatus: userData.accountStatus || 'Active',
            verificationStatus: userData.emailVerified ? 'Verified' : 'Unverified'
          });
        }
      } catch (error) {
        console.error('Failed to load account info:', error);
      }
    };

    const loadLinkedAccounts = async () => {
      try {
        const response = await api.get('/api/users/linked-accounts');
        if (response.data.success) {
          setLinkedAccounts(response.data.linkedAccounts);
        }
      } catch (error) {
        console.error('Failed to load linked accounts:', error);
      }
    };

    const loadAccountActivity = async () => {
      try {
        const response = await api.get('/api/users/account-activity');
        if (response.data.success) {
          setAccountActivity(response.data.activities.map(activity => ({
            ...activity,
            time: new Date(activity.time).toLocaleString()
          })));
        }
      } catch (error) {
        console.error('Failed to load account activity:', error);
      }
    };

    loadAccountInfo();
    loadLinkedAccounts();
    loadAccountActivity();
  }, [user]);

  const [linkedAccounts, setLinkedAccounts] = useState([
    { platform: 'Google', icon: 'fa-brands fa-google', connected: false },
    { platform: 'Facebook', icon: 'fa-brands fa-facebook', connected: false },
    { platform: 'Instagram', icon: 'fa-brands fa-instagram', connected: false },
    { platform: 'Twitter', icon: 'fa-brands fa-twitter', connected: false },
    { platform: 'Apple', icon: 'fa-brands fa-apple', connected: false }
  ]);

  const [accountActivity, setAccountActivity] = useState([]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSaveMessage('New passwords do not match!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setSaveMessage('Password must be at least 8 characters long!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    try {
      setSaving(true);
      await api.put('/api/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setSaveMessage('Password changed successfully!');
      setTimeout(() => {
        setSaveMessage('');
        setShowChangePassword(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }, 2000);
    } catch (error) {
      console.error('Failed to change password:', error);
      setSaveMessage(error.response?.data?.message || 'Failed to change password');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!emailForm.newEmail.includes('@')) {
      setSaveMessage('Please enter a valid email address!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    try {
      setSaving(true);
      await api.put('/api/users/change-email', {
        newEmail: emailForm.newEmail,
        password: emailForm.password
      });
      setSaveMessage(`Verification email sent to ${emailForm.newEmail}. Please check your inbox.`);
      setTimeout(() => {
        setSaveMessage('');
        setShowChangeEmail(false);
        setEmailForm({ newEmail: '', password: '' });
      }, 3000);
    } catch (error) {
      console.error('Failed to change email:', error);
      setSaveMessage(error.response?.data?.message || 'Failed to change email');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneChange = async (e) => {
    e.preventDefault();
    if (phoneForm.verificationCode.length !== 6) {
      setSaveMessage('Please enter the 6-digit verification code!');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    try {
      setSaving(true);
      await api.put('/api/users/change-phone', {
        newPhone: phoneForm.newPhone,
        verificationCode: phoneForm.verificationCode
      });
      setSaveMessage('Phone number updated successfully!');
      setTimeout(() => {
        setSaveMessage('');
        setShowChangePhone(false);
        setPhoneForm({ newPhone: '', verificationCode: '' });
      }, 2000);
    } catch (error) {
      console.error('Failed to change phone:', error);
      setSaveMessage(error.response?.data?.message || 'Failed to change phone number');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleAccountAction = async (action) => {
    switch(action) {
      case 'verify':
        try {
          await api.post('/api/users/request-verification');
          setSaveMessage('Account verification process started. Please check your email for instructions.');
          setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
          setSaveMessage(error.response?.data?.message || 'Failed to start verification');
          setTimeout(() => setSaveMessage(''), 3000);
        }
        break;
      case 'download':
        try {
          await api.post('/api/users/request-data-download');
          setSaveMessage('Data download request submitted. You will receive an email with download link within 24 hours.');
          setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
          setSaveMessage(error.response?.data?.message || 'Failed to request data download');
          setTimeout(() => setSaveMessage(''), 3000);
        }
        break;
      case 'deactivate':
        try {
          setSaving(true);
          const response = await api.post('/api/users/deactivate');
          setSaveMessage(response.data.message || 'Account deactivated successfully. You have 30 days to reactivate.');
          setShowDeactivateAccount(false);
          setTimeout(() => {
            setSaveMessage('');
            logout();
            onClose();
          }, 2000);
        } catch (error) {
          setSaveMessage(error.response?.data?.message || 'Failed to deactivate account');
          setTimeout(() => setSaveMessage(''), 3000);
        } finally {
          setSaving(false);
        }
        break;
      case 'delete':
        try {
          setSaving(true);
          const response = await api.delete('/api/users/delete-account');
          setSaveMessage(response.data.message || 'Account deleted successfully.');
          setShowDeleteAccount(false);
          setTimeout(() => {
            setSaveMessage('');
            logout();
            onClose();
          }, 2000);
        } catch (error) {
          setSaveMessage(error.response?.data?.message || 'Failed to delete account');
          setTimeout(() => setSaveMessage(''), 3000);
        } finally {
          setSaving(false);
        }
        break;
      default:
        break;
    }
  };

  const handleLinkAccount = async (platform) => {
    try {
      // In a real app, this would redirect to OAuth flow
      // For demo, we'll simulate linking
      setSaveMessage(`Redirecting to ${platform} for account linking...`);
      
      // Simulate OAuth callback
      setTimeout(async () => {
        try {
          await api.post('/api/users/link-account', { 
            platform, 
            email: `user@${platform.toLowerCase()}.com`,
            username: `@${user?.username || 'user'}`
          });
          
          // Refresh linked accounts
          const response = await api.get('/api/users/linked-accounts');
          if (response.data.success) {
            setLinkedAccounts(response.data.linkedAccounts);
          }
          
          setSaveMessage(`${platform} account linked successfully!`);
          setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
          setSaveMessage(error.response?.data?.message || `Failed to link ${platform} account`);
          setTimeout(() => setSaveMessage(''), 3000);
        }
      }, 1500);
    } catch (error) {
      setSaveMessage(`Failed to link ${platform} account`);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUnlinkAccount = async (platform) => {
    try {
      await api.post('/api/users/unlink-account', { platform });
      
      // Refresh linked accounts
      const response = await api.get('/api/users/linked-accounts');
      if (response.data.success) {
        setLinkedAccounts(response.data.linkedAccounts);
      }
      
      setSaveMessage(`${platform} account unlinked successfully!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(error.response?.data?.message || `Failed to unlink ${platform} account`);
      setTimeout(() => setSaveMessage(''), 3000);
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
        },
        {
          id: 'delete',
          title: 'Delete Account',
          description: 'Permanently delete your account',
          icon: 'fa-solid fa-trash',
          action: () => setShowDeleteAccount(true),
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

        {/* Save Message */}
        {saveMessage && (
          <div style={{
            padding: '0.75rem 1.25rem',
            background: saveMessage.includes('Failed') || saveMessage.includes('not match') || saveMessage.includes('must be') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: saveMessage.includes('Failed') || saveMessage.includes('not match') || saveMessage.includes('must be') ? '#DC2626' : '#16A34A',
            fontSize: '0.875rem',
            fontWeight: '500',
            textAlign: 'center',
            borderBottom: `1px solid ${saveMessage.includes('Failed') || saveMessage.includes('not match') || saveMessage.includes('must be') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
          }}>
            {saveMessage}
          </div>
        )}

        {/* Settings Content */}
        <div className="manage-account-content">
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
                    <button type="submit" className="submit-btn" disabled={saving}>
                      {saving ? 'Changing...' : 'Change Password'}
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
                    <button type="submit" className="submit-btn" disabled={saving}>
                      {saving ? 'Sending...' : 'Send Verification'}
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
                        onClick={async () => {
                          try {
                            await api.post('/api/users/send-phone-verification', {
                              phone: phoneForm.newPhone || accountInfo.phone
                            });
                            setSaveMessage(`Verification code sent to ${phoneForm.newPhone || accountInfo.phone}`);
                            setTimeout(() => setSaveMessage(''), 3000);
                          } catch (error) {
                            setSaveMessage('Failed to send verification code');
                            setTimeout(() => setSaveMessage(''), 3000);
                          }
                        }}
                      >
                        Send Code
                      </button>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={() => setShowChangePhone(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn" disabled={saving}>
                      {saving ? 'Updating...' : 'Update Phone'}
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
                  Download your account data including profile information, settings, and activity history.
                </p>
                <ul className="download-details">
                  <li><i className="fa-solid fa-user"></i> Profile details</li>
                  <li><i className="fa-solid fa-cog"></i> Account settings</li>
                  <li><i className="fa-solid fa-clock-rotate-left"></i> Activity history</li>
                  <li><i className="fa-solid fa-shield"></i> Privacy settings</li>
                </ul>
                <div className="form-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowDownloadData(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={async () => {
                      try {
                        setSaving(true);
                        const response = await api.get('/api/users/download-data');
                        const data = response.data;
                        
                        // Create PDF-ready HTML content
                        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>My TikTok Data</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #FE2C55; text-align: center; border-bottom: 3px solid #FE2C55; padding-bottom: 15px; }
    h2 { color: #333; margin-top: 30px; border-left: 4px solid #FE2C55; padding-left: 15px; }
    .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
    .label { font-weight: bold; width: 150px; color: #666; }
    .value { color: #333; }
    .section { background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 15px 0; }
    .activity-item { padding: 8px 0; border-bottom: 1px solid #eee; }
    .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>🎵 My TikTok Data</h1>
  <p style="text-align: center; color: #666;">Downloaded on: ${new Date().toLocaleDateString()}</p>
  
  <h2>👤 Profile Information</h2>
  <div class="section">
    <div class="info-row"><span class="label">Username:</span><span class="value">@${data.profile.username}</span></div>
    <div class="info-row"><span class="label">Display Name:</span><span class="value">${data.profile.displayName || 'Not set'}</span></div>
    <div class="info-row"><span class="label">Email:</span><span class="value">${data.profile.email}</span></div>
    <div class="info-row"><span class="label">Bio:</span><span class="value">${data.profile.bio || 'Not set'}</span></div>
    <div class="info-row"><span class="label">Website:</span><span class="value">${data.profile.website || 'Not set'}</span></div>
    <div class="info-row"><span class="label">Verified:</span><span class="value">${data.profile.isVerified ? '✅ Yes' : '❌ No'}</span></div>
    <div class="info-row"><span class="label">Followers:</span><span class="value">${data.profile.followers}</span></div>
    <div class="info-row"><span class="label">Following:</span><span class="value">${data.profile.following}</span></div>
    <div class="info-row"><span class="label">Total Likes:</span><span class="value">${data.profile.likes}</span></div>
  </div>
  
  <h2>📊 Account Information</h2>
  <div class="section">
    <div class="info-row"><span class="label">Member Since:</span><span class="value">${data.accountInfo.createdAt ? new Date(data.accountInfo.createdAt).toLocaleDateString() : 'Unknown'}</span></div>
    <div class="info-row"><span class="label">Last Login:</span><span class="value">${data.accountInfo.lastLogin ? new Date(data.accountInfo.lastLogin).toLocaleString() : 'Never'}</span></div>
    <div class="info-row"><span class="label">Status:</span><span class="value">${data.accountInfo.accountStatus || 'Active'}</span></div>
    <div class="info-row"><span class="label">Email Verified:</span><span class="value">${data.accountInfo.emailVerified ? '✅ Yes' : '❌ No'}</span></div>
  </div>
  
  <h2>⚙️ Settings</h2>
  <div class="section">
    <div class="info-row"><span class="label">Dark Mode:</span><span class="value">${data.settings.appSettings?.darkMode ? 'Enabled' : 'Disabled'}</span></div>
    <div class="info-row"><span class="label">Auto-play:</span><span class="value">${data.settings.appSettings?.autoPlay !== false ? 'Enabled' : 'Disabled'}</span></div>
    <div class="info-row"><span class="label">Data Saver:</span><span class="value">${data.settings.appSettings?.dataSaver ? 'Enabled' : 'Disabled'}</span></div>
  </div>
  
  <h2>🔗 Linked Accounts</h2>
  <div class="section">
    ${(data.linkedAccounts || []).filter(a => a.connected).length > 0 
      ? (data.linkedAccounts || []).filter(a => a.connected).map(a => `<div class="info-row"><span class="label">${a.platform}:</span><span class="value">${a.email || a.username || 'Connected'}</span></div>`).join('')
      : '<p>No linked accounts</p>'
    }
  </div>
  
  <h2>📜 Recent Activity</h2>
  <div class="section">
    ${(data.activityHistory || []).slice(0, 10).length > 0
      ? (data.activityHistory || []).slice(0, 10).map(a => `<div class="activity-item">• ${a.action} - ${new Date(a.time).toLocaleString()}</div>`).join('')
      : '<p>No activity recorded</p>'
    }
  </div>
  
  <div class="footer">
    <p>This document was generated from TikTok Clone App</p>
    <p>© ${new Date().getFullYear()} TikTok Clone</p>
  </div>
</body>
</html>`;
                        
                        // Open in new window and trigger print (Save as PDF)
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(htmlContent);
                        printWindow.document.close();
                        
                        // Wait for content to load then print
                        printWindow.onload = () => {
                          printWindow.print();
                        };
                        
                        setSaveMessage('PDF ready! Select "Save as PDF" in print dialog.');
                        setShowDownloadData(false);
                        setTimeout(() => setSaveMessage(''), 5000);
                      } catch (error) {
                        setSaveMessage('Failed to generate PDF');
                        setTimeout(() => setSaveMessage(''), 3000);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? 'Generating...' : 'Download PDF'}
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
                    onClick={() => handleAccountAction('deactivate')}
                    disabled={saving}
                  >
                    {saving ? 'Deactivating...' : 'Deactivate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteAccount && (
          <div className="account-modal-overlay" onClick={() => setShowDeleteAccount(false)}>
            <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="account-modal-header danger">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <h3>Delete Account</h3>
                <button className="account-modal-close" onClick={() => setShowDeleteAccount(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="account-modal-body">
                <p>
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <div className="warning-list">
                  <div className="warning-item">
                    <i className="fa-solid fa-x"></i>
                    <span>All your videos will be permanently deleted</span>
                  </div>
                  <div className="warning-item">
                    <i className="fa-solid fa-x"></i>
                    <span>Your followers will be removed</span>
                  </div>
                  <div className="warning-item">
                    <i className="fa-solid fa-x"></i>
                    <span>You won't be able to recover your account</span>
                  </div>
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteAccount(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="submit-btn danger delete-forever-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAccountAction('delete');
                    }}
                    disabled={saving}
                  >
                    {saving ? 'Deleting...' : 'Delete Forever'}
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














