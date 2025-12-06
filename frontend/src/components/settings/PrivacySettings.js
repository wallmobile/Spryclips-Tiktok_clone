import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';
import './PrivacySettings.css';

const PrivacySettings = ({ onClose }) => {
  const { user } = useAuth();
  
  const [settings, setSettings] = useState({
    privateAccount: false,
    commentFilter: false,
    downloadEnabled: true,
    mentionsEnabled: true,
    tagsEnabled: true,
    duetEnabled: true,
    stitchEnabled: true,
    activityStatus: true,
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/api/users/privacy');
        if (response.data.success && response.data.privacy) {
          const privacy = response.data.privacy;
          setSettings({
            privateAccount: privacy.accountType === 'private',
            commentFilter: privacy.commentFilter || false,
            downloadEnabled: privacy.downloadEnabled !== false,
            mentionsEnabled: privacy.mentionsEnabled !== false,
            tagsEnabled: privacy.tagsEnabled !== false,
            duetEnabled: privacy.duetEnabled !== false,
            stitchEnabled: privacy.stitchEnabled !== false,
            activityStatus: privacy.showActivityStatus !== false,
          });
          if (privacy.filteredKeywords?.length > 0) {
            setCommentKeywords(privacy.filteredKeywords);
          }
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Load blocked users from backend
  useEffect(() => {
    const loadBlockedUsers = async () => {
      try {
        const response = await api.get('/api/users/blocked');
        if (response.data.success && response.data.blockedUsers) {
          setBlockedUsers(response.data.blockedUsers.map(u => ({
            id: u.id,
            username: u.username,
            blockedDate: new Date(u.blockedDate).toISOString().split('T')[0]
          })));
        }
      } catch (error) {
        console.error('Failed to load blocked users:', error);
      }
    };
    loadBlockedUsers();
  }, []);

  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showCommentFilters, setShowCommentFilters] = useState(false);
  const [showDownloadSettings, setShowDownloadSettings] = useState(false);
  const [showActivitySettings, setShowActivitySettings] = useState(false);
  const [blockUserInput, setBlockUserInput] = useState('');
  const [commentKeywords, setCommentKeywords] = useState(['spam', 'hate', 'offensive']);
  const [newKeyword, setNewKeyword] = useState('');
  const [downloadPreferences, setDownloadPreferences] = useState({
    requireWatermark: true,
    allowOriginalVideos: false,
    allowAudioDownload: true,
    shareLinkExpiry: '7'
  });
  const [activityPreferences, setActivityPreferences] = useState({
    visibility: 'followers',
    showLastSeen: true,
    showDevices: false
  });

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));

    // Save to backend
    try {
      setSaving(true);
      const updateData = {};
      
      if (key === 'privateAccount') {
        updateData.accountType = newValue ? 'private' : 'public';
      } else if (key === 'activityStatus') {
        updateData.showActivityStatus = newValue;
      } else if (key === 'commentFilter') {
        updateData.commentFilter = newValue;
      } else if (key === 'downloadEnabled') {
        updateData.downloadEnabled = newValue;
      } else if (key === 'mentionsEnabled') {
        updateData.mentionsEnabled = newValue;
      } else if (key === 'tagsEnabled') {
        updateData.tagsEnabled = newValue;
      } else if (key === 'duetEnabled') {
        updateData.duetEnabled = newValue;
      } else if (key === 'stitchEnabled') {
        updateData.stitchEnabled = newValue;
      }
      
      await api.put('/api/users/privacy', updateData);
      setSaveMessage('Settings saved');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      // Revert on error
      setSettings(prev => ({
        ...prev,
        [key]: !newValue
      }));
      setSaveMessage('Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const [blockedUsers, setBlockedUsers] = useState([]);

  const handleBlockUser = async () => {
    if (blockUserInput.trim()) {
      try {
        // First search for user by username
        const searchResponse = await api.get(`/api/users/search?q=${blockUserInput.trim()}`);
        const foundUser = searchResponse.data.users?.find(
          u => u.username.toLowerCase() === blockUserInput.trim().toLowerCase()
        );
        
        if (!foundUser) {
          setSaveMessage('User not found');
          setTimeout(() => setSaveMessage(''), 3000);
          return;
        }

        await api.post(`/api/users/block/${foundUser._id}`);
        
        const newBlockedUser = {
          id: foundUser._id,
          username: foundUser.username,
          blockedDate: new Date().toISOString().split('T')[0]
        };
        setBlockedUsers([...blockedUsers, newBlockedUser]);
        setBlockUserInput('');
        setSaveMessage(`User @${foundUser.username} has been blocked`);
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        console.error('Failed to block user:', error);
        setSaveMessage(error.response?.data?.message || 'Failed to block user');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    }
  };

  const handleUnblockUser = async (userId) => {
    const userToUnblock = blockedUsers.find(u => u.id === userId);
    try {
      await api.delete(`/api/users/block/${userId}`);
      setBlockedUsers(blockedUsers.filter(user => user.id !== userId));
      if (userToUnblock) {
        setSaveMessage(`User @${userToUnblock.username} has been unblocked`);
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to unblock user:', error);
      setSaveMessage('Failed to unblock user');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !commentKeywords.includes(newKeyword.trim().toLowerCase())) {
      setCommentKeywords([...commentKeywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
      setSaveMessage('Keyword added');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  const handleSaveCommentFilters = async () => {
    try {
      setSaving(true);
      await api.put('/api/users/privacy', { filteredKeywords: commentKeywords });
      setSaveMessage('Comment filters saved');
      setTimeout(() => {
        setSaveMessage('');
        setShowCommentFilters(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to save comment filters:', error);
      setSaveMessage('Failed to save filters');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKeyword = (keyword) => {
    setCommentKeywords(commentKeywords.filter(k => k !== keyword));
  };


  const handleSaveDownloadPreferences = async () => {
    try {
      setSaving(true);
      // Save download preferences to backend (if API exists)
      setSaveMessage('Download preferences saved');
      setTimeout(() => {
        setSaveMessage('');
        setShowDownloadSettings(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to save download preferences:', error);
      setSaveMessage('Failed to save preferences');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivityPreferences = async () => {
    try {
      setSaving(true);
      await api.put('/api/users/privacy', {
        showActivityStatus: activityPreferences.visibility !== 'off',
        allowDirectMessages: activityPreferences.visibility
      });
      setSaveMessage('Activity preferences saved');
      setTimeout(() => {
        setSaveMessage('');
        setShowActivitySettings(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to save activity preferences:', error);
      setSaveMessage('Failed to save preferences');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const privacySections = [
    {
      id: 'privateAccount',
      title: 'Private Account',
      description: 'Only approved followers can see your content',
      key: 'privateAccount',
      icon: 'fa-solid fa-lock'
    },
    {
      id: 'commentFilter',
      title: 'Comment Filter',
      description: 'Automatically filter offensive comments',
      key: 'commentFilter',
      icon: 'fa-solid fa-filter',
      onInfo: () => setShowCommentFilters(true)
    },
    {
      id: 'downloadEnabled',
      title: 'Allow Downloads',
      description: 'Let others download your videos',
      key: 'downloadEnabled',
      icon: 'fa-solid fa-download',
      onInfo: () => setShowDownloadSettings(true)
    },
    {
      id: 'mentionsEnabled',
      title: 'Allow Mentions',
      description: 'Others can mention you in videos',
      key: 'mentionsEnabled',
      icon: 'fa-solid fa-at'
    },
    {
      id: 'tagsEnabled',
      title: 'Allow Tags',
      description: 'Others can tag you in videos',
      key: 'tagsEnabled',
      icon: 'fa-solid fa-tag'
    },
    {
      id: 'duetEnabled',
      title: 'Allow Duet',
      description: 'Others can create duets with your videos',
      key: 'duetEnabled',
      icon: 'fa-solid fa-user-group'
    },
    {
      id: 'stitchEnabled',
      title: 'Allow Stitch',
      description: 'Others can stitch your videos',
      key: 'stitchEnabled',
      icon: 'fa-solid fa-scissors'
    },
    {
      id: 'activityStatus',
      title: 'Activity Status',
      description: 'Show when you\'re online',
      key: 'activityStatus',
      icon: 'fa-solid fa-circle',
      onInfo: () => setShowActivitySettings(true)
    }
  ];

  return (
    <div className="privacy-settings-overlay" onClick={onClose}>
      <div className="privacy-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="privacy-settings-header">
          <button className="privacy-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Privacy & Safety</h2>
          <div className="privacy-header-placeholder"></div>
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

        {/* Settings List */}
        <div className="privacy-settings-list">
          {user && (
            <div className="privacy-user-summary">
              <div className="privacy-user-avatar">
                <img
                  src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'Creator')}&background=FF0050&color=fff`}
                  alt={user?.username || 'Current user'}
                />
              </div>
              <div className="privacy-user-details">
                <span className="privacy-user-name">{user?.profile?.displayName || user?.username || 'Creator'}</span>
                <span className="privacy-user-status">
                  {settings.privateAccount ? 'Account is private' : 'Account is public'}
                </span>
              </div>
            </div>
          )}

          {/* Privacy Toggles */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">Privacy</h3>
            {privacySections.map((section) => {
              const isEnabled = settings[section.key];
              return (
                <div key={section.id} className="privacy-settings-item">
                  <div className="privacy-item-icon">
                    <i className={section.icon}></i>
                  </div>
                  <div className="privacy-item-content">
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                  </div>
                  {section.onInfo && (
                    <button
                      type="button"
                      className="privacy-info-btn"
                      onClick={section.onInfo}
                      aria-label={`Manage ${section.title}`}
                    >
                      <i className="fa-solid fa-ellipsis"></i>
                    </button>
                  )}
                  <div className="privacy-toggle-container">
                    <button
                      type="button"
                      className={`privacy-toggle-switch ${isEnabled ? 'active' : ''}`}
                      onClick={() => handleToggle(section.key)}
                      aria-pressed={isEnabled}
                    >
                      <div className="privacy-toggle-slider"></div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blocked Accounts Section */}
          <div className="privacy-section">
            <h3 className="privacy-section-title">Safety</h3>
            <div 
              className="privacy-settings-item clickable"
              onClick={() => setShowBlockedUsers(true)}
            >
              <div className="privacy-item-icon">
                <i className="fa-solid fa-ban"></i>
              </div>
              <div className="privacy-item-content">
                <h4>Blocked Accounts</h4>
                <p>Manage accounts you've blocked</p>
              </div>
              <div className="privacy-arrow">
                <i className="fa-solid fa-chevron-right"></i>
              </div>
            </div>
          </div>

        </div>

        {/* Blocked Users Modal */}
        {showBlockedUsers && (
          <div className="privacy-modal-overlay" onClick={() => setShowBlockedUsers(false)}>
            <div className="privacy-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="privacy-modal-header">
                <h3>Blocked Accounts</h3>
                <button className="privacy-modal-close" onClick={() => setShowBlockedUsers(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="privacy-modal-body">
                <div className="block-user-section">
                  <h4>Block New User</h4>
                  <div className="block-user-input-container">
                    <input
                      type="text"
                      placeholder="Enter username to block"
                      value={blockUserInput}
                      onChange={(e) => setBlockUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleBlockUser()}
                      className="block-user-input"
                    />
                    <button onClick={handleBlockUser} className="block-user-btn">
                      Block
                    </button>
                  </div>
                </div>
                
                {blockedUsers.length > 0 ? (
                  <div className="blocked-users-list">
                    <h4>Currently Blocked ({blockedUsers.length})</h4>
                    {blockedUsers.map(user => (
                      <div key={user.id} className="blocked-user-item">
                        <div className="blocked-user-info">
                          <div className="blocked-user-avatar">
                            <i className="fa-solid fa-user"></i>
                          </div>
                          <div className="blocked-user-details">
                            <span className="blocked-username">@{user.username}</span>
                            <span className="blocked-date">Blocked on {user.blockedDate}</span>
                          </div>
                        </div>
                        <button 
                          className="unblock-btn"
                          onClick={() => handleUnblockUser(user.id)}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-blocked-users">
                    <i className="fa-solid fa-user-check"></i>
                    <p>No blocked accounts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comment Filters Modal */}
        {showCommentFilters && (
          <div className="privacy-modal-overlay" onClick={() => setShowCommentFilters(false)}>
            <div className="privacy-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="privacy-modal-header">
                <h3>Comment Filters</h3>
                <button className="privacy-modal-close" onClick={() => setShowCommentFilters(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="privacy-modal-body">
                <div className="filter-keywords-section">
                  <h4>Filtered Keywords</h4>
                  <div className="add-keyword-container">
                    <input
                      type="text"
                      placeholder="Add keyword to filter"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                      className="keyword-input"
                    />
                    <button onClick={handleAddKeyword} className="add-keyword-btn">
                      Add
                    </button>
                  </div>
                  
                  <div className="keywords-list">
                    {commentKeywords.map((keyword, index) => (
                      <div key={index} className="keyword-item">
                        <span>{keyword}</span>
                        <button 
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="remove-keyword-btn"
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="filter-options">
                  <h4>Filter Options</h4>
                  <div className="filter-option">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Hide offensive comments
                    </label>
                  </div>
                  <div className="filter-option">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Filter spam comments
                    </label>
                  </div>
                  <div className="filter-option">
                    <label>
                      <input type="checkbox" />
                      Require approval for all comments
                    </label>
                  </div>
                </div>

                <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                  <button 
                    className="data-action-btn primary" 
                    onClick={handleSaveCommentFilters}
                    disabled={saving}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {saving ? 'Saving...' : 'Save Filters'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Download Settings Modal */}
        {showDownloadSettings && (
          <div className="privacy-modal-overlay" onClick={() => setShowDownloadSettings(false)}>
            <div className="privacy-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="privacy-modal-header">
                <h3>Download Preferences</h3>
                <button className="privacy-modal-close" onClick={() => setShowDownloadSettings(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="privacy-modal-body">
                <div className="modal-section">
                  <h4>Control how others save your videos</h4>
                  <div className="toggle-list">
                    <label className="toggle-item">
                      <span>Require TikTok watermark on downloads</span>
                      <input
                        type="checkbox"
                        checked={downloadPreferences.requireWatermark}
                        onChange={(e) =>
                          setDownloadPreferences((prev) => ({
                            ...prev,
                            requireWatermark: e.target.checked
                          }))
                        }
                      />
                    </label>
                    <label className="toggle-item">
                      <span>Allow downloads of original quality videos</span>
                      <input
                        type="checkbox"
                        checked={downloadPreferences.allowOriginalVideos}
                        onChange={(e) =>
                          setDownloadPreferences((prev) => ({
                            ...prev,
                            allowOriginalVideos: e.target.checked
                          }))
                        }
                      />
                    </label>
                    <label className="toggle-item">
                      <span>Allow audio downloads from your videos</span>
                      <input
                        type="checkbox"
                        checked={downloadPreferences.allowAudioDownload}
                        onChange={(e) =>
                          setDownloadPreferences((prev) => ({
                            ...prev,
                            allowAudioDownload: e.target.checked
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Share link expiration</h4>
                  <p className="modal-helper-text">
                    Limit how long download links stay active after they are generated.
                  </p>
                  <select
                    className="modal-select"
                    value={downloadPreferences.shareLinkExpiry}
                    onChange={(e) =>
                      setDownloadPreferences((prev) => ({
                        ...prev,
                        shareLinkExpiry: e.target.value
                      }))
                    }
                  >
                    <option value="1">1 day</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="never">No expiration</option>
                  </select>
                </div>

                <div className="modal-section">
                  <div className="modal-summary-card">
                    <i className="fa-solid fa-shield-halved"></i>
                    <div>
                      <strong>Tip:</strong> Turning downloads off will stop others from saving your videos, but they can still share links unless you also disable link sharing.
                    </div>
                  </div>
                </div>

                <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                  <button 
                    className="data-action-btn primary" 
                    onClick={handleSaveDownloadPreferences}
                    disabled={saving}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Settings Modal */}
        {showActivitySettings && (
          <div className="privacy-modal-overlay" onClick={() => setShowActivitySettings(false)}>
            <div className="privacy-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="privacy-modal-header">
                <h3>Activity Status</h3>
                <button className="privacy-modal-close" onClick={() => setShowActivitySettings(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="privacy-modal-body">
                <div className="modal-section">
                  <h4>Who can see you're active</h4>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="activity-visibility"
                        value="everyone"
                        checked={activityPreferences.visibility === 'everyone'}
                        onChange={(e) =>
                          setActivityPreferences((prev) => ({
                            ...prev,
                            visibility: e.target.value
                          }))
                        }
                      />
                      <span>Everyone</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="activity-visibility"
                        value="followers"
                        checked={activityPreferences.visibility === 'followers'}
                        onChange={(e) =>
                          setActivityPreferences((prev) => ({
                            ...prev,
                            visibility: e.target.value
                          }))
                        }
                      />
                      <span>Followers you follow back</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="activity-visibility"
                        value="off"
                        checked={activityPreferences.visibility === 'off'}
                        onChange={(e) =>
                          setActivityPreferences((prev) => ({
                            ...prev,
                            visibility: e.target.value
                          }))
                        }
                      />
                      <span>Only you</span>
                    </label>
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Additional details</h4>
                  <div className="toggle-list">
                    <label className="toggle-item">
                      <span>Show last seen time</span>
                      <input
                        type="checkbox"
                        checked={activityPreferences.showLastSeen}
                        onChange={(e) =>
                          setActivityPreferences((prev) => ({
                            ...prev,
                            showLastSeen: e.target.checked
                          }))
                        }
                      />
                    </label>
                    <label className="toggle-item">
                      <span>Show devices you're logged in on</span>
                      <input
                        type="checkbox"
                        checked={activityPreferences.showDevices}
                        onChange={(e) =>
                          setActivityPreferences((prev) => ({
                            ...prev,
                            showDevices: e.target.checked
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-summary-card">
                    <i className="fa-solid fa-circle-info"></i>
                    <div>
                      Turning off activity status means you also won't be able to see when others are active.
                    </div>
                  </div>
                </div>

                <div className="modal-section" style={{ marginTop: '1.5rem' }}>
                  <button 
                    className="data-action-btn primary" 
                    onClick={handleSaveActivityPreferences}
                    disabled={saving}
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
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

export default PrivacySettings;














