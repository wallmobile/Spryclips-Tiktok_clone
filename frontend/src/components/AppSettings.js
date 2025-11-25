import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../config/axios';
import './AppSettings.css';

const AppSettings = ({ onClose }) => {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  
  const [settings, setSettings] = useState({
    darkMode: darkMode,
    dataSaver: false,
    autoPlay: true,
    notifications: true,
    locationServices: false,
    analytics: true
  });

  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedRegion, setSelectedRegion] = useState('United States');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [cacheSize] = useState('245 MB');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/api/auth/verify');
        const userData = response.data.user;
        if (userData?.appSettings) {
          setSettings(prev => ({
            ...prev,
            ...userData.appSettings
          }));
          if (userData.appSettings.darkMode !== undefined) {
            setDarkMode(userData.appSettings.darkMode);
          }
        }
        if (userData?.preferredLanguage) {
          setSelectedLanguage(userData.preferredLanguage);
        }
        if (userData?.preferredRegion) {
          setSelectedRegion(userData.preferredRegion);
        }
      } catch (error) {
        console.error('Failed to load app settings:', error);
      }
    };
    loadSettings();
  }, [setDarkMode]);

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' }
  ];

  const regions = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 
    'France', 'Spain', 'Italy', 'Japan', 'South Korea', 'Brazil', 'Mexico',
    'India', 'China', 'Russia', 'Netherlands', 'Sweden', 'Norway'
  ];

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.put('/api/users/app-settings', {
        appSettings: settings,
        preferredLanguage: selectedLanguage,
        preferredRegion: selectedRegion
      });
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save app settings:', error);
      setSaveMessage('Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));
    
    // Apply dark mode immediately if toggled
    if (key === 'darkMode') {
      setDarkMode(newValue);
    }
    
    // Auto-save after toggle
    setTimeout(() => {
      saveSettings();
    }, 500);
  };

  const handleLanguageSelect = async (language) => {
    setSelectedLanguage(language.name);
    setShowLanguageModal(false);
    setSaveMessage(`Language changed to ${language.native}`);
    setTimeout(() => {
      setSaveMessage('');
      saveSettings();
    }, 2000);
  };

  const handleRegionSelect = async (region) => {
    setSelectedRegion(region);
    setShowRegionModal(false);
    setSaveMessage(`Region changed to ${region}`);
    setTimeout(() => {
      setSaveMessage('');
      saveSettings();
    }, 2000);
  };

  const handleClearCache = () => {
    setShowClearCacheModal(false);
    // Clear browser cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    // Clear localStorage (except auth)
    const authToken = localStorage.getItem('token');
    localStorage.clear();
    if (authToken) {
      localStorage.setItem('token', authToken);
    }
    setSaveMessage('Cache cleared successfully! App may take longer to load initially.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    onClose();
  };

  const appSettingsSections = [
    {
      id: 'appearance',
      title: 'Appearance',
      items: [
        {
          id: 'darkMode',
          title: 'Dark Mode',
          description: 'Use dark theme throughout the app',
          icon: 'fa-solid fa-moon',
          type: 'toggle',
          value: settings.darkMode
        }
      ]
    },
    {
      id: 'localization',
      title: 'Language & Region',
      items: [
        {
          id: 'language',
          title: 'Language',
          description: selectedLanguage,
          icon: 'fa-solid fa-language',
          type: 'select',
          action: () => setShowLanguageModal(true)
        },
        {
          id: 'region',
          title: 'Region',
          description: selectedRegion,
          icon: 'fa-solid fa-globe',
          type: 'select',
          action: () => setShowRegionModal(true)
        }
      ]
    },
    {
      id: 'performance',
      title: 'Performance',
      items: [
        {
          id: 'dataSaver',
          title: 'Data Saver Mode',
          description: 'Reduce data usage for videos',
          icon: 'fa-solid fa-wifi',
          type: 'toggle',
          value: settings.dataSaver
        },
        {
          id: 'autoPlay',
          title: 'Auto-play Videos',
          description: 'Automatically play videos in feed',
          icon: 'fa-solid fa-play',
          type: 'toggle',
          value: settings.autoPlay
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Data',
      items: [
        {
          id: 'locationServices',
          title: 'Location Services',
          description: 'Allow location-based features',
          icon: 'fa-solid fa-location-dot',
          type: 'toggle',
          value: settings.locationServices
        },
        {
          id: 'analytics',
          title: 'Analytics & Insights',
          description: 'Help improve TikTok with usage data',
          icon: 'fa-solid fa-chart-simple',
          type: 'toggle',
          value: settings.analytics
        }
      ]
    },
    {
      id: 'storage',
      title: 'Storage',
      items: [
        {
          id: 'clearCache',
          title: 'Clear Cache',
          description: `${cacheSize} of cached data`,
          icon: 'fa-solid fa-broom',
          type: 'action',
          action: () => setShowClearCacheModal(true)
        }
      ]
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        {
          id: 'logout',
          title: 'Log Out',
          description: 'Sign out of your account',
          icon: 'fa-solid fa-right-from-bracket',
          type: 'action',
          action: () => setShowLogoutModal(true),
          danger: true
        }
      ]
    }
  ];

  return (
    <div className="app-settings-overlay" onClick={onClose}>
      <div className="app-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="app-settings-header">
          <button className="app-settings-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>App Settings</h2>
          <div className="app-settings-header-placeholder"></div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div style={{
            padding: '0.75rem 1.25rem',
            background: saveMessage.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: saveMessage.includes('Failed') ? '#DC2626' : '#16A34A',
            fontSize: '0.875rem',
            fontWeight: '500',
            textAlign: 'center',
            borderBottom: `1px solid ${saveMessage.includes('Failed') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
          }}>
            {saveMessage}
          </div>
        )}

        {/* User Info */}
        <div className="app-settings-user-info">
          <div className="user-avatar">
            <img
              src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=E50914&color=fff`}
              alt={user?.username}
            />
          </div>
          <div className="user-details">
            <h3>{user?.profile?.displayName || user?.username}</h3>
            <p>@{user?.username}</p>
          </div>
        </div>

        {/* Settings Content */}
        <div className="app-settings-content">
          {appSettingsSections.map((section) => (
            <div key={section.id} className="app-settings-section">
              <h3 className="section-title">{section.title}</h3>
              <div className="section-items">
                {section.items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`app-settings-item ${item.danger ? 'danger' : ''} ${item.type === 'action' ? 'clickable' : ''}`}
                    onClick={item.action}
                  >
                    <div className="settings-item-icon">
                      <i className={item.icon}></i>
                    </div>
                    <div className="settings-item-content">
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </div>
                    <div className="settings-item-control">
                      {item.type === 'toggle' && (
                        <div 
                          className={`app-toggle-switch ${item.value ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(item.id);
                          }}
                        >
                          <div className="app-toggle-slider">
                            <div className="app-toggle-thumb"></div>
                          </div>
                        </div>
                      )}
                      {item.type === 'select' && (
                        <div className="settings-arrow">
                          <i className="fa-solid fa-chevron-right"></i>
                        </div>
                      )}
                      {item.type === 'action' && (
                        <div className="settings-arrow">
                          <i className="fa-solid fa-chevron-right"></i>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div className="app-modal-overlay" onClick={() => setShowLanguageModal(false)}>
            <div className="app-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="app-modal-header">
                <h3>Select Language</h3>
                <button className="app-modal-close" onClick={() => setShowLanguageModal(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="app-modal-body">
                <div className="language-list">
                  {languages.map((language) => (
                    <div 
                      key={language.code}
                      className={`language-item ${selectedLanguage === language.name ? 'selected' : ''}`}
                      onClick={() => handleLanguageSelect(language)}
                    >
                      <div className="language-info">
                        <span className="language-name">{language.name}</span>
                        <span className="language-native">{language.native}</span>
                      </div>
                      {selectedLanguage === language.name && (
                        <div className="language-check">
                          <i className="fa-solid fa-check"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Region Selection Modal */}
        {showRegionModal && (
          <div className="app-modal-overlay" onClick={() => setShowRegionModal(false)}>
            <div className="app-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="app-modal-header">
                <h3>Select Region</h3>
                <button className="app-modal-close" onClick={() => setShowRegionModal(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="app-modal-body">
                <div className="region-list">
                  {regions.map((region) => (
                    <div 
                      key={region}
                      className={`region-item ${selectedRegion === region ? 'selected' : ''}`}
                      onClick={() => handleRegionSelect(region)}
                    >
                      <span className="region-name">{region}</span>
                      {selectedRegion === region && (
                        <div className="region-check">
                          <i className="fa-solid fa-check"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear Cache Confirmation Modal */}
        {showClearCacheModal && (
          <div className="app-modal-overlay" onClick={() => setShowClearCacheModal(false)}>
            <div className="app-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="app-modal-header">
                <h3>Clear Cache</h3>
                <button className="app-modal-close" onClick={() => setShowClearCacheModal(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="app-modal-body">
                <div className="cache-info">
                  <div className="cache-icon">
                    <i className="fa-solid fa-broom"></i>
                  </div>
                  <h4>Clear {cacheSize} of cached data?</h4>
                  <p>This will free up storage space but may make the app slower initially as it rebuilds the cache.</p>
                  <ul>
                    <li>Cached videos and images will be removed</li>
                    <li>App may take longer to load content</li>
                    <li>Your account and settings will not be affected</li>
                  </ul>
                </div>
                <div className="cache-actions">
                  <button 
                    className="cancel-cache-btn"
                    onClick={() => setShowClearCacheModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-cache-btn"
                    onClick={handleClearCache}
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="app-modal-overlay" onClick={() => setShowLogoutModal(false)}>
            <div className="app-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="app-modal-header">
                <h3>Log Out</h3>
                <button className="app-modal-close" onClick={() => setShowLogoutModal(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="app-modal-body">
                <div className="logout-info">
                  <div className="logout-icon">
                    <i className="fa-solid fa-right-from-bracket"></i>
                  </div>
                  <h4>Are you sure you want to log out?</h4>
                  <p>You'll need to sign in again to access your account.</p>
                </div>
                <div className="logout-actions">
                  <button 
                    className="cancel-logout-btn"
                    onClick={() => setShowLogoutModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="confirm-logout-btn"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSettings;














