// Notifications control page for campaigns and warnings
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
  getPushCampaigns,
  sendPushCampaign,
  getWarningMessages,
  sendWarningMessage,
  getWarningSettings,
  updateWarningSettings
} from '../../api/admin';
import './NotificationsControl.css';
import './AdminPanel.css';

const NotificationsControl = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'push-campaigns';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'push-campaigns';
    console.log('NotificationsControl: Setting activeTab to:', tab);
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab('push-campaigns'); // Default to push-campaigns
    }
  }, [searchParams]);
  
  // Ensure activeTab has a default value
  useEffect(() => {
    if (!activeTab) {
      console.log('NotificationsControl: No activeTab, setting to push-campaigns');
      setActiveTab('push-campaigns');
    }
  }, [activeTab]);
  
  // Debug: Log activeTab changes
  useEffect(() => {
    console.log('NotificationsControl: activeTab is now:', activeTab);
  }, [activeTab]);
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
  const [warningSettings, setWarningSettings] = useState(null); // null = loading, will be set from database
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [newWarning, setNewWarning] = useState({
    userId: '',
    severity: 'minor',
    message: '',
    violationType: ''
  });

  useEffect(() => {
    // Load data when user is available
    // ProtectedRoute handles authentication
    if (user) {
      console.log('NotificationsControl: Loading data for user:', user.email);
    loadCampaigns();
    loadWarnings();
      loadWarningSettings();
    }
  }, [user]);

  // Don't block rendering - ProtectedRoute handles auth

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
      console.log('Loading warnings from database...');
      const data = await getWarningMessages();
      console.log('Warnings data received:', data);
      if (data.success && data.warnings) {
        console.log('Setting warnings:', data.warnings.length, 'warnings found');
        setWarnings(data.warnings);
      } else {
        console.log('No warnings found or data.success is false');
        setWarnings([]);
      }
    } catch (error) {
      console.error('Error loading warnings:', error);
      setWarnings([]);
    }
  };

  const loadWarningSettings = async () => {
    try {
      setSettingsLoading(true);
      console.log('Loading warning settings from database...');
      const data = await getWarningSettings();
      console.log('Warning settings data received:', data);
      if (data.success && data.settings) {
        setWarningSettings({
          autoSendEnabled: data.settings.autoSendEnabled,
          severityLevels: data.settings.severityLevels || {
            minor: true,
            moderate: true,
            severe: true
          }
        });
        console.log('Warning settings loaded:', data.settings);
      } else {
        // Fallback to defaults if API fails
        console.log('Using default settings');
        setWarningSettings({
          autoSendEnabled: true,
          severityLevels: {
            minor: true,
            moderate: true,
            severe: true
          }
        });
      }
    } catch (error) {
      console.error('Error loading warning settings:', error);
      // Fallback to defaults on error
      setWarningSettings({
        autoSendEnabled: true,
        severityLevels: {
          minor: true,
          moderate: true,
          severe: true
        }
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingsChange = async (newSettings) => {
    // Optimistically update UI
    setWarningSettings(newSettings);
    
    // Save to database
    try {
      console.log('Saving warning settings to database:', newSettings);
      const result = await updateWarningSettings({
        autoSendEnabled: newSettings.autoSendEnabled,
        severityLevels: newSettings.severityLevels
      });
      
      if (result.success) {
        console.log('✅ Warning settings saved successfully to database');
        // Show success message
        alert('✅ Settings Saved!\n\nYour warning settings have been saved successfully.\n\nChanges will be applied immediately.');
      } else {
        console.error('❌ Failed to save warning settings:', result.message);
        alert('❌ Failed to Save Settings\n\n' + (result.message || 'Unknown error') + '\n\nPlease try again or check your connection.');
        // Revert on error
        loadWarningSettings();
      }
    } catch (error) {
      console.error('❌ Error saving warning settings:', error);
      alert('❌ Error Saving Settings\n\n' + (error.message || 'Unknown error') + '\n\nPlease try again or check your connection.');
      // Revert on error
      loadWarningSettings();
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

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!newWarning.userId || !newWarning.severity) {
      alert('⚠️ Missing Information\n\nPlease fill in:\n• User ID (required)\n• Severity level (required)\n\nThese fields are mandatory to send a warning.');
      return;
    }
    setLoading(true);
    try {
      const result = await sendWarningMessage({
        userId: newWarning.userId,
        severity: newWarning.severity,
        message: newWarning.message || undefined,
        violationType: newWarning.violationType || undefined
      });
      if (result.success) {
        // User-friendly success message
        const severityText = {
          minor: 'Minor',
          moderate: 'Moderate',
          severe: 'Severe'
        }[newWarning.severity] || newWarning.severity;
        
        alert(`✅ Success!\n\nWarning message has been sent successfully to the user.\n\nDetails:\n• Severity: ${severityText}\n• User will receive a notification\n• Warning saved in database\n\nThe user will see this warning in their notification center.`);
        
        setNewWarning({ userId: '', severity: 'minor', message: '', violationType: '' });
        loadWarnings();
      } else {
        throw new Error(result.message || 'Send failed');
      }
    } catch (error) {
      console.error('Error sending warning:', error);
      alert(`❌ Failed to Send Warning\n\n${error.message || 'Unknown error'}\n\nPlease check:\n• User ID is correct\n• User exists in database\n• Backend server is running`);
    } finally {
      setLoading(false);
    }
  };

  // ProtectedRoute handles authentication - don't block rendering

  return (
    <div className="admin-panel-page-container notifications-control-page">
      <div className="admin-panel-with-sidebar">
        {/* Sidebar - Fixed position, always on top */}
        <div className="notifications-sidebar-wrapper">
          <AdminSidebar 
            activeTab="notifications"
            setActiveTab={(tab) => {
              console.log('NotificationsControl: setActiveTab called with:', tab);
              // Handle navigation for main tabs
              if (tab === 'dashboard') navigate('/admin');
              else if (tab === 'users') navigate('/admin?tab=users');
              else if (tab === 'videos') navigate('/admin?tab=videos');
              else if (tab === 'stories') navigate('/admin?tab=stories');
              else if (tab === 'comments') navigate('/admin?tab=comments');
              else if (tab === 'moderation') navigate('/admin?tab=moderation');
              else if (tab === 'safety') navigate('/admin?tab=safety');
              else if (tab === 'monetization') navigate('/admin?tab=monetization');
              else if (tab === 'analytics') navigate('/admin?tab=analytics');
              else if (tab === 'search') navigate('/admin?tab=search');
              else if (tab === 'policy') navigate('/admin/policy-compliance?tab=age-restrictions');
              else if (tab === 'security') navigate('/admin/security-settings?tab=roles');
              else if (tab === 'system') navigate('/admin?tab=system');
              else if (tab === 'support') navigate('/admin?tab=support');
              else if (tab === 'notifications') navigate('/admin/notifications-control?tab=push-campaigns');
            }}
            activeSubTab={activeTab}
            setActiveSubTab={(subTab) => {
              console.log('NotificationsControl: setActiveSubTab called with:', subTab);
              if (subTab) {
                navigate(`/admin/notifications-control?tab=${subTab}`);
                setActiveTab(subTab);
              }
            }}
            onClose={onClose} 
          />
        </div>
        <div className="admin-panel-main-content notifications-main-content">
          <div className="notifications-control">
            <div className="admin-page-header notifications-header">
              <h2>
                Notifications Control
                {activeTab === 'push-campaigns' && ' → Push Campaigns'}
                {activeTab === 'warnings' && ' → Warning Messages'}
              </h2>
        </div>

            <div className="admin-content-area notifications-content-area">
          {(activeTab === 'push-campaigns' || !activeTab || activeTab === '') && (
            <div className="push-campaigns-tab notifications-content-wrapper">
              <h3 className="notifications-section-heading">Push Campaign Sends</h3>
              
              <div className="campaign-form-section">
                <h4 className="notifications-form-heading">Create New Push Campaign</h4>
                <div className="campaign-form">
                  <div className="form-group">
                    <label className="notifications-form-label">Campaign Title *</label>
                    <input
                      type="text"
                      value={newCampaign.title}
                      onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                      placeholder="Enter campaign title"
                      className="notifications-form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="notifications-form-label">Message *</label>
                    <textarea
                      value={newCampaign.message}
                      onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                      placeholder="Enter message content"
                      rows="4"
                      className="notifications-form-textarea"
                    />
                  </div>
                  <div className="form-row notifications-form-row">
                    <div className="form-group">
                      <label className="notifications-form-label">Target Audience</label>
                      <div className="admin-filter-select-wrapper">
                      <select
                        value={newCampaign.targetAudience}
                        onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                          className="admin-filter-select"
                      >
                        <option value="all">All Users</option>
                        <option value="active">Active Users</option>
                        <option value="premium">Premium Users</option>
                        <option value="new">New Users</option>
                      </select>
                    </div>
                    </div>
                    <div className="form-group">
                      <label className="notifications-form-label">Campaign Type</label>
                      <div className="admin-filter-select-wrapper">
                      <select
                        value={newCampaign.type}
                        onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                          className="admin-filter-select"
                      >
                        <option value="promotional">Promotional</option>
                        <option value="update">Update</option>
                        <option value="announcement">Announcement</option>
                        <option value="reminder">Reminder</option>
                      </select>
                    </div>
                  </div>
                  </div>
                  <div className="form-group">
                    <label className="notifications-form-label">Schedule Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={newCampaign.scheduledTime}
                      onChange={(e) => setNewCampaign({ ...newCampaign, scheduledTime: e.target.value })}
                      className="notifications-form-input"
                    />
                  </div>
                  <button
                    className="admin-btn admin-btn-primary notifications-form-submit"
                    onClick={handleSendCampaign}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Campaign'}
                  </button>
                </div>
              </div>

              <div className="campaigns-list-section">
                <h4 className="notifications-list-heading">Campaign History</h4>
                {campaigns.length === 0 ? (
                  <div className="admin-empty-state">
                    <div className="admin-empty-state-icon">📢</div>
                    <div className="admin-empty-state-title">No campaigns sent yet</div>
                    <div className="admin-empty-state-message">Create and send your first push campaign above</div>
                  </div>
                ) : (
                  <div className="campaigns-list">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id || campaign._id} className="campaign-item notifications-campaign-card">
                        <div className="campaign-header">
                          <h5 className="notifications-campaign-title">{campaign.title || 'Untitled Campaign'}</h5>
                          <span className={`campaign-status status-${campaign.status || 'sent'}`}>
                            {campaign.status || 'sent'}
                          </span>
                        </div>
                        <p className="campaign-message">{campaign.message || campaign.content || 'No message'}</p>
                        <div className="campaign-details">
                          <span><strong>Audience:</strong> {campaign.targetAudience || 'all'}</span>
                          <span><strong>Recipients:</strong> {campaign.recipients || campaign.recipientCount || 0}</span>
                          <span><strong>Sent:</strong> {campaign.sentDate ? new Date(campaign.sentDate).toLocaleDateString() : (campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'N/A')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'warnings' && (
            <div className="warnings-tab notifications-content-wrapper">
              <h3 className="notifications-section-heading">Warning Messages to Rule Breakers</h3>
              
              <div className="warning-settings-section">
                <h4 className="notifications-form-heading">Warning Settings</h4>
                <div className="settings-grid">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h5 className="notifications-setting-title">Auto-Send Warnings</h5>
                      <p className="notifications-setting-description">Automatically send warnings when violations are detected</p>
                    </div>
                    <label className={`toggle-switch ${settingsLoading || !warningSettings ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={warningSettings?.autoSendEnabled ?? true}
                        disabled={settingsLoading || !warningSettings}
                        onChange={(e) => handleSettingsChange({ ...warningSettings, autoSendEnabled: e.target.checked })}
                      />
                      <span className={`toggle-slider ${(warningSettings?.autoSendEnabled ?? true) ? 'checked' : ''} ${settingsLoading ? 'loading' : ''}`}>
                        <span className="toggle-slider-thumb"></span>
                      </span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h5 className="notifications-setting-title">Severity Levels</h5>
                      <p className="notifications-setting-description">Select which violation levels trigger warnings</p>
                    </div>
                    <div className="severity-checkboxes">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={warningSettings?.severityLevels?.minor ?? true}
                          disabled={settingsLoading || !warningSettings}
                          onChange={(e) => handleSettingsChange({
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
                          checked={warningSettings?.severityLevels?.moderate ?? true}
                          disabled={settingsLoading || !warningSettings}
                          onChange={(e) => handleSettingsChange({
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
                          checked={warningSettings?.severityLevels?.severe ?? true}
                          disabled={settingsLoading || !warningSettings}
                          onChange={(e) => handleSettingsChange({
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

              <div className="send-warning-section campaign-form-section">
                <h4 className="notifications-form-heading">Send Warning Message</h4>
                <form onSubmit={handleSendWarning} className="campaign-form">
                  <div className="form-group">
                    <label className="notifications-form-label">User ID *</label>
                    <input
                      type="text"
                      value={newWarning.userId}
                      onChange={(e) => setNewWarning({ ...newWarning, userId: e.target.value })}
                      placeholder="Enter user ID or username"
                      required
                      className="notifications-form-input"
                    />
                  </div>
                  <div className="form-row notifications-form-row">
                    <div className="form-group">
                      <label className="notifications-form-label">Severity *</label>
                      <div className="admin-filter-select-wrapper">
                      <select
                        value={newWarning.severity}
                        onChange={(e) => setNewWarning({ ...newWarning, severity: e.target.value })}
                        required
                          className="admin-filter-select"
                      >
                        <option value="minor">Minor</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                    </div>
                    <div className="form-group">
                      <label className="notifications-form-label">Violation Type</label>
                      <input
                        type="text"
                        value={newWarning.violationType}
                        onChange={(e) => setNewWarning({ ...newWarning, violationType: e.target.value })}
                        placeholder="e.g., Spam, Harassment, etc."
                        className="notifications-form-input"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="notifications-form-label">Message (Optional)</label>
                    <textarea
                      value={newWarning.message}
                      onChange={(e) => setNewWarning({ ...newWarning, message: e.target.value })}
                      placeholder="Enter custom warning message (leave empty for default message)"
                      rows="3"
                      className="notifications-form-textarea"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="admin-btn admin-btn-primary notifications-form-submit"
                  >
                    {loading ? 'Sending...' : 'Send Warning'}
                  </button>
                </form>
              </div>

              <div className="warnings-list-section" style={{ marginTop: '24px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#212529' }}>Recent Warning Messages</h4>
                <div className="warnings-filters" style={{ marginBottom: '16px' }}>
                  <select className="admin-filter-select" style={{ 
                    padding: '10px 16px', 
                    border: '2px solid #e9ecef', 
                    borderRadius: '6px', 
                    fontSize: '14px',
                    outline: 'none',
                    background: 'white',
                    cursor: 'pointer'
                  }}>
                    <option value="all">All Severities</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                {warnings.length === 0 ? (
                  <div className="empty-state" style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px', 
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    color: '#6c757d',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>⚠️</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>No warnings sent yet</div>
                    <div>Warning messages sent to users will appear here</div>
                  </div>
                ) : (
                  <div className="warnings-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {warnings.map((warning) => (
                      <div key={warning.id || warning._id} className="warning-item" style={{ 
                        padding: '20px', 
                        background: 'white', 
                        border: '2px solid #e9ecef', 
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div className="warning-info" style={{ flex: 1 }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#212529' }}>
                            User: {warning.userId?.username || warning.userId?.email || (typeof warning.userId === 'object' ? warning.userId?.username || 'Unknown User' : 'User ID: ' + warning.userId)}
                          </h5>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6c757d', lineHeight: '1.5' }}>
                            {warning.message || 'No message'}
                          </p>
                          {warning.violationType && (
                            <span style={{ fontSize: '12px', color: '#6c757d' }}>Violation: {warning.violationType}</span>
                          )}
                        </div>
                        <div className="warning-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span className="warning-severity" style={{ 
                            padding: '6px 12px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            textTransform: 'capitalize',
                            background: warning.severity === 'severe' ? '#fee2e2' : warning.severity === 'moderate' ? '#fef3c7' : '#d1fae5',
                            color: warning.severity === 'severe' ? '#991b1b' : warning.severity === 'moderate' ? '#92400e' : '#065f46'
                          }}>
                            {warning.severity || 'minor'}
                          </span>
                          <span className="warning-date" style={{ fontSize: '12px', color: '#6c757d' }}>
                            {warning.sentAt ? new Date(warning.sentAt).toLocaleDateString() : (warning.createdAt ? new Date(warning.createdAt).toLocaleDateString() : 'N/A')}
                          </span>
                          <span className="warning-status" style={{ 
                            fontSize: '11px', 
                            color: warning.status === 'sent' ? '#065f46' : warning.status === 'failed' ? '#991b1b' : '#6c757d',
                            textTransform: 'capitalize'
                          }}>
                            {warning.status || 'pending'}
                          </span>
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
      </div>
    </div>
  );
};

export default NotificationsControl;
