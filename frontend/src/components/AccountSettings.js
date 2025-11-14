import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import PrivacySettings from './PrivacySettings';
import Balance from './Balance';
import CreatorTools from './CreatorTools';
import BusinessTools from './BusinessTools';
import PersonalTools from './PersonalTools';
import NotificationSettings from './NotificationSettings';
import SupportCenter from './SupportCenter';
import AppSettings from './AppSettings';
import ManageAccount from './ManageAccount';
import MessageCenter from './MessageCenter';
import TwoFactorManager from './TwoFactorManager';
import { getTwoFactorStatus } from '../api/twoFactor';
import './AccountSettings.css';

const AccountSettings = ({ onClose, onOpenEditProfile, inline, avatarPreview, displayNamePreview, onSubFeatureToggle }) => {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showCreatorTools, setShowCreatorTools] = useState(false);
  const [showBusinessTools, setShowBusinessTools] = useState(false);
  const [showPersonalTools, setShowPersonalTools] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showSupportCenter, setShowSupportCenter] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [showMessageCenter, setShowMessageCenter] = useState(false);
  const [showTwoFactorManager, setShowTwoFactorManager] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState(null);

  // Check if any sub-feature is open
  const hasOpenSubFeature = showPrivacySettings || showBalance || showCreatorTools || 
    showBusinessTools || showPersonalTools || showNotificationSettings || 
    showSupportCenter || showAppSettings || showManageAccount || 
    showMessageCenter || showDeleteConfirm || activeSection !== null;

  // Notify parent component when sub-feature state changes
  useEffect(() => {
    if (onSubFeatureToggle) {
      onSubFeatureToggle(hasOpenSubFeature);
    }
  }, [hasOpenSubFeature, onSubFeatureToggle]);

  useEffect(() => {
    let ignore = false;

    const loadTwoFactorStatus = async () => {
      setTwoFactorLoading(true);
      setTwoFactorError(null);
      try {
        const data = await getTwoFactorStatus();
        if (!ignore) {
          setTwoFactorStatus(data);
        }
      } catch (error) {
        if (!ignore) {
          setTwoFactorError(error?.response?.data?.message || 'Unable to check security status right now.');
        }
      } finally {
        if (!ignore) {
          setTwoFactorLoading(false);
        }
      }
    };

    loadTwoFactorStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // Here you would call an API to delete the account
    logout();
    onClose();
  };

  const settingsSections = [
    {
      id: 'profile',
      title: 'Edit Profile',
      icon: 'fa-solid fa-user-pen',
      description: 'Update your profile information'
    },
    {
      id: 'message',
      title: 'Messages',
      icon: 'fa-solid fa-envelope',
      description: 'Send messages and chat'
    },
    {
      id: 'share',
      title: 'Share Profile',
      icon: 'fa-solid fa-share-nodes',
      description: 'Share your profile with others'
    },
    {
      id: 'balance',
      title: 'Balance & Wallet',
      icon: 'fa-solid fa-wallet',
      description: 'Manage coins, earnings, and withdrawals'
    },
    {
      id: 'creator',
      title: 'Creator Tools',
      icon: 'fa-solid fa-tools',
      description: 'Studio, analytics, and monetization tools'
    },
    {
      id: 'business',
      title: 'Business Tools',
      icon: 'fa-solid fa-briefcase',
      description: 'Business suite, ads, and partnerships'
    },
    {
      id: 'personal',
      title: 'Personal Tools',
      icon: 'fa-solid fa-user-gear',
      description: 'Activity center, offline videos, and QR code'
    },
    {
      id: 'privacy',
      title: 'Privacy & Safety',
      icon: 'fa-solid fa-shield',
      description: 'Manage privacy and safety settings'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'fa-solid fa-bell',
      description: 'Manage notification preferences'
    },
    {
      id: 'support',
      title: 'Support & Help',
      icon: 'fa-solid fa-headset',
      description: 'Get help and report issues'
    },
    {
      id: 'app',
      title: 'App Settings',
      icon: 'fa-solid fa-mobile-screen',
      description: 'Language, theme, and app preferences'
    },
    {
      id: 'manage',
      title: 'Manage Account',
      icon: 'fa-solid fa-gear',
      description: 'Account preferences and settings'
    },
    {
      id: 'security',
      title: 'Two-step Verification',
      icon: 'fa-solid fa-shield-halved',
      description: twoFactorLoading
        ? 'Checking status…'
        : twoFactorStatus?.enabled
          ? 'Enabled — manage authenticator codes'
          : 'Protect your account with a login code'
    },
    {
      id: 'delete',
      title: 'Delete Account',
      icon: 'fa-solid fa-trash',
      description: 'Permanently delete your account',
      danger: true
    }
  ];

  return (
      <div className={`account-settings-overlay ${inline ? 'profile-inline-settings' : ''} ${showMessageCenter ? 'message-center-open' : ''} ${showManageAccount ? 'manage-account-open' : ''}`} onClick={inline ? null : onClose}>
      <div className={`account-settings-modal ${showMessageCenter ? 'message-center-open' : ''} ${showManageAccount ? 'manage-account-open' : ''}`} onClick={(e) => inline || e.stopPropagation()}>
        {/* Header - Hide when MessageCenter or ManageAccount is open */}
        {!showMessageCenter && !showManageAccount && (
          <div className="settings-header">
            {inline ? (
              <button className="settings-back-btn" onClick={onClose} aria-label="Back">
                <i className="fa-solid fa-times"></i>
              </button>
            ) : (
              <button className="settings-close-btn" onClick={onClose} aria-label="Close">
                <i className="fa-solid fa-x"></i>
              </button>
            )}
            <h2>Account Settings</h2>
            <div className="settings-header-placeholder"></div>
          </div>
        )}

        {/* Profile Info */}
        <div className="settings-profile-info">
          <div className="settings-avatar">
            <img
              src={avatarPreview || user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=E50914&color=fff`}
              alt={user?.username}
              key={user?.profile?.avatar ? `${user.profile.avatar}-${Date.now()}` : user?.username}
            />
          </div>
          <div className="settings-user-info">
            <h3>{displayNamePreview || user?.profile?.displayName || user?.username}</h3>
            <p>@{user?.username}</p>
          </div>
        </div>

        {/* Settings List */}
        <div className="settings-list">
          {settingsSections.map((section) => (
            <div
              key={section.id}
              className={`settings-item ${section.danger ? 'danger' : ''} ${section.id === 'security' && activeSection === 'security' ? 'active' : ''}`}
              onClick={() => {
                if (section.id === 'security') {
                  const nextState = activeSection === 'security' ? null : 'security';
                  setActiveSection(nextState);
                  setShowTwoFactorManager(true);
                } else if (section.id === 'privacy') {
                  setShowPrivacySettings(true);
                } else if (section.id === 'balance') {
                  setShowBalance(true);
                } else if (section.id === 'creator') {
                  setShowCreatorTools(true);
                } else if (section.id === 'business') {
                  setShowBusinessTools(true);
                } else if (section.id === 'personal') {
                  setShowPersonalTools(true);
                } else if (section.id === 'notifications') {
                  setShowNotificationSettings(true);
                } else if (section.id === 'support') {
                  setShowSupportCenter(true);
                } else if (section.id === 'app') {
                  setShowAppSettings(true);
                } else if (section.id === 'manage') {
                  setShowManageAccount(true);
                } else if (section.id === 'delete') {
                  handleDeleteAccount();
                } else if (section.id === 'profile' && onOpenEditProfile) {
                  onOpenEditProfile();
                } else if (section.id === 'message') {
                  setShowMessageCenter(true);
                } else if (section.id === 'share') {
                  // Handle share functionality
                  if (navigator.share) {
                    navigator.share({
                      title: `${user?.username}'s TikTok Profile`,
                      text: `Check out ${user?.username}'s profile on TikTok!`,
                      url: window.location.href
                    });
                  } else {
                    // Fallback for browsers that don't support Web Share API
                    navigator.clipboard.writeText(window.location.href);
                    alert('Profile link copied to clipboard!');
                  }
                }
              }}
            >
              <div className="settings-item-icon">
                <i className={section.icon}></i>
              </div>
              <div className="settings-item-content">
                <h4>{section.title}</h4>
                <p>{section.description}</p>
              </div>
              {section.id === 'security' ? (
                <div className="settings-toggle-wrapper">
                  <div 
                    className={`toggle-switch ${twoFactorStatus?.enabled ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTwoFactorManager(true);
                      setActiveSection('security');
                    }}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                  <div 
                    className="settings-toggle-arrow"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle panel open/close when arrow is clicked
                      setActiveSection(activeSection === 'security' ? null : 'security');
                    }}
                  >
                    <i className={`fa-solid fa-chevron-${activeSection === 'security' ? 'up' : 'down'}`}></i>
                  </div>
                </div>
              ) : (
                <div className="settings-arrow">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Two-step Verification Details */}
        {activeSection === 'security' && (
          <div className="settings-details-panel">
            <h4>Two-step Verification</h4>
            <p>
              Protect your account with an additional security layer. When enabled, you&apos;ll need to verify your identity when logging in from a new device.
            </p>
            {twoFactorError && (
              <div className="settings-inline-error">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{twoFactorError}</span>
              </div>
            )}
            <div className="security-features">
              <div className="security-feature">
                <i className="fa-solid fa-check"></i>
                <span>Protect against unauthorized access</span>
              </div>
              <div className="security-feature">
                <i className="fa-solid fa-check"></i>
                <span>Get alerts on suspicious activity</span>
              </div>
              <div className="security-feature">
                <i className="fa-solid fa-check"></i>
                <span>{twoFactorStatus?.enabled ? 'Authenticator app currently enabled' : 'Enable using an authenticator app'}</span>
              </div>
            </div>
            {twoFactorStatus && (
              <div className="security-summary">
                <span>Status:&nbsp;</span>
                <span className={`security-summary-pill ${twoFactorStatus.enabled ? 'enabled' : 'disabled'}`}>
                  {twoFactorStatus.enabled ? 'Enabled' : 'Not enabled'}
                </span>
                {typeof twoFactorStatus.unusedBackupCodesCount === 'number' && (
                  <span className="security-summary-meta">
                    Backup codes remaining: {twoFactorStatus.unusedBackupCodesCount}
                  </span>
                )}
              </div>
            )}
            <button 
              className="details-panel-close-btn-bottom" 
              onClick={() => setActiveSection(null)}
              aria-label="Close"
            >
              <i className="fa-solid fa-times"></i>
              <span>Close</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal - Render using Portal to body */}
        {showDeleteConfirm && ReactDOM.createPortal(
          <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-confirm-header">
                <i className="fa-solid fa-exclamation-triangle"></i>
                <h3>Delete Account</h3>
              </div>
              <div className="delete-confirm-body">
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                <div className="delete-warnings">
                  <div className="warning-item">
                    <i className="fa-solid fa-xmark"></i>
                    <span>All your videos will be permanently deleted</span>
                  </div>
                  <div className="warning-item">
                    <i className="fa-solid fa-xmark"></i>
                    <span>Your followers will be removed</span>
                  </div>
                  <div className="warning-item">
                    <i className="fa-solid fa-xmark"></i>
                    <span>You won't be able to recover your account</span>
                  </div>
                </div>
              </div>
              <div className="delete-confirm-footer">
                <button className="cancel-delete-btn" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={confirmDelete}>
                  Delete Forever
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Privacy Settings Modal */}
        {showPrivacySettings && (
          <PrivacySettings onClose={() => setShowPrivacySettings(false)} />
        )}

        {/* Balance Modal */}
        {showBalance && (
          <Balance onClose={() => setShowBalance(false)} />
        )}

        {/* Creator Tools Modal */}
        {showCreatorTools && (
          <CreatorTools onClose={() => setShowCreatorTools(false)} />
        )}

        {/* Business Tools Modal */}
        {showBusinessTools && (
          <BusinessTools onClose={() => setShowBusinessTools(false)} />
        )}

        {/* Personal Tools Modal */}
        {showPersonalTools && (
          <PersonalTools onClose={() => setShowPersonalTools(false)} />
        )}

        {/* Notification Settings Modal */}
        {showNotificationSettings && (
          <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
        )}

        {/* Support Center Modal */}
        {showSupportCenter && (
          <SupportCenter onClose={() => setShowSupportCenter(false)} />
        )}

        {/* App Settings Modal */}
        {showAppSettings && (
          <AppSettings onClose={() => setShowAppSettings(false)} />
        )}

        {/* Manage Account Modal */}
        {showManageAccount && (
          <ManageAccount onClose={() => setShowManageAccount(false)} />
        )}

        {/* Message Center Modal */}
        {showMessageCenter && (
          <MessageCenter onClose={() => setShowMessageCenter(false)} />
        )}

        {/* Two-Factor Manager */}
        {showTwoFactorManager && (
          <TwoFactorManager
            onClose={() => {
              setShowTwoFactorManager(false);
              setActiveSection(null);
            }}
            initialStatus={twoFactorStatus}
            onStatusChange={(latestStatus) => {
              setTwoFactorStatus(latestStatus);
              setTwoFactorError(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AccountSettings;














