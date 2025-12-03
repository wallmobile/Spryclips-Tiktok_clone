import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getFeatureFlags,
  toggleFeatureFlag,
  updateRolloutPercentage,
  getUiTests,
  createTestGroup,
  updateTestGroup
} from '../../api/admin';
import './ExperimentFeatures.css';
import './AdminPanel.css';

const ExperimentFeatures = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('feature-flags');
  const [loading, setLoading] = useState(false);

  // Feature Flags State
  const [featureFlags, setFeatureFlags] = useState([
    {
      id: 1,
      name: 'new_video_player',
      description: 'New video player with enhanced controls',
      enabled: true,
      rolloutPercentage: 50,
      targetUsers: 'all'
    },
    {
      id: 2,
      name: 'ai_recommendations',
      description: 'AI-powered content recommendations',
      enabled: false,
      rolloutPercentage: 0,
      targetUsers: 'premium'
    }
  ]);

  // UI Testing State
  const [uiTests, setUiTests] = useState([]);
  const [testGroups, setTestGroups] = useState([
    { id: 1, name: 'Beta Testers', size: 100, active: true },
    { id: 2, name: 'Premium Users', size: 500, active: true },
    { id: 3, name: 'New Users', size: 200, active: false }
  ]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    loadUiTests();
  }, [user, authLoading, navigate]);

  const loadUiTests = async () => {
    try {
      const data = await getUiTests();
      if (data.success && data.tests) {
        setUiTests(data.tests);
      }
    } catch (error) {
      console.error('Error loading UI tests:', error);
    }
  };

  const handleToggleFeature = async (flagId) => {
    setLoading(true);
    try {
      const result = await toggleFeatureFlag(flagId);
      if (result.success) {
        setFeatureFlags(flags =>
          flags.map(flag =>
            flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
          )
        );
      } else {
        throw new Error(result.message || 'Toggle failed');
      }
      alert('Feature flag updated!');
    } catch (error) {
      console.error('Error toggling feature:', error);
      alert('Failed to update feature flag');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRollout = async (flagId, percentage) => {
    setLoading(true);
    try {
      // TODO: Add API call
      // await updateRolloutPercentage(flagId, percentage);
      setFeatureFlags(flags =>
        flags.map(flag =>
          flag.id === flagId ? { ...flag, rolloutPercentage: percentage } : flag
        )
      );
      alert('Rollout percentage updated!');
    } catch (error) {
      console.error('Error updating rollout:', error);
      alert('Failed to update rollout');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestGroup = async () => {
    // TODO: Add API call
    alert('Test group creation form will open');
  };

  if (authLoading) {
    return <div className="admin-loading">Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-panel-page-container">
      <div className="experiment-features">
        <div className="admin-page-header">
          <h2>Experiment Features</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-tabs-container">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'feature-flags' ? 'active' : ''}`}
              onClick={() => setActiveTab('feature-flags')}
            >
              <i className="fa-solid fa-flag"></i>
              Feature Flags
            </button>
            <button
              className={`admin-tab ${activeTab === 'ui-testing' ? 'active' : ''}`}
              onClick={() => setActiveTab('ui-testing')}
            >
              <i className="fa-solid fa-flask"></i>
              UI Testing
            </button>
          </div>
        </div>

        <div className="admin-content-area" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {activeTab === 'feature-flags' && (
            <div className="feature-flags-tab">
              <h3>Feature Flags - Enable or Disable New Tools</h3>
              
              <div className="feature-flags-list">
                {featureFlags.map((flag) => (
                  <div key={flag.id} className="feature-flag-card">
                    <div className="flag-header">
                      <div className="flag-info">
                        <h4>{flag.name}</h4>
                        <p>{flag.description}</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={flag.enabled}
                          onChange={() => handleToggleFeature(flag.id)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    
                    {flag.enabled && (
                      <div className="flag-settings">
                        <div className="setting-row">
                          <label>Rollout Percentage</label>
                          <div className="rollout-control">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={flag.rolloutPercentage}
                              onChange={(e) => handleUpdateRollout(flag.id, parseInt(e.target.value))}
                              className="rollout-slider"
                            />
                            <span className="rollout-value">{flag.rolloutPercentage}%</span>
                          </div>
                        </div>
                        <div className="setting-row">
                          <label>Target Users</label>
                          <select
                            value={flag.targetUsers}
                            className="admin-filter-select"
                            onChange={(e) => {
                              setFeatureFlags(flags =>
                                flags.map(f =>
                                  f.id === flag.id ? { ...f, targetUsers: e.target.value } : f
                                )
                              );
                            }}
                          >
                            <option value="all">All Users</option>
                            <option value="premium">Premium Users</option>
                            <option value="new">New Users</option>
                            <option value="beta">Beta Testers</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button className="admin-btn admin-btn-primary">
                <i className="fa-solid fa-plus"></i>
                Create New Feature Flag
              </button>
            </div>
          )}

          {activeTab === 'ui-testing' && (
            <div className="ui-testing-tab">
              <h3>UI Testing for Small Groups</h3>
              
              <div className="test-groups-section">
                <h4>Test Groups</h4>
                <div className="test-groups-grid">
                  {testGroups.map((group) => (
                    <div key={group.id} className="test-group-card">
                      <div className="group-header">
                        <h5>{group.name}</h5>
                        <label className="toggle-switch">
                          <input type="checkbox" checked={group.active} />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                      <div className="group-info">
                        <span className="group-size">{group.size} users</span>
                        <span className={`group-status ${group.active ? 'active' : 'inactive'}`}>
                          {group.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="group-actions">
                        <button className="admin-btn admin-btn-view admin-btn-small">
                          View Details
                        </button>
                        <button className="admin-btn admin-btn-secondary admin-btn-small">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleCreateTestGroup}
                >
                  <i className="fa-solid fa-plus"></i>
                  Create New Test Group
                </button>
              </div>

              <div className="ui-tests-section">
                <h4>Active UI Tests</h4>
                <div className="tests-list">
                  {uiTests.length === 0 ? (
                    <div className="empty-state">No active UI tests</div>
                  ) : (
                    uiTests.map((test) => (
                      <div key={test.id} className="test-item">
                        <div className="test-info">
                          <h5>{test.name}</h5>
                          <p>{test.description}</p>
                        </div>
                        <div className="test-status">
                          <span className={`status-badge status-${test.status}`}>
                            {test.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExperimentFeatures;
