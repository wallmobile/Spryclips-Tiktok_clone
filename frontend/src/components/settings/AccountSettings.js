import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PrivacySettings from './PrivacySettings';
import Balance from '../common/Balance';
import CreatorTools from '../creator/CreatorTools';
import BusinessTools from '../business/BusinessTools';
import PersonalTools from './PersonalTools';
import NotificationSettings from './NotificationSettings';
import AppSettings from './AppSettings';
import ManageAccount from './ManageAccount';
import MessageCenter from '../social/MessageCenter';
import StoryCreator from '../stories/StoryCreator';
import StoryViewer from '../stories/StoryViewer';
import { getUserStories } from '../../api/stories';
import './AccountSettings.css';

const AccountSettings = ({ onClose, onOpenEditProfile, inline, avatarPreview, displayNamePreview, onSubFeatureToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showCreatorTools, setShowCreatorTools] = useState(false);
  
  // Auto-open Creator Tools if coming back from Upload/other pages
  useEffect(() => {
    const shouldOpenCreatorTools = location.state?.openCreatorTools || 
                                   sessionStorage.getItem('openCreatorTools') === 'true';
    if (shouldOpenCreatorTools) {
      setShowCreatorTools(true);
      sessionStorage.removeItem('openCreatorTools');
      // Clear state to prevent reopening on next render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  
  // Auto-open Business Tools if coming back from sub-features
  useEffect(() => {
    const shouldOpenBusinessTools = location.state?.openBusinessTools || 
                                   sessionStorage.getItem('openBusinessTools') === 'true';
    if (shouldOpenBusinessTools) {
      setShowBusinessTools(true);
      sessionStorage.removeItem('openBusinessTools');
      // Clear state to prevent reopening on next render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  
  // Auto-open Personal Tools if coming back from sub-features
  useEffect(() => {
    const shouldOpenPersonalTools = location.state?.openPersonalTools || 
                                   sessionStorage.getItem('openPersonalTools') === 'true';
    if (shouldOpenPersonalTools) {
      setShowPersonalTools(true);
      sessionStorage.removeItem('openPersonalTools');
      // Clear state to prevent reopening on next render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  
  const [showBusinessTools, setShowBusinessTools] = useState(false);
  const [showPersonalTools, setShowPersonalTools] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showManageAccount, setShowManageAccount] = useState(false);
  const [showMessageCenter, setShowMessageCenter] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [userStories, setUserStories] = useState([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);

  // Check if any sub-feature is open
  const hasOpenSubFeature = showPrivacySettings || showBalance || showCreatorTools || 
    showBusinessTools || showPersonalTools || showNotificationSettings || 
    showAppSettings || showManageAccount || 
    showMessageCenter || showDeleteConfirm || showStoryCreator;

  // Notify parent component when sub-feature state changes
  useEffect(() => {
    if (onSubFeatureToggle) {
      onSubFeatureToggle(hasOpenSubFeature);
    }
  }, [hasOpenSubFeature, onSubFeatureToggle]);

  // Fetch user stories for story ring
  useEffect(() => {
    const fetchStories = async () => {
      const userId = user?._id || user?.id;
      if (!userId) return;

      try {
        setLoadingStories(true);
        const response = await getUserStories(userId);
        
        // Filter expired stories (24-hour expiration)
        const now = new Date();
        const storiesArray = response?.stories || response?.data?.stories || [];
        
        const validStories = storiesArray.filter(story => {
          if (!story || !story.expiresAt) return false;
          const expiresAt = new Date(story.expiresAt);
          return expiresAt > now;
        });
        
        setUserStories(validStories);
      } catch (error) {
        console.error('Error fetching user stories in AccountSettings:', error);
        setUserStories([]);
      } finally {
        setLoadingStories(false);
      }
    };

    fetchStories();
    
    // Listen for story creation events
    const handleStoryRefresh = () => {
      fetchStories();
      setTimeout(() => fetchStories(), 500);
      setTimeout(() => fetchStories(), 1000);
    };
    window.addEventListener('stories:refresh', handleStoryRefresh);
    
    return () => {
      window.removeEventListener('stories:refresh', handleStoryRefresh);
    };
  }, [user?._id || user?.id]);


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
      id: 'story',
      title: 'Create Story',
      icon: 'fa-solid fa-circle-plus',
      description: 'Share photos and videos that disappear in 24 hours'
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
            {/* Story ring indicator - TikTok style colored ring around profile picture */}
            {userStories && userStories.length > 0 ? (
              <div 
                className="settings-story-ring-wrapper"
                onClick={(e) => {
                  e.stopPropagation();
                  if (userStories.length > 0) {
                    setShowStoryViewer(true);
                  }
                }}
                title="View Story"
              >
                <div className="settings-story-ring">
                  <img
                    src={avatarPreview || user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=E50914&color=fff`}
                    alt={user?.username}
                    key={user?.profile?.avatar ? `${user.profile.avatar}-${Date.now()}` : user?.username}
                    className="settings-avatar-with-ring"
                  />
                </div>
              </div>
            ) : (
              <img
                src={avatarPreview || user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=E50914&color=fff`}
                alt={user?.username}
                key={user?.profile?.avatar ? `${user.profile.avatar}-${Date.now()}` : user?.username}
              />
            )}
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
              className={`settings-item ${section.danger ? 'danger' : ''}`}
              onClick={() => {
                if (section.id === 'privacy') {
                  onClose();
                  navigate('/more/privacy-settings');
                } else if (section.id === 'balance') {
                  if (onClose) onClose();
                  navigate('/balance', { state: { from: '/profile' } });
                } else if (section.id === 'creator') {
                  setShowCreatorTools(true);
                } else if (section.id === 'business') {
                  setShowBusinessTools(true);
                } else if (section.id === 'personal') {
                  setShowPersonalTools(true);
                } else if (section.id === 'notifications') {
                  onClose();
                  navigate('/more/notification-settings');
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
                } else if (section.id === 'story') {
                  setShowStoryCreator(true);
                } else if (section.id === 'share') {
                  // Handle share functionality - FIXED: Generate specific profile URL with username
                  const profileUrl = `${window.location.origin}/user/${user?.username}`;
                  console.log('🔗 Sharing profile URL:', profileUrl);
                  
                  if (navigator.share) {
                    navigator.share({
                      title: `${user?.username}'s TikTok Profile`,
                      text: `Check out ${user?.username}'s profile on TikTok!`,
                      url: profileUrl
                    });
                  } else {
                    // Fallback for browsers that don't support Web Share API
                    navigator.clipboard.writeText(profileUrl);
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
              <div className="settings-arrow">
                <i className="fa-solid fa-chevron-right"></i>
              </div>
            </div>
          ))}
        </div>


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

        {/* Balance Modal - kept for backward compatibility if opened as modal */}
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

        {/* Story Creator Modal */}
        {showStoryCreator && (
          <StoryCreator 
            onClose={() => setShowStoryCreator(false)}
            onStoryCreated={() => {
              setShowStoryCreator(false);
              // Refresh stories after creation
              window.dispatchEvent(new Event('stories:refresh'));
            }}
          />
        )}

        {/* Story Viewer Modal - Render outside modal using portal */}
        {showStoryViewer && userStories.length > 0 && ReactDOM.createPortal(
          <StoryViewer
            storiesByUser={[{
              user: user,
              stories: userStories
            }]}
            startIndex={0}
            onClose={() => setShowStoryViewer(false)}
          />,
          document.body
        )}
      </div>
    </div>
  );
};

export default AccountSettings;














