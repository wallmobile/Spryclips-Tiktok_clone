import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPrivacyAudits, runPrivacyAudit } from '../../api/admin';
import './DataPrivacyAudits.css';
import './AdminPanel.css';

const DataPrivacyAudits = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [audits, setAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    dateRange: '30days'
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    loadAudits();
  }, [user, authLoading, navigate, filters]);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await getPrivacyAudits(filters);
      if (data.success && data.audits) {
        setAudits(data.audits);
      } else {
        setAudits([]);
      }
    } catch (error) {
      console.error('Error loading audits:', error);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async (auditType) => {
    setLoading(true);
    try {
      const result = await runPrivacyAudit(auditType);
      if (result.success) {
        alert(`${auditType} audit started successfully!`);
        loadAudits();
      } else {
        throw new Error(result.message || 'Audit failed');
      }
    } catch (error) {
      console.error('Error running audit:', error);
      alert('Failed to start audit: ' + (error.message || 'Unknown error'));
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
      <div className="data-privacy-audits">
        <div className="admin-page-header">
          <h2>Data Privacy Audits</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="audits-content">
          <div className="audits-controls">
            <div className="audit-actions">
              <h3>Run Privacy Audits</h3>
              <div className="audit-buttons-grid">
                <button
                  className="btn-audit"
                  onClick={() => handleRunAudit('gdpr_compliance')}
                  disabled={loading}
                >
                  <i className="fa-solid fa-shield"></i>
                  GDPR Compliance Audit
                </button>
                <button
                  className="btn-audit"
                  onClick={() => handleRunAudit('data_retention')}
                  disabled={loading}
                >
                  <i className="fa-solid fa-clock"></i>
                  Data Retention Audit
                </button>
                <button
                  className="btn-audit"
                  onClick={() => handleRunAudit('user_consent')}
                  disabled={loading}
                >
                  <i className="fa-solid fa-check-circle"></i>
                  User Consent Audit
                </button>
                <button
                  className="btn-audit"
                  onClick={() => handleRunAudit('third_party_sharing')}
                  disabled={loading}
                >
                  <i className="fa-solid fa-share-nodes"></i>
                  Third-Party Sharing Audit
                </button>
              </div>
            </div>

            <div className="audits-filters">
              <h3>Filters</h3>
              <div className="filter-group">
                <label>Audit Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="all">All Types</option>
                  <option value="gdpr_request">GDPR Request</option>
                  <option value="data_deletion">Data Deletion</option>
                  <option value="data_export">Data Export</option>
                  <option value="consent_audit">Consent Audit</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Date Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>

          <div className="audits-list">
            <h3>Audit History</h3>
            {loading ? (
              <div className="admin-loading">Loading audits...</div>
            ) : audits.length === 0 ? (
              <div className="empty-state">No audits found</div>
            ) : (
              <div className="audits-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Requested By</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th>Data Type</th>
                      <th>Records</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((audit) => (
                      <tr key={audit.id}>
                        <td>
                          <span className="audit-type-badge">{audit.type}</span>
                        </td>
                        <td>{audit.requestedBy}</td>
                        <td>{audit.requestDate}</td>
                        <td>
                          <span className={`status-badge status-${audit.status}`}>
                            {audit.status}
                          </span>
                        </td>
                        <td>{audit.dataType}</td>
                        <td>{audit.recordsAffected}</td>
                        <td>
                          <button
                            className="admin-btn admin-btn-view"
                            onClick={() => setSelectedAudit(audit)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedAudit && (
            <div className="audit-details-modal">
              <div className="admin-modal-overlay" onClick={() => setSelectedAudit(null)}>
                <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal-header">
                    <h3>Audit Details</h3>
                    <button
                      className="admin-close-btn"
                      onClick={() => setSelectedAudit(null)}
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  <div className="admin-modal-body">
                    <div className="audit-details">
                      <div className="detail-item">
                        <strong>Type:</strong>
                        <span>{selectedAudit.type}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Status:</strong>
                        <span className={`status-badge status-${selectedAudit.status}`}>
                          {selectedAudit.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <strong>Requested By:</strong>
                        <span>{selectedAudit.requestedBy}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Request Date:</strong>
                        <span>{selectedAudit.requestDate}</span>
                      </div>
                      {selectedAudit.completedDate && (
                        <div className="detail-item">
                          <strong>Completed Date:</strong>
                          <span>{selectedAudit.completedDate}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <strong>Data Type:</strong>
                        <span>{selectedAudit.dataType}</span>
                      </div>
                      <div className="detail-item">
                        <strong>Records Affected:</strong>
                        <span>{selectedAudit.recordsAffected}</span>
                      </div>
                    </div>
                  </div>
                  <div className="admin-modal-footer">
                    <button
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setSelectedAudit(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataPrivacyAudits;
