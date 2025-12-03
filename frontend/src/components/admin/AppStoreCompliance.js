import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getPolicyViolations,
  resolveViolation,
  updateSafeContentPolicy,
  getAppRatings
} from '../../api/admin';
import './AppStoreCompliance.css';
import './AdminPanel.css';

const AppStoreCompliance = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('violations');
  const [loading, setLoading] = useState(false);

  // Policy Violations State
  const [violations, setViolations] = useState([]);
  const [violationFilters, setViolationFilters] = useState({
    severity: 'all',
    status: 'all',
    platform: 'all'
  });

  // Ratings & Reviews State
  const [ratings, setRatings] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    averageRating: 4.5,
    totalReviews: 1250,
    recentReviews: []
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
    loadViolations();
    loadRatings();
  }, [user, authLoading, navigate, violationFilters]);

  const loadViolations = async () => {
    setLoading(true);
    try {
      const data = await getPolicyViolations(violationFilters);
      if (data.success && data.violations) {
        setViolations(data.violations);
      } else {
        setViolations([]);
      }
    } catch (error) {
      console.error('Error loading violations:', error);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      const data = await getAppRatings();
      if (data.success) {
        if (data.ratings) setRatings(data.ratings);
        if (data.stats) setReviewStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const handleResolveViolation = async (violationId) => {
    setLoading(true);
    try {
      const result = await resolveViolation(violationId);
      if (result.success) {
        alert('Violation resolved successfully!');
        loadViolations();
      } else {
        throw new Error(result.message || 'Resolution failed');
      }
    } catch (error) {
      console.error('Error resolving violation:', error);
      alert('Failed to resolve violation: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSafeContent = async () => {
    setLoading(true);
    try {
      const result = await updateSafeContentPolicy({});
      if (result.success) {
        alert('Safe content policy updated successfully!');
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating safe content:', error);
      alert('Failed to update safe content policy: ' + (error.message || 'Unknown error'));
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
      <div className="app-store-compliance">
        <div className="admin-page-header">
          <h2>App Store Compliance</h2>
          <button className="admin-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-tabs-container">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'violations' ? 'active' : ''}`}
              onClick={() => setActiveTab('violations')}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              Policy Violations
            </button>
            <button
              className={`admin-tab ${activeTab === 'ratings' ? 'active' : ''}`}
              onClick={() => setActiveTab('ratings')}
            >
              <i className="fa-solid fa-star"></i>
              Ratings & Reviews
            </button>
          </div>
        </div>

        <div className="admin-content-area" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {activeTab === 'violations' && (
            <div className="violations-tab">
              <h3>Policy Violations & Safe Content Updates</h3>
              
              <div className="safe-content-section">
                <h4>Safe Content Policy</h4>
                <div className="policy-controls">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h5>Auto-flag Violations</h5>
                      <p>Automatically flag content that violates app store policies</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h5>Content Moderation Level</h5>
                      <p>Set the strictness level for content moderation</p>
                    </div>
                    <select className="admin-filter-select">
                      <option value="strict">Strict</option>
                      <option value="moderate">Moderate</option>
                      <option value="lenient">Lenient</option>
                    </select>
                  </div>
                  <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleUpdateSafeContent}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Safe Content Policy'}
                  </button>
                </div>
              </div>

              <div className="violations-filters">
                <h4>Violations</h4>
                <div className="admin-filters">
                  <select
                    value={violationFilters.severity}
                    onChange={(e) => setViolationFilters({ ...violationFilters, severity: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="all">All Severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={violationFilters.status}
                    onChange={(e) => setViolationFilters({ ...violationFilters, status: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <select
                    value={violationFilters.platform}
                    onChange={(e) => setViolationFilters({ ...violationFilters, platform: e.target.value })}
                    className="admin-filter-select"
                  >
                    <option value="all">All Platforms</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                  </select>
                </div>
              </div>

              <div className="violations-table">
                {loading ? (
                  <div className="admin-loading">Loading violations...</div>
                ) : violations.length === 0 ? (
                  <div className="empty-state">No violations found</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Platform</th>
                        <th>Description</th>
                        <th>Reported Date</th>
                        <th>Status</th>
                        <th>Action Required</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map((violation) => (
                        <tr key={violation.id}>
                          <td>
                            <span className="violation-type-badge">{violation.type}</span>
                          </td>
                          <td>
                            <span className={`severity-badge severity-${violation.severity}`}>
                              {violation.severity}
                            </span>
                          </td>
                          <td>{violation.platform}</td>
                          <td>{violation.description}</td>
                          <td>{violation.reportedDate}</td>
                          <td>
                            <span className={`status-badge status-${violation.status}`}>
                              {violation.status}
                            </span>
                          </td>
                          <td>{violation.actionRequired}</td>
                          <td>
                            <button
                              className="admin-btn admin-btn-success admin-btn-small"
                              onClick={() => handleResolveViolation(violation.id)}
                            >
                              Resolve
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

          {activeTab === 'ratings' && (
            <div className="ratings-tab">
              <h3>Ratings & Review Monitoring</h3>
              
              <div className="ratings-stats">
                <div className="stat-card">
                  <h4>Average Rating</h4>
                  <div className="rating-value">
                    <span className="rating-number">{reviewStats.averageRating}</span>
                    <div className="stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`fa-solid fa-star ${star <= Math.round(reviewStats.averageRating) ? 'filled' : ''}`}
                        ></i>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <h4>Total Reviews</h4>
                  <div className="rating-value">
                    <span className="rating-number">{reviewStats.totalReviews}</span>
                    <span className="rating-label">reviews</span>
                  </div>
                </div>
                <div className="stat-card">
                  <h4>Recent Reviews (7 days)</h4>
                  <div className="rating-value">
                    <span className="rating-number">{reviewStats.recentReviews.length}</span>
                    <span className="rating-label">new reviews</span>
                  </div>
                </div>
              </div>

              <div className="reviews-monitoring">
                <h4>Recent Reviews</h4>
                <div className="reviews-filters">
                  <select className="admin-filter-select">
                    <option value="all">All Reviews</option>
                    <option value="5star">5 Stars</option>
                    <option value="4star">4 Stars</option>
                    <option value="3star">3 Stars</option>
                    <option value="2star">2 Stars</option>
                    <option value="1star">1 Star</option>
                  </select>
                  <select className="admin-filter-select">
                    <option value="all">All Platforms</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                  </select>
                </div>
                <div className="reviews-list">
                  <div className="empty-state">No recent reviews to display</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppStoreCompliance;
