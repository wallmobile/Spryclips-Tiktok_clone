import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getPushCampaigns,
  sendPushCampaign,
  getWarningMessages,
  sendWarningMessage
} from '../../api/admin';
import './NotificationsControl.css';
import './AdminPanel.css';

const NotificationsControl = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('push-campaigns');
  const [loading, setLoading] = useState(false);

  // Push Campaigns State
  const [campaigns, setCampaigns] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    scheduledTime: '',
    type: 'promotional'
  });

  // Warning Messages State
  const [warnings, setWarnings] = useState([]);
  const [warningSettings, setWarningSettings] = useState({
    autoSend: true,
    severityLevels: {
      minor: true,
      moderate: true,
      severe: true
    }
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    loadCampaigns();
    loadWarnings();
  }, [user, authLoading, navigate]);

  const loadCampaigns = async () => {
    try {
      const data = await getPushCampaigns();
      if (data.success && data.campaigns) {
        setCampaigns(data.campaigns);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setCampaigns([]);
    }
  };

  const loadWarnings = async () => {
    try {
      const data = await getWarningMessages();
      if (data.success && data.warnings) {
        setWarnings(data.warnings);
      } else {
        setWarnings([]);
      }
    } catch (error) {
      console.error('Error loading warnings:', error);
      setWarnings([]);
    }
  };

  const handleSendCampaign = async () => {
    if (!newCampaign.title || !newCampaign.message) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await sendPushCampaign(newCampaign);
      if (result.success) {
        alert('Push campaign sent successfully!');
        setNewCampaign({
          title: '',
          message: '',
          targetAudience: 'all',
          scheduledTime: '',
          type: 'promotional'
        });
        loadCampaigns();
      } else {
        throw new Error(result.message || 'Send failed');
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('Failed to send campaign: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendWarning = async (userId, severity) => {
    setLoading(true);
    try {
      const result = await sendWarningMessage(userId, severity);
      if (result.success) {
        alert(`Warning message sent to user!`);
        loadWarnings();
      } else {
        throw new Error(result.message || 'Send failed');
      }
    } catch (error) {
      console.error('Error sending warning:', error);
      alert('Failed to send warning: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="admin-loading">Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-panel-page-container">
      <div className="notifications-control">
        <div className="admin-page-header">
          <h2>Notifications Control</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-tabs-container">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'push-campaigns' ? 'active' : ''}`}
              onClick={() => setActiveTab('push-campaigns')}
            >
              <i className="fa-solid fa-bullhorn"></i>
              Push Campaigns
            </button>
            <button
              className={`admin-tab ${activeTab === 'warnings' ? 'active' : ''}`}
              onClick={() => setActiveTab('warnings')}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              Warning Messages
            </button>
          </div>
        </div>

        <div className="admin-content-area" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {activeTab === 'push-campaigns' && (
            <div className="push-campaigns-tab">
              <h3>Push Campaign Sends</h3>
              
              <div className="campaign-form-section">
                <h4>Create New Push Campaign</h4>
                <div className="campaign-form">
                  <div className="form-group">
                    <label>Campaign Title *</label>
                    <input
                      type="text"
                      value={newCampaign.title}
                      onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                      placeholder="Enter campaign title"
                    />
                  </div>
                  <div className="form-group">
                    <label>Message *</label>
                    <textarea
                      value={newCampaign.message}
                      onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                      placeholder="Enter message content"
                      rows="4"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Target Audience</label>
                      <select
                        value={newCampaign.targetAudience}
                        onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                      >
                        <option value="all">All Users</option>
                        <option value="active">Active Users</option>
                        <option value="premium">Premium Users</option>
                        <option value="new">New Users</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Campaign Type</label>
                      <select
                        value={newCampaign.type}
                        onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                      >
                        <option value="promotional">Promotional</option>
                        <option value="update">Update</option>
                        <option value="announcement">Announcement</option>
                        <option value="reminder">Reminder</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Schedule Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={newCampaign.scheduledTime}
                      onChange={(e) => setNewCampaign({ ...newCampaign, scheduledTime: e.target.value })}
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleSendCampaign}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Campaign'}
                  </button>
                </div>
              </div>

              <div className="campaigns-list-section">
                <h4>Campaign History</h4>
                {campaigns.length === 0 ? (
                  <div className="empty-state">No campaigns sent yet</div>
                ) : (
                  <div className="campaigns-list">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="campaign-item">
                        <div className="campaign-header">
                          <h5>{campaign.title}</h5>
                          <span className={`campaign-status status-${campaign.status}`}>
                            {campaign.status}
                          </span>
                        </div>
                        <p className="campaign-message">{campaign.message}</p>
                        <div className="campaign-details">
                          <span>Audience: {campaign.targetAudience}</span>
                          <span>Recipients: {campaign.recipients}</span>
                          <span>Sent: {campaign.sentDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="warnings-tab">
              <h3>Warning Messages to Rule Breakers</h3>
              
              <div className="warning-settings-section">
                <h4>Warning Settings</h4>
                <div className="settings-grid">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h5>Auto-Send Warnings</h5>
                      <p>Automatically send warnings when violations are detected</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={warningSettings.autoSend}
                        onChange={(e) => setWarningSettings({ ...warningSettings, autoSend: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h5>Severity Levels</h5>
                      <p>Select which violation levels trigger warnings</p>
                    </div>
                    <div className="severity-checkboxes">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={warningSettings.severityLevels.minor}
                          onChange={(e) => setWarningSettings({
                            ...warningSettings,
                            severityLevels: {
                              ...warningSettings.severityLevels,
                              minor: e.target.checked
                            }
                          })}
                        />
                        <span>Minor</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={warningSettings.severityLevels.moderate}
                          onChange={(e) => setWarningSettings({
                            ...warningSettings,
                            severityLevels: {
                              ...warningSettings.severityLevels,
                              moderate: e.target.checked
                            }
                          })}
                        />
                        <span>Moderate</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={warningSettings.severityLevels.severe}
                          onChange={(e) => setWarningSettings({
                            ...warningSettings,
                            severityLevels: {
                              ...warningSettings.severityLevels,
                              severe: e.target.checked
                            }
                          })}
                        />
                        <span>Severe</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="warnings-list-section">
                <h4>Recent Warning Messages</h4>
                <div className="warnings-filters">
                  <select className="admin-filter-select">
                    <option value="all">All Severities</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                {warnings.length === 0 ? (
                  <div className="empty-state">No warnings sent yet</div>
                ) : (
                  <div className="warnings-list">
                    {warnings.map((warning) => (
                      <div key={warning.id} className="warning-item">
                        <div className="warning-info">
                          <h5>User: {warning.userId}</h5>
                          <p>{warning.message}</p>
                        </div>
                        <div className="warning-meta">
                          <span className={`severity-badge severity-${warning.severity}`}>
                            {warning.severity}
                          </span>
                          <span className="warning-date">{warning.sentDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsControl;
