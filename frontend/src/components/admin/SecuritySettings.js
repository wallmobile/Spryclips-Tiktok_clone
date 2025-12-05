// Security settings page with roles and logs
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
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
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'roles';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [isSecurityMenuOpen, setIsSecurityMenuOpen] = useState(true); // Track if Security menu is expanded
  
  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'roles';
    // Map old tab names to new ones for backward compatibility
    const tabMapping = {
      'activity': 'activity-logs',
      'roles': 'roles',
      'sessions': 'sessions'
    };
    const mappedTab = tabMapping[tab] || tab;
    setActiveTab(mappedTab);
  }, [searchParams]);
  const [loading, setLoading] = useState(false);

  // Role-Based Access
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({
    user: 'all',
    action: 'all',
    dateRange: 'all' // Changed to 'all' to show all logs by default
  });

  // Session Tracking
  const [sessions, setSessions] = useState([]);
  const [riskThreshold, setRiskThreshold] = useState('medium');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    if (user && user.role === 'admin') {
      // Load data based on active tab
      if (activeTab === 'roles' || !activeTab) {
        loadRoles();
      }
      if (activeTab === 'activity-logs') {
        console.log('Activity logs tab active, loading logs...');
    loadActivityLogs();
      }
      if (activeTab === 'sessions') {
    loadSessions();
      }
    }
  }, [user, authLoading, navigate, logFilters, activeTab]);
  
  // Load roles when component mounts or when roles tab is active
  useEffect(() => {
    // Get user from context or localStorage (same as AdminPanel)
    const getCachedUser = () => {
      try {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
      } catch {
        return null;
      }
    };
    
    const cachedUser = getCachedUser();
    const currentUser = user || cachedUser;
    
    console.log('SecuritySettings - User check:', { 
      userFromContext: user?.role, 
      cachedUser: cachedUser?.role,
      currentUser: currentUser?.role,
      isAdmin: currentUser?.role === 'admin',
      authLoading,
      activeTab 
    });
    
    // If auth is still loading and no cached user, wait
    if (authLoading && !cachedUser) {
      console.log('Auth still loading, waiting...');
      return;
    }
    
    // If we have an admin user, load roles
    if (currentUser && currentUser.role === 'admin') {
      if (activeTab === 'roles' || !activeTab || activeTab === '') {
        console.log('Loading roles - user is admin');
        loadRoles();
      }
    } else {
      console.warn('User not admin or not loaded:', { 
        currentUser: currentUser?.role, 
        authLoading,
        hasUser: !!currentUser
      });
    }
  }, [user, authLoading, activeTab]);
  
  // Ensure activeTab has a default value on mount
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (!currentTab && !activeTab) {
      setActiveTab('roles');
      navigate('/admin/security-settings?tab=roles', { replace: true });
    }
  }, [searchParams, activeTab, navigate]);
  
  const loadRoles = async () => {
    try {
      console.log('Loading roles...');
      const data = await getRoles();
      console.log('Roles API response:', data);
      if (data.success && data.roles && Array.isArray(data.roles)) {
        // Filter out super_admin role
        const filteredRoles = data.roles.filter(role => role && role.name !== 'super_admin');
        console.log('Filtered roles:', filteredRoles);
        if (filteredRoles.length > 0) {
          setRoles(filteredRoles);
        } else {
          console.warn('No roles after filtering');
          setRoles([]);
        }
      } else {
        console.warn('Invalid roles data:', data);
        setRoles([]);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
      setRoles([]);
    }
  };

  // Don't block rendering - ProtectedRoute handles auth

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      console.log('Loading activity logs with filters:', logFilters);
      const data = await getActivityLogs(logFilters);
      console.log('Activity logs API response:', data);
      if (data.success && data.logs && Array.isArray(data.logs)) {
        setActivityLogs(data.logs);
        console.log('Activity logs loaded:', data.logs.length);
      } else {
        console.warn('Invalid activity logs data:', data);
        setActivityLogs([]);
      }
    } catch (error) {
      console.error('Error loading activity logs:', error);
      setActivityLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      console.log('Loading active sessions...');
      const data = await getActiveSessions();
      console.log('Sessions API response:', data);
      if (data.success && data.sessions && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        console.log('✅ Sessions loaded successfully:', data.sessions.length, 'active sessions');
        if (data.sessions.length === 0) {
          console.warn('⚠️ No active sessions found');
        }
      } else {
        console.warn('Invalid sessions data:', data);
        setSessions([]);
      }
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setSessions([]);
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
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
        successMsg.textContent = '✓ Session terminated successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          successMsg.style.transition = 'opacity 0.3s';
          successMsg.style.opacity = '0';
          setTimeout(() => successMsg.remove(), 300);
        }, 3000);
        loadSessions();
      } else {
        throw new Error(result.message || 'Termination failed');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
      errorMsg.textContent = '✗ Failed to terminate: ' + (error.message || 'Unknown error');
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.style.transition = 'opacity 0.3s';
        errorMsg.style.opacity = '0';
        setTimeout(() => errorMsg.remove(), 300);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Don't block rendering - ProtectedRoute handles auth

  return (
    <div className="admin-panel-page-container">
      <div className="admin-panel-with-sidebar">
        <AdminSidebar 
          activeTab={isSecurityMenuOpen ? "security" : null}
          setActiveTab={(tab) => {
            // Allow closing the menu by setting tab to null
            if (tab === null) {
              // Close Security menu
              setIsSecurityMenuOpen(false);
              return;
            }
            // If clicking on Security menu item
            if (tab === 'security') {
              // Toggle Security menu
              setIsSecurityMenuOpen(!isSecurityMenuOpen);
              return;
            }
            // If clicking on a different main tab, navigate away
            if (tab && tab !== 'security') {
              const routeMap = {
                'dashboard': '/admin',
                'users': '/admin',
                'videos': '/admin',
                'stories': '/admin',
                'comments': '/admin',
                'moderation': '/admin',
                'safety': '/admin',
                'monetization': '/admin',
                'analytics': '/admin',
                'search': '/admin',
                'system': '/admin',
                'support': '/admin',
                'policy': '/admin/policy-compliance',
                'app-store': '/admin/app-store-compliance',
                'experiments': '/admin/experiment-features',
                'notifications': '/admin/notifications-control',
                'backup': '/admin/backup-recovery'
              };
              const route = routeMap[tab] || '/admin';
              navigate(route);
            }
          }}
          activeSubTab={activeTab}
          setActiveSubTab={(subTab) => {
            // Update active tab when sub-item is clicked
            if (subTab) {
              setActiveTab(subTab);
              navigate(`/admin/security-settings?tab=${subTab}`, { replace: true });
            }
          }}
          onClose={onClose} 
        />
        <div className="admin-panel-main-content">
      <div className="security-settings">
        <div className="admin-page-header">
          <h2>
            Security Settings
            {activeTab === 'roles' && ' → Role-Based Access'}
            {activeTab === 'activity-logs' && ' → Activity Logs'}
            {activeTab === 'sessions' && ' → Session Tracking'}
          </h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-content-area">
          {(!activeTab || activeTab === 'roles') && (
            <div className="security-tab-content">
              <h3>Role-Based Access Control</h3>
              <div className="roles-grid">
                {roles.length === 0 ? (
                  <p className="empty-state">No roles found. Loading roles...</p>
                ) : (
                  roles.map((role) => (
                  <div
                      key={role._id || role.id}
                      className={`role-card ${selectedRole?._id === role._id || selectedRole?.id === role.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="role-header">
                        <h4>{role.displayName || role.name}</h4>
                        <span className="role-users">{role.users || 0} users</span>
                    </div>
                    <div className="role-permissions">
                      <strong>Permissions:</strong>
                      <ul>
                          {role.permissions && role.permissions.length > 0 ? (
                            role.permissions.map((perm, idx) => (
                          <li key={idx}>{perm}</li>
                            ))
                          ) : (
                            <li>No permissions</li>
                          )}
                      </ul>
                    </div>
                  </div>
                  ))
                )}
              </div>

              {selectedRole && (
                <div className="role-details">
                  <div className="role-details-header">
                    <h4>Edit Role: {selectedRole.displayName || selectedRole.name}</h4>
                    <p className="role-description">{selectedRole.description || 'Manage permissions for this role'}</p>
                  </div>
                  <div className="permissions-section">
                    <h5>Permissions</h5>
                  <div className="permissions-list">
                      {['all', 'users', 'content', 'moderation', 'monetization', 'compliance', 'reports', 'analytics', 'system', 'security', 'settings'].map((perm) => {
                        const hasAll = selectedRole.permissions.includes('all');
                        const hasPerm = selectedRole.permissions.includes(perm);
                        const isDisabled = perm !== 'all' && hasAll;
                        
                        return (
                          <label key={perm} className={`permission-checkbox ${hasPerm ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}>
                        <input
                          type="checkbox"
                              checked={hasPerm}
                              disabled={isDisabled}
                              onChange={(e) => {
                                if (perm === 'all') {
                                  // If 'all' is selected, replace all permissions with just 'all'
                                  setSelectedRole({
                                    ...selectedRole,
                                    permissions: e.target.checked ? ['all'] : []
                                  });
                                } else {
                                  // For other permissions, add/remove them
                                  if (e.target.checked) {
                                    setSelectedRole({
                                      ...selectedRole,
                                      permissions: [...selectedRole.permissions.filter(p => p !== 'all'), perm]
                                    });
                                  } else {
                                    setSelectedRole({
                                      ...selectedRole,
                                      permissions: selectedRole.permissions.filter(p => p !== perm)
                                    });
                                  }
                                }
                              }}
                        />
                            <span className="checkbox-label">{perm}</span>
                      </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="role-actions">
                    <button 
                      className="btn-primary btn-save-role"
                      onClick={async () => {
                      const roleId = selectedRole._id || selectedRole.id || selectedRole.name;
                      if (!roleId) {
                        alert('Cannot update role: Invalid role ID');
                        return;
                      }
                      
                      console.log('Updating role:', { 
                        roleId, 
                        roleName: selectedRole.name,
                        roleObjectId: selectedRole._id,
                        permissions: selectedRole.permissions 
                      });
                      setLoading(true);
                      try {
                        const result = await updateRolePermissions(roleId, selectedRole.permissions);
                        console.log('Update result:', result);
                        if (result.success) {
                          const successMsg = document.createElement('div');
                          successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
                          successMsg.textContent = '✓ Role permissions updated successfully!';
                          document.body.appendChild(successMsg);
                          setTimeout(() => {
                            successMsg.style.transition = 'opacity 0.3s';
                            successMsg.style.opacity = '0';
                            setTimeout(() => successMsg.remove(), 300);
                          }, 3000);
                          loadRoles();
                          setSelectedRole(null); // Clear selection after update
                        } else {
                          throw new Error(result.message || 'Update failed');
                        }
                      } catch (error) {
                        console.error('Error updating role:', error);
                        console.error('Error details:', {
                          message: error.message,
                          response: error.response?.data,
                          roleId: roleId
                        });
                        const errorMsg = document.createElement('div');
                        errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
                        errorMsg.textContent = '✗ Failed to update: ' + (error.message || 'Unknown error');
                        document.body.appendChild(errorMsg);
                        setTimeout(() => {
                          errorMsg.style.transition = 'opacity 0.3s';
                          errorMsg.style.opacity = '0';
                          setTimeout(() => errorMsg.remove(), 300);
                        }, 3000);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-save" style={{ marginRight: '8px' }}></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedRole(null);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity-logs' && (
            <div className="security-tab-content">
              <h3>Activity Logs</h3>
              <div className="activity-filters">
                <select
                  value={logFilters.user}
                  onChange={(e) => {
                    const newFilters = { ...logFilters, user: e.target.value };
                    setLogFilters(newFilters);
                    // Reload logs when filter changes
                    setTimeout(() => loadActivityLogs(), 100);
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All Users</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                </select>
                <select
                  value={logFilters.action}
                  onChange={(e) => {
                    const newFilters = { ...logFilters, action: e.target.value };
                    setLogFilters(newFilters);
                    // Reload logs when filter changes
                    setTimeout(() => loadActivityLogs(), 100);
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All Actions</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="view">View</option>
                  <option value="permission_change">Permission Change</option>
                  <option value="role_change">Role Change</option>
                  <option value="settings_change">Settings Change</option>
                </select>
                <select
                  value={logFilters.dateRange}
                  onChange={(e) => {
                    const newFilters = { ...logFilters, dateRange: e.target.value };
                    setLogFilters(newFilters);
                    // Reload logs when filter changes
                    setTimeout(() => loadActivityLogs(), 100);
                  }}
                  className="admin-filter-select"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="all">All Time</option>
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
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-state">No activity logs found</td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log._id || log.id}>
                          <td>{log.user?.username || log.user?.email || 'Unknown'}</td>
                        <td>
                          <span className="action-badge">{log.action}</span>
                        </td>
                          <td>{log.resource} {log.resourceId ? `(${log.resourceId})` : ''}</td>
                          <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : (log.timestamp || 'N/A')}</td>
                          <td>{log.ipAddress || log.ip || 'N/A'}</td>
                        <td>
                            <span className={`status-badge status-${log.status || 'success'}`}>
                              {log.status || 'success'}
                          </span>
                        </td>
                      </tr>
                      ))
                    )}
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
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="empty-state">No active sessions found</td>
                        </tr>
                      ) : (
                        sessions.map((session) => (
                          <tr key={session._id || session.id}>
                            <td>{session.user?.username || session.user?.email || 'Unknown'}</td>
                            <td>{session.ipAddress || session.ip || 'N/A'}</td>
                            <td>{session.location || 'Unknown'}</td>
                            <td>{session.device || session.userAgent || 'Unknown'}</td>
                            <td>{session.createdAt ? new Date(session.createdAt).toLocaleString() : (session.loginTime || 'N/A')}</td>
                            <td>{session.lastActivity ? new Date(session.lastActivity).toLocaleString() : (session.lastActivity || 'N/A')}</td>
                          <td>
                              <span className={`risk-badge risk-${session.riskLevel || 'low'}`}>
                                {session.riskLevel || 'low'}
                            </span>
                          </td>
                          <td>
                            <button
                                className="btn-primary"
                                onClick={() => handleTerminateSession(session._id || session.id)}
                                disabled={loading}
                            >
                                {loading ? 'Terminating...' : 'Terminate'}
                            </button>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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

export default SecuritySettings;
