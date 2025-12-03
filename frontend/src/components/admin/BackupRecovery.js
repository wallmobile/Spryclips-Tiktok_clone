import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getAuditArchives,
  createAuditArchive,
  downloadArchive,
  getDeletedContent,
  restoreDeletedContent
} from '../../api/admin';
import './BackupRecovery.css';
import './AdminPanel.css';

const BackupRecovery = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('archives');
  const [loading, setLoading] = useState(false);

  // Audit Archives State
  const [archives, setArchives] = useState([]);
  const [archiveFilters, setArchiveFilters] = useState({
    type: 'all',
    dateRange: '30days'
  });

  // Deleted Content State
  const [deletedContent, setDeletedContent] = useState([]);
  const [restoreFilters, setRestoreFilters] = useState({
    contentType: 'all',
    deletedDate: '30days'
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    loadArchives();
    loadDeletedContent();
  }, [user, authLoading, navigate, archiveFilters, restoreFilters]);

  const loadArchives = async () => {
    setLoading(true);
    try {
      // TODO: Add API call
      // const data = await getAuditArchives(archiveFilters);
      // setArchives(data);
      
      // Mock data
      setArchives([
        {
          id: 1,
          type: 'user_activity',
          date: '2024-01-20',
          size: '2.5 GB',
          records: 50000,
          status: 'completed'
        },
        {
          id: 2,
          type: 'content_moderation',
          date: '2024-01-19',
          size: '1.8 GB',
          records: 35000,
          status: 'completed'
        }
      ]);
    } catch (error) {
      console.error('Error loading archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedContent = async () => {
    try {
      const data = await getDeletedContent(restoreFilters);
      if (data.success && data.content) {
        setDeletedContent(data.content);
      } else {
        setDeletedContent([]);
      }
    } catch (error) {
      console.error('Error loading deleted content:', error);
      setDeletedContent([]);
    }
  };

  const handleCreateArchive = async (archiveType) => {
    setLoading(true);
    try {
      // TODO: Add API call
      // await createAuditArchive(archiveType);
      alert(`${archiveType} archive created successfully!`);
      loadArchives();
    } catch (error) {
      console.error('Error creating archive:', error);
      alert('Failed to create archive');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to restore this content?')) return;
    
    setLoading(true);
    try {
      const result = await restoreDeletedContent(contentId);
      if (result.success) {
        alert('Content restored successfully!');
        loadDeletedContent();
      } else {
        throw new Error(result.message || 'Restore failed');
      }
    } catch (error) {
      console.error('Error restoring content:', error);
      alert('Failed to restore content: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadArchive = async (archiveId) => {
    setLoading(true);
    try {
      // TODO: Add API call
      // await downloadArchive(archiveId);
      alert('Archive download started!');
    } catch (error) {
      console.error('Error downloading archive:', error);
      alert('Failed to download archive');
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
      <div className="backup-recovery">
        <div className="admin-page-header">
          <h2>Backup & Recovery</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-tabs-container">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'archives' ? 'active' : ''}`}
              onClick={() => setActiveTab('archives')}
            >
              <i className="fa-solid fa-box-archive"></i>
              Audit Archives
            </button>
            <button
              className={`admin-tab ${activeTab === 'restore' ? 'active' : ''}`}
              onClick={() => setActiveTab('restore')}
            >
              <i className="fa-solid fa-rotate-left"></i>
              Restore Deleted Content
            </button>
          </div>
        </div>

        <div className="admin-content-area" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {activeTab === 'archives' && (
            <div className="archives-tab">
              <h3>Audit Archives</h3>
              
              <div className="archive-actions">
                <h4>Create New Archive</h4>
                <div className="archive-buttons">
                  <button
                    className="btn-archive"
                    onClick={() => handleCreateArchive('user_activity')}
                    disabled={loading}
                  >
                    <i className="fa-solid fa-users"></i>
                    User Activity Archive
                  </button>
                  <button
                    className="btn-archive"
                    onClick={() => handleCreateArchive('content_moderation')}
                    disabled={loading}
                  >
                    <i className="fa-solid fa-shield"></i>
                    Content Moderation Archive
                  </button>
                  <button
                    className="btn-archive"
                    onClick={() => handleCreateArchive('system_logs')}
                    disabled={loading}
                  >
                    <i className="fa-solid fa-server"></i>
                    System Logs Archive
                  </button>
                  <button
                    className="btn-archive"
                    onClick={() => handleCreateArchive('full_backup')}
                    disabled={loading}
                  >
                    <i className="fa-solid fa-database"></i>
                    Full Database Backup
                  </button>
                </div>
              </div>

              <div className="archives-filters">
                <h4>Archive History</h4>
                <div className="admin-filters">
                  <select
                    value={archiveFilters.type}
                    onChange={(e) => setArchiveFilters({ ...archiveFilters, type: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="user_activity">User Activity</option>
                    <option value="content_moderation">Content Moderation</option>
                    <option value="system_logs">System Logs</option>
                    <option value="full_backup">Full Backup</option>
                  </select>
                  <select
                    value={archiveFilters.dateRange}
                    onChange={(e) => setArchiveFilters({ ...archiveFilters, dateRange: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>

              <div className="archives-list">
                {loading ? (
                  <div className="admin-loading">Loading archives...</div>
                ) : archives.length === 0 ? (
                  <div className="empty-state">No archives found</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Size</th>
                        <th>Records</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archives.map((archive) => (
                        <tr key={archive.id}>
                          <td>
                            <span className="archive-type-badge">{archive.type}</span>
                          </td>
                          <td>{archive.date}</td>
                          <td>{archive.size}</td>
                          <td>{archive.records.toLocaleString()}</td>
                          <td>
                            <span className={`status-badge status-${archive.status}`}>
                              {archive.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="admin-btn admin-btn-view admin-btn-small"
                              onClick={() => handleDownloadArchive(archive.id)}
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'restore' && (
            <div className="restore-tab">
              <h3>Restore Deleted Content</h3>
              
              <div className="restore-filters">
                <h4>Deleted Content</h4>
                <div className="admin-filters">
                  <select
                    value={restoreFilters.contentType}
                    onChange={(e) => setRestoreFilters({ ...restoreFilters, contentType: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="all">All Content Types</option>
                    <option value="video">Videos</option>
                    <option value="comment">Comments</option>
                    <option value="story">Stories</option>
                    <option value="user">User Accounts</option>
                  </select>
                  <select
                    value={restoreFilters.deletedDate}
                    onChange={(e) => setRestoreFilters({ ...restoreFilters, deletedDate: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="7days">Deleted in Last 7 Days</option>
                    <option value="30days">Deleted in Last 30 Days</option>
                    <option value="90days">Deleted in Last 90 Days</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>

              <div className="deleted-content-list">
                {deletedContent.length === 0 ? (
                  <div className="empty-state">No deleted content found</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Title/ID</th>
                        <th>Deleted By</th>
                        <th>Deleted Date</th>
                        <th>Original ID</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedContent.map((content) => (
                        <tr key={content.id}>
                          <td>
                            <span className={`content-type-badge type-${content.type}`}>
                              {content.type}
                            </span>
                          </td>
                          <td>{content.title}</td>
                          <td>{content.deletedBy}</td>
                          <td>{content.deletedDate}</td>
                          <td>
                            <code className="content-id">{content.originalId}</code>
                          </td>
                          <td>
                            {content.canRestore ? (
                              <button
                                className="admin-btn admin-btn-success admin-btn-small"
                                onClick={() => handleRestoreContent(content.id)}
                                disabled={loading}
                              >
                                Restore
                              </button>
                            ) : (
                              <span className="cannot-restore">Cannot Restore</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupRecovery;
