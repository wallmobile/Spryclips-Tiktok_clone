import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axios';
import './NotificationSettings.css';

const NotificationSettings = ({ onClose }) => {
  useAuth(); // Get auth context but don't need to destructure user
  
  const [notificationSettings, setNotificationSettings] = useState({
    likes: {
      push: true,
      email: false,
      sms: false
    },
    comments: {
      push: true,
      email: true,
      sms: false
    },
    mentions: {
      push: true,
      email: true,
      sms: true
    },
    followers: {
      push: true,
      email: false,
      sms: false
    },
    liveAlerts: {
      push: true,
      email: false,
      sms: false
    },
    directMessages: {
      push: true,
      email: true,
      sms: false
    },
    videoUploads: {
      push: false,
      email: true,
      sms: false
    }
  });
  const [frequency, setFrequency] = useState('instant');
  const [quietHours, setQuietHours] = useState({
    enabled: true,
    from: '22:00',
    to: '08:00'
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Add cache buster to prevent 304 cached response
        const response = await api.get('/api/users/notification-settings', {
          headers: { 'Cache-Control': 'no-cache' },
          params: { _t: Date.now() }
        });
        
        console.log('Loaded notification settings:', response.data);
        
        if (response.data.success && response.data.notificationSettings) {
          // Deep merge each category
          setNotificationSettings(prev => {
            const merged = { ...prev };
            Object.keys(response.data.notificationSettings).forEach(category => {
              if (merged[category] && response.data.notificationSettings[category]) {
                merged[category] = {
                  ...merged[category],
                  ...response.data.notificationSettings[category]
                };
              }
            });
            return merged;
          });
        }
        if (response.data.notificationFrequency) {
          setFrequency(response.data.notificationFrequency);
        }
        if (response.data.quietHours) {
          setQuietHours({
            enabled: response.data.quietHours.enabled || false,
            from: response.data.quietHours.from || '22:00',
            to: response.data.quietHours.to || '08:00'
          });
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  const notificationCategories = [
    {
      id: 'likes',
      title: 'Likes',
      description: 'When someone likes your videos',
      icon: 'fa-solid fa-heart',
      color: '#007AFF'
    },
    {
      id: 'comments',
      title: 'Comments',
      description: 'When someone comments on your videos',
      icon: 'fa-solid fa-comment',
      color: '#0051D5'
    },
    {
      id: 'mentions',
      title: 'Mentions',
      description: 'When someone mentions you in videos or comments',
      icon: 'fa-solid fa-at',
      color: '#FF6B35'
    },
    {
      id: 'followers',
      title: 'New Followers',
      description: 'When someone starts following you',
      icon: 'fa-solid fa-user-plus',
      color: '#9B59B6'
    },
    {
      id: 'liveAlerts',
      title: 'Live Alerts',
      description: 'When accounts you follow go live',
      icon: 'fa-solid fa-broadcast-tower',
      color: '#E74C3C'
    },
    {
      id: 'directMessages',
      title: 'Direct Messages',
      description: 'When you receive new messages',
      icon: 'fa-solid fa-envelope',
      color: '#2ECC71'
    },
    {
      id: 'videoUploads',
      title: 'Video Uploads',
      description: 'When accounts you follow upload new videos',
      icon: 'fa-solid fa-video',
      color: '#F39C12'
    }
  ];

  const notificationTypes = [
    {
      id: 'push',
      title: 'Push Notifications',
      description: 'Instant notifications on your device',
      icon: 'fa-solid fa-mobile-screen'
    },
    {
      id: 'email',
      title: 'Email Notifications',
      description: 'Notifications sent to your email',
      icon: 'fa-solid fa-envelope'
    },
    {
      id: 'sms',
      title: 'SMS Notifications',
      description: 'Text messages to your phone',
      icon: 'fa-solid fa-message'
    }
  ];

  const saveSettings = async (settingsToSave, freq, qh) => {
    try {
      setSaving(true);
      const dataToSave = {
        notificationSettings: settingsToSave || notificationSettings,
        notificationFrequency: freq || frequency,
        quietHours: qh || quietHours
      };
      console.log('Saving settings:', dataToSave);
      await api.put('/api/users/notifications', dataToSave);
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setSaveMessage('Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (category, type) => {
    const newValue = !notificationSettings[category][type];
    const newSettings = {
      ...notificationSettings,
      [category]: {
        ...notificationSettings[category],
        [type]: newValue
      }
    };
    setNotificationSettings(newSettings);
    
    // Save with new settings immediately
    await saveSettings(newSettings, frequency, quietHours);
  };

  const handleMasterToggle = async (type, enabled) => {
    const updatedSettings = { ...notificationSettings };
    Object.keys(updatedSettings).forEach(category => {
      updatedSettings[category] = { ...updatedSettings[category], [type]: enabled };
    });
    setNotificationSettings(updatedSettings);
    await saveSettings(updatedSettings, frequency, quietHours);
  };

  const handleFrequencyChange = async (value) => {
    setFrequency(value);
    await saveSettings(notificationSettings, value, quietHours);
  };

  const handleQuietHoursToggle = async () => {
    const newQuietHours = {
      ...quietHours,
      enabled: !quietHours.enabled
    };
    setQuietHours(newQuietHours);
    await saveSettings(notificationSettings, frequency, newQuietHours);
  };

  const handleQuietHoursTimeChange = async (field, value) => {
    const newQuietHours = {
      ...quietHours,
      [field]: value
    };
    setQuietHours(newQuietHours);
    await saveSettings(notificationSettings, frequency, newQuietHours);
  };

  return (
    <div className="notification-settings-overlay" onClick={onClose}>
      <div className="notification-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notification-settings-header">
          <button className="notification-settings-close-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-x"></i>
          </button>
          <h2>Notification Settings</h2>
          <div className="notification-settings-header-placeholder"></div>
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

        {/* Full Page Scrollable Content */}
        <div className="notification-settings-content">
          {/* Master Controls */}
          <div className="master-controls-section">
            <h3>Quick Controls</h3>
            <div className="master-controls-grid">
              {notificationTypes.map(type => (
                <div key={type.id} className="master-control-item">
                  <div className="master-control-info">
                    <div className="master-control-icon">
                      <i className={type.icon}></i>
                    </div>
                    <div className="master-control-content">
                      <h4>{type.title}</h4>
                      <p>{type.description}</p>
                    </div>
                  </div>
                  <div className="master-control-actions">
                    <button
                      className="master-toggle-btn"
                      onClick={() => handleMasterToggle(type.id, true)}
                    >
                      Enable All
                    </button>
                    <button
                      className="master-toggle-btn secondary"
                      onClick={() => handleMasterToggle(type.id, false)}
                    >
                      Disable All
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <h3>Notification Categories</h3>
          
          {/* Notification Categories */}
          <div className="notification-categories">
            {notificationCategories.map(category => (
              <div key={category.id} className="notification-category-card">
                <div className="category-header">
                  <div className="category-icon">
                    <i className={category.icon}></i>
                  </div>
                  <div className="category-info">
                    <h4>{category.title}</h4>
                    <p>{category.description}</p>
                  </div>
                </div>
                
                <div className="category-toggles">
                  {notificationTypes.map(type => (
                    <div key={type.id} className="notification-toggle-item">
                      <div className="toggle-info">
                        <i className={type.icon}></i>
                        <span>{type.title.split(' ')[0]}</span>
                      </div>
                      <div
                        className={`notification-toggle-switch ${
                          notificationSettings[category.id][type.id] ? 'active' : ''
                        }`}
                        onClick={() => handleToggle(category.id, type.id)}
                      >
                        <div className="notification-toggle-slider"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Notification Frequency */}
          <div className="notification-frequency-section">
            <h3>Notification Frequency</h3>
            <div className="frequency-options">
              <div className="frequency-option">
                <input 
                  type="radio" 
                  id="instant" 
                  name="frequency" 
                  checked={frequency === 'instant'}
                  onChange={() => handleFrequencyChange('instant')}
                />
                <label htmlFor="instant">
                  <div className="frequency-content">
                    <h5>Instant</h5>
                    <p>Receive notifications immediately</p>
                  </div>
                </label>
              </div>
              <div className="frequency-option">
                <input 
                  type="radio" 
                  id="bundled" 
                  name="frequency"
                  checked={frequency === 'bundled'}
                  onChange={() => handleFrequencyChange('bundled')}
                />
                <label htmlFor="bundled">
                  <div className="frequency-content">
                    <h5>Bundled</h5>
                    <p>Receive notifications in batches</p>
                  </div>
                </label>
              </div>
              <div className="frequency-option">
                <input 
                  type="radio" 
                  id="daily" 
                  name="frequency"
                  checked={frequency === 'daily'}
                  onChange={() => handleFrequencyChange('daily')}
                />
                <label htmlFor="daily">
                  <div className="frequency-content">
                    <h5>Daily Summary</h5>
                    <p>Receive a daily summary of activities</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="quiet-hours-section">
            <h3>Quiet Hours</h3>
            <div className="quiet-hours-card">
              <div className="quiet-hours-info">
                <i className="fa-solid fa-moon"></i>
                <div className="quiet-hours-content">
                  <h4>Do Not Disturb</h4>
                  <p>Pause notifications during these hours</p>
                </div>
              </div>
              <div className="quiet-hours-controls">
                <div className="time-input-group">
                  <label>From</label>
                  <input 
                    type="time" 
                    value={quietHours.from}
                    onChange={(e) => handleQuietHoursTimeChange('from', e.target.value)}
                  />
                </div>
                <div className="time-input-group">
                  <label>To</label>
                  <input 
                    type="time" 
                    value={quietHours.to}
                    onChange={(e) => handleQuietHoursTimeChange('to', e.target.value)}
                  />
                </div>
                <div className="quiet-hours-toggle">
                  <div 
                    className={`notification-toggle-switch ${quietHours.enabled ? 'active' : ''}`}
                    onClick={handleQuietHoursToggle}
                  >
                    <div className="notification-toggle-slider"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;














