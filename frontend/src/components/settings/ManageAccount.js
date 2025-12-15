import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserVerification from '../profile/UserVerification';
import api from '../../config/axios';
import './ManageAccount.css';

const ManageAccount = ({ onClose }) => {
  const { user, logout } = useAuth();
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showAccountVerification, setShowAccountVerification] = useState(false);
  const [showDownloadData, setShowDownloadData] = useState(false);
  const [showDeactivateAccount, setShowDeactivateAccount] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });

  // Helper function to format account status
  const formatAccountStatus = (status) => {
    if (!status) return 'Active';
    const statusMap = {
      'active': 'Active',
      'suspended': 'Suspended',
      'banned': 'Banned'
    };
    return statusMap[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Track if account was just deactivated to prevent status override
  const [isDeactivated, setIsDeactivated] = useState(false);
  
  const [accountInfo, setAccountInfo] = useState({
    email: user?.email || 'user@example.com',
    phone: user?.phone || '+1 (555) 123-4567',
    joinDate: user?.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '2023-05-15',
    lastLogin: user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : '2024-10-28 14:30',
    accountStatus: formatAccountStatus(user?.accountStatus),
    verificationStatus: user?.emailVerified ? 'Verified' : 'Unverified'
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load account info from backend
  useEffect(() => {
    // Skip loading if account was just deactivated (to prevent status override)
    if (isDeactivated) {
      console.log('⏭️ Skipping account info load - account is deactivated');
      return;
    }
    
    const loadAccountInfo = async () => {
      try {
        const response = await api.get('/api/auth/verify');
        const userData = response.data.user;
        if (userData) {
          setAccountInfo(prev => {
            // NEVER override if status is already Suspended
            if (prev.accountStatus === 'Suspended') {
              console.log('🔒 Preserving Suspended status - not updating from API');
              return prev;
            }
            
            const newStatus = formatAccountStatus(userData.accountStatus);
            console.log('📥 Updating account info from API:', { newStatus, prevStatus: prev.accountStatus });
            
            return {
              email: userData.email || 'user@example.com',
              phone: userData.phone || 'Not set',
              joinDate: userData.createdAt ? new Date(userData.createdAt).toISOString().split('T')[0] : '2023-05-15',
              lastLogin: userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never',
              accountStatus: newStatus,
              verificationStatus: userData.emailVerified ? 'Verified' : 'Unverified'
            };
          });
        }
      } catch (error) {
        console.error('Failed to load account info:', error);
        // If verify fails (403), set status to Suspended if not already set
        if (error.response?.status === 403) {
          setAccountInfo(prev => {
            // If already Suspended, keep it
            if (prev.accountStatus === 'Suspended') {
              return prev;
            }
            // Otherwise, set to Suspended (account is deactivated)
            console.log('🔒 Setting status to Suspended due to 403 error');
            return { ...prev, accountStatus: 'Suspended' };
          });
        }
      }
    };

    loadAccountInfo();
  }, [user, isDeactivated]);


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
          setSaveMessage(response.data.message || 'Account deactivated successfully. Please contact administration to reactivate.');
          setShowDeactivateAccount(false);
          
          // Mark as deactivated to prevent useEffect from overriding status
          setIsDeactivated(true);
          
          // Update account status immediately in UI - FORCE update
          setAccountInfo(prev => {
            console.log('🔒 Setting account status to Suspended after deactivation');
            return {
              ...prev,
              accountStatus: 'Suspended' // Force to Suspended
            };
          });
          
          console.log('✅ Account status updated to Suspended in UI, isDeactivated flag set');
          
          // Immediately clear local state and logout (don't wait for API call)
          setTimeout(() => {
            setSaveMessage('');
            // Clear local storage immediately
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            // Try to logout via API (may fail if account is deactivated, but that's OK)
            logout().catch(() => {
              // Ignore logout errors - we've already cleared local state
              console.log('Logout API call failed (expected for deactivated account)');
            });
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
            background: (saveMessage || '').includes('Failed') || (saveMessage || '').includes('not match') || (saveMessage || '').includes('must be') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: (saveMessage || '').includes('Failed') || (saveMessage || '').includes('not match') || (saveMessage || '').includes('must be') ? '#DC2626' : '#16A34A',
            fontSize: '0.875rem',
            fontWeight: '500',
            textAlign: 'center',
            borderBottom: `1px solid ${(saveMessage || '').includes('Failed') || (saveMessage || '').includes('not match') || (saveMessage || '').includes('must be') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
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
                {(section.items || []).map((item) => (
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
                  Download your account data including profile information and settings.
                </p>
                <ul className="download-details">
                  <li><i className="fa-solid fa-user"></i> Profile details</li>
                  <li><i className="fa-solid fa-cog"></i> Account settings</li>
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
                      let data = null;
                      try {
                        setSaving(true);
                        const response = await api.get('/api/users/download-data');
                        data = response.data;
                        
                        // Debug: Log data structure
                        console.log('📥 Download data received:', data);
                        console.log('📋 Profile data:', data.profile);
                        console.log('📋 Account info:', data.accountInfo);
                        
                        // Validate data structure
                        if (!data || !data.profile) {
                          throw new Error('Invalid data structure received from server');
                        }
                        
                        // Create PDF-ready HTML content
                        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>My Spryclips Data</title>
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
  <h1>🎵 My Spryclips Data</h1>
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
  
  <div class="footer">
    <p>This document was generated from Spryclips App</p>
    <p>© ${new Date().getFullYear()} Spryclips</p>
  </div>
</body>
</html>`;
                        
                        // Debug: Log HTML content and data
                        console.log('📄 HTML content length:', htmlContent.length);
                        console.log('📄 Data being used:', {
                          username: data.profile?.username,
                          email: data.profile?.email,
                          displayName: data.profile?.displayName,
                          hasAccountInfo: !!data.accountInfo,
                          hasSettings: !!data.settings,
                        });
                        console.log('📄 HTML preview (first 800 chars):', htmlContent.substring(0, 800));
                        
                        // Load html2pdf.js from CDN if not already loaded
                        if (!window.html2pdf) {
                          const script = document.createElement('script');
                          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                          script.async = true;
                          await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                          });
                        }
                        
                        // Extract styles from HTML
                        const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*)<\/style>/i);
                        const styles = styleMatch ? styleMatch[1] : '';
                        
                        // Extract body content from HTML string
                        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                        const bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
                        
                        // Create a temporary container with proper styling
                        // Position it in viewport but behind everything (z-index -9999)
                        const tempDiv = document.createElement('div');
                        tempDiv.id = 'pdf-content-temp';
                        tempDiv.style.position = 'fixed';
                        tempDiv.style.left = '50%';
                        tempDiv.style.top = '50%';
                        tempDiv.style.transform = 'translate(-50%, -50%)';
                        tempDiv.style.width = '800px';
                        tempDiv.style.minHeight = '1000px';
                        tempDiv.style.backgroundColor = '#ffffff';
                        tempDiv.style.fontFamily = 'Arial, sans-serif';
                        tempDiv.style.padding = '40px';
                        tempDiv.style.overflow = 'visible';
                        tempDiv.style.color = '#000000';
                        tempDiv.style.opacity = '1';
                        tempDiv.style.visibility = 'visible';
                        tempDiv.style.pointerEvents = 'none';
                        tempDiv.style.zIndex = '-9999';
                        tempDiv.style.boxShadow = 'none';
                        
                        // Create style element with all styles
                        const styleElement = document.createElement('style');
                        styleElement.id = 'pdf-styles-temp';
                        styleElement.textContent = `
                          #pdf-content-temp {
                            font-family: Arial, sans-serif;
                            padding: 40px;
                            max-width: 800px;
                            margin: 0 auto;
                            color: #000000;
                            background: #ffffff;
                          }
                          #pdf-content-temp h1 {
                            color: #FE2C55;
                            text-align: center;
                            border-bottom: 3px solid #FE2C55;
                            padding-bottom: 15px;
                          }
                          #pdf-content-temp h2 {
                            color: #333;
                            margin-top: 30px;
                            border-left: 4px solid #FE2C55;
                            padding-left: 15px;
                          }
                          #pdf-content-temp .info-row {
                            display: flex;
                            padding: 10px 0;
                            border-bottom: 1px solid #eee;
                          }
                          #pdf-content-temp .label {
                            font-weight: bold;
                            width: 150px;
                            color: #666;
                          }
                          #pdf-content-temp .value {
                            color: #333;
                          }
                          #pdf-content-temp .section {
                            background: #f9f9f9;
                            padding: 20px;
                            border-radius: 10px;
                            margin: 15px 0;
                          }
                          #pdf-content-temp .activity-item {
                            padding: 8px 0;
                            border-bottom: 1px solid #eee;
                          }
                          #pdf-content-temp .footer {
                            text-align: center;
                            margin-top: 40px;
                            color: #999;
                            font-size: 12px;
                          }
                          #pdf-content-temp * {
                            box-sizing: border-box;
                          }
                        `;
                        document.head.appendChild(styleElement);
                        
                        // Set innerHTML and append to body
                        tempDiv.innerHTML = bodyContent;
                        document.body.appendChild(tempDiv);
                        
                        // Wait for content to render
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Verify content exists and is rendered
                        if (!tempDiv.innerHTML || tempDiv.innerHTML.trim().length === 0) {
                          throw new Error('PDF content is empty. Please check the data.');
                        }
                        
                        // Verify element has content
                        const hasContent = tempDiv.textContent && tempDiv.textContent.trim().length > 0;
                        if (!hasContent) {
                          throw new Error('PDF content is not rendering. Please check the data structure.');
                        }
                        
                        console.log('📄 Content ready for PDF:', {
                          innerHTMLLength: tempDiv.innerHTML.length,
                          textContentLength: tempDiv.textContent.length,
                          scrollHeight: tempDiv.scrollHeight,
                          offsetHeight: tempDiv.offsetHeight
                        });
                        
                        // Close modal immediately (before PDF generation)
                        setShowDownloadData(false);
                        
                        // Wait a bit more for rendering
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        // Configure PDF options for direct download
                        const opt = {
                          margin: [10, 10, 10, 10],
                          filename: `spryclips-data-${data.profile.username}-${new Date().toISOString().split('T')[0]}.pdf`,
                          image: { type: 'jpeg', quality: 0.98 },
                          html2canvas: { 
                            scale: 2, 
                            useCORS: true, 
                            logging: false,
                            backgroundColor: '#ffffff',
                            width: 800,
                            height: tempDiv.scrollHeight || 1200,
                            windowWidth: 800,
                            windowHeight: tempDiv.scrollHeight || 1200,
                            x: 0,
                            y: 0
                          },
                          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                          enableLinks: false
                        };
                        
                        // Generate and download PDF automatically (no window opening)
                        await window.html2pdf()
                          .set(opt)
                          .from(tempDiv)
                          .save();
                        
                        // Clean up temporary elements
                        document.body.removeChild(tempDiv);
                        document.head.removeChild(styleElement);
                        
                        setSaveMessage('PDF downloaded successfully!');
                        setTimeout(() => setSaveMessage(''), 3000);
                      } catch (error) {
                        console.error('PDF generation error:', error);
                        console.error('Error details:', {
                          message: error.message,
                          stack: error.stack,
                          data: data || 'No data available'
                        });
                        
                        // Clean up on error
                        const tempEl = document.getElementById('pdf-content-temp');
                        const styleEl = document.getElementById('pdf-styles-temp');
                        if (tempEl) document.body.removeChild(tempEl);
                        if (styleEl) document.head.removeChild(styleEl);
                        
                        setSaveMessage(`Failed to generate PDF: ${error.message}. Please check console for details.`);
                        setTimeout(() => setSaveMessage(''), 5000);
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
                  Deactivating your account will hide your profile, videos, and comments. 
                  After deactivation, you will not be able to log in. To reactivate your account, 
                  please contact administration within 30 days. After 30 days, your account will be permanently deactivated.
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

        {/* Account Verification Modal */}
        {showAccountVerification && (
          <UserVerification onClose={() => setShowAccountVerification(false)} />
        )}
      </div>
    </div>
  );
};

export default ManageAccount;














