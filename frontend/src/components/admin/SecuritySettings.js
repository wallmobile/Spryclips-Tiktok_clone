import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  enable2FA,
  getRoles,
  updateRolePermissions,
  getActivityLogs,
  getActiveSessions,
  terminateSession
} from '../../api/admin';
import './SecuritySettings.css';
import './AdminPanel.css';

const SecuritySettings = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('2fa');
  const [loading, setLoading] = useState(false);

  // 2FA Settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('app');

  // Role-Based Access
  const [roles, setRoles] = useState([
    { id: 'super_admin', name: 'Super Admin', permissions: ['all'], users: 1 },
    { id: 'admin', name: 'Admin', permissions: ['users', 'content', 'moderation'], users: 2 },
    { id: 'moderator', name: 'Moderator', permissions: ['content', 'moderation'], users: 5 },
    { id: 'finance', name: 'Finance', permissions: ['monetization', 'reports'], users: 2 },
    { id: 'legal', name: 'Legal', permissions: ['compliance', 'reports'], users: 1 }
  ]);
  const [selectedRole, setSelectedRole] = useState(null);

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({
    user: 'all',
    action: 'all',
    dateRange: '7days'
  });

  // Session Tracking
  const [sessions, setSessions] = useState([]);
  const [riskThreshold, setRiskThreshold] = useState('medium');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    loadActivityLogs();
    loadSessions();
  }, [user, authLoading, navigate, logFilters]);

  const loadActivityLogs = async () => {
    try {
      const data = await getActivityLogs(logFilters);
      if (data.success && data.logs) {
        setActivityLogs(data.logs);
      } else {
        setActivityLogs([]);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      setActivityLogs([]);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await getActiveSessions();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      const result = await enable2FA(twoFactorMethod);
      if (result.success) {
        setTwoFactorEnabled(true);
        alert('Two-Factor Authentication enabled successfully!');
      } else {
        throw new Error(result.message || 'Enable failed');
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      alert('Failed to enable 2FA: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) return;
    
    setLoading(true);
    try {
      const result = await terminateSession(sessionId);
      if (result.success) {
        alert('Session terminated successfully!');
        loadSessions();
      } else {
        throw new Error(result.message || 'Termination failed');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Failed to terminate session: ' + (error.message || 'Unknown error'));
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
      <div className="security-settings">
        <div className="admin-page-header">
          <h2>Security Settings</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-tabs-container">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === '2fa' ? 'active' : ''}`}
              onClick={() => setActiveTab('2fa')}
            >
              <i className="fa-solid fa-shield-halved"></i>
              Two-Factor Authentication
            </button>
            <button
              className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <i className="fa-solid fa-user-shield"></i>
              Role-Based Access
            </button>
            <button
              className={`admin-tab ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <i className="fa-solid fa-list"></i>
              Activity Logs
            </button>
            <button
              className={`admin-tab ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <i className="fa-solid fa-clock"></i>
              Session Tracking
            </button>
          </div>
        </div>

        <div className="admin-content-area">
          {activeTab === '2fa' && (
            <div className="security-tab-content">
              <h3>Two-Factor Authentication</h3>
              <div className="security-section">
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>Enable 2FA for Admin Accounts</h4>
                    <p>Require two-factor authentication for all admin users</p>
                  </div>
                  <div className="setting-control">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                {twoFactorEnabled && (
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>2FA Method</h4>
                      <p>Choose the authentication method</p>
                    </div>
                    <div className="setting-control">
                      <select
                        value={twoFactorMethod}
                        onChange={(e) => setTwoFactorMethod(e.target.value)}
                        className="admin-filter-select"
                      >
                        <option value="app">Authenticator App (TOTP)</option>
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleEnable2FA}
                  disabled={loading || !twoFactorEnabled}
                >
                  {loading ? 'Enabling...' : 'Save 2FA Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="security-tab-content">
              <h3>Role-Based Access Control</h3>
              <div className="roles-grid">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`role-card ${selectedRole?.id === role.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="role-header">
                      <h4>{role.name}</h4>
                      <span className="role-users">{role.users} users</span>
                    </div>
                    <div className="role-permissions">
                      <strong>Permissions:</strong>
                      <ul>
                        {role.permissions.map((perm, idx) => (
                          <li key={idx}>{perm}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {selectedRole && (
                <div className="role-details">
                  <h4>Edit Role: {selectedRole.name}</h4>
                  <div className="permissions-list">
                    {['all', 'users', 'content', 'moderation', 'monetization', 'compliance', 'reports'].map((perm) => (
                      <label key={perm} className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRole.permissions.includes(perm) || selectedRole.permissions.includes('all')}
                          disabled={selectedRole.permissions.includes('all')}
                        />
                        <span>{perm}</span>
                      </label>
                    ))}
                  </div>
                  <button className="admin-btn admin-btn-primary">
                    Update Role Permissions
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="security-tab-content">
              <h3>Activity Logs</h3>
              <div className="activity-filters">
                <select
                  value={logFilters.user}
                  onChange={(e) => setLogFilters({ ...logFilters, user: e.target.value })}
                  className="admin-filter-select"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                </select>
                <select
                  value={logFilters.action}
                  onChange={(e) => setLogFilters({ ...logFilters, action: e.target.value })}
                  className="admin-filter-select"
                >
                  <option value="all">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                </select>
                <select
                  value={logFilters.dateRange}
                  onChange={(e) => setLogFilters({ ...logFilters, dateRange: e.target.value })}
                  className="admin-filter-select"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                </select>
              </div>

              <div className="activity-logs-table">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Target</th>
                      <th>Timestamp</th>
                      <th>IP Address</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.user}</td>
                        <td>
                          <span className="action-badge">{log.action}</span>
                        </td>
                        <td>{log.target}</td>
                        <td>{log.timestamp}</td>
                        <td>{log.ip}</td>
                        <td>
                          <span className={`status-badge status-${log.status}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="security-tab-content">
              <h3>Session Tracking</h3>
              <div className="session-settings">
                <div className="setting-item">
                  <div className="setting-info">
                    <h4>Risk Threshold</h4>
                    <p>Automatically logout sessions with high risk level</p>
                  </div>
                  <div className="setting-control">
                    <select
                      value={riskThreshold}
                      onChange={(e) => setRiskThreshold(e.target.value)}
                      className="admin-filter-select"
                    >
                      <option value="low">Low (Log only)</option>
                      <option value="medium">Medium (Warning)</option>
                      <option value="high">High (Auto logout)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sessions-list">
                <h4>Active Sessions</h4>
                <div className="sessions-table">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>IP Address</th>
                        <th>Location</th>
                        <th>Device</th>
                        <th>Login Time</th>
                        <th>Last Activity</th>
                        <th>Risk Level</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td>{session.user}</td>
                          <td>{session.ip}</td>
                          <td>{session.location}</td>
                          <td>{session.device}</td>
                          <td>{session.loginTime}</td>
                          <td>{session.lastActivity}</td>
                          <td>
                            <span className={`risk-badge risk-${session.riskLevel}`}>
                              {session.riskLevel}
                            </span>
                          </td>
                          <td>
                            <button
                              className="admin-btn admin-btn-danger admin-btn-small"
                              onClick={() => handleTerminateSession(session.id)}
                            >
                              Terminate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
