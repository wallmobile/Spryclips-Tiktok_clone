import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTrendingVideos, getTrendingHashtagsAdmin, updateRecommendationSettings } from '../../api/admin';
import './SearchDiscoveryControl.css';
import './AdminPanel.css';

const SearchDiscoveryControl = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trending');
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return <div className="admin-loading">Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Trending Management State
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [manualTrends, setManualTrends] = useState([]);

  // Hashtag Analytics State
  const [hashtagStats, setHashtagStats] = useState([]);
  const [selectedHashtag, setSelectedHashtag] = useState(null);
  const [hashtagPerformance, setHashtagPerformance] = useState(null);

  // Recommendation Tuning State
  const [recommendationSettings, setRecommendationSettings] = useState({
    algorithm: 'default',
    diversity: 0.5,
    freshness: 0.3,
    engagement: 0.7
  });

  useEffect(() => {
    // Load initial data
    loadTrendingData();
    loadHashtagAnalytics();
  }, []);

  const loadTrendingData = async () => {
    setLoading(true);
    try {
      const [videosData, hashtagsData] = await Promise.all([
        getTrendingVideos({ limit: 50 }),
        getTrendingHashtagsAdmin({ limit: 50 })
      ]);
      
      if (videosData.success) {
        setTrendingVideos(videosData.videos || []);
      }
      
      if (hashtagsData.success) {
        setTrendingHashtags(hashtagsData.hashtags || []);
      }
    } catch (error) {
      console.error('Error loading trending data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHashtagAnalytics = async () => {
    try {
      const data = await getTrendingHashtagsAdmin({ limit: 100 });
      if (data.success && data.hashtags) {
        setHashtagStats(data.hashtags.map(tag => ({
          hashtag: tag.hashtag || tag.tag,
          count: tag.count || tag.videoCount,
          views: tag.totalViews || tag.views,
          likes: tag.totalLikes || tag.likes,
          engagement: tag.engagement || 0
        })));
      }
    } catch (error) {
      console.error('Error loading hashtag analytics:', error);
    }
  };

  const handleUpdateRecommendationSettings = async () => {
    setLoading(true);
    try {
      const result = await updateRecommendationSettings(recommendationSettings);
      if (result.success) {
        alert('Recommendation settings updated successfully!');
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel-page-container">
      <div className="search-discovery-control">
      <div className="admin-page-header">
        <h2>Search & Discovery Control</h2>
        <button className="admin-close-btn" onClick={onClose}>
          <i className="fa-solid fa-times"></i>
        </button>
      </div>

      <div className="admin-tabs-container">
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            <i className="fa-solid fa-fire"></i>
            Trending Management
          </button>
          <button
            className={`admin-tab ${activeTab === 'hashtags' ? 'active' : ''}`}
            onClick={() => setActiveTab('hashtags')}
          >
            <i className="fa-solid fa-hashtag"></i>
            Hashtag Analytics
          </button>
          <button
            className={`admin-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <i className="fa-solid fa-sliders"></i>
            Recommendation Tuning
          </button>
        </div>
      </div>

      <div className="admin-content-area">
        {activeTab === 'trending' && (
          <div className="trending-management">
            <h3>Trending Management</h3>
            <div className="trending-controls">
              <div className="control-section">
                <h4>Trending Videos</h4>
                <div className="trending-list">
                  {trendingVideos.length === 0 ? (
                    <p className="empty-state">No trending videos</p>
                  ) : (
                    trendingVideos.map((video) => (
                      <div key={video.id} className="trending-item">
                        <span>{video.title}</span>
                        <button className="btn-remove">Remove</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="control-section">
                <h4>Trending Hashtags</h4>
                <div className="trending-list">
                  {trendingHashtags.length === 0 ? (
                    <p className="empty-state">No trending hashtags</p>
                  ) : (
                    trendingHashtags.map((hashtag) => (
                      <div key={hashtag.id} className="trending-item">
                        <span>#{hashtag.name}</span>
                        <span className="trend-count">{hashtag.count} uses</span>
                        <button className="btn-remove">Remove</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="control-section">
                <h4>Manual Trending Promotion</h4>
                <div className="manual-trend-form">
                  <input type="text" placeholder="Video ID or Hashtag" />
                  <button className="btn-primary">Promote to Trending</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hashtags' && (
          <div className="hashtag-analytics">
            <h3>Hashtag Performance Analytics</h3>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Top Performing Hashtags</h4>
                <div className="hashtag-list">
                  {hashtagStats.length === 0 ? (
                    <p className="empty-state">No data available</p>
                  ) : (
                    hashtagStats.map((stat) => (
                      <div key={stat.id} className="hashtag-stat-item">
                        <span className="hashtag-name">#{stat.name}</span>
                        <div className="stat-details">
                          <span>Views: {stat.views}</span>
                          <span>Engagement: {stat.engagement}%</span>
                          <span>Growth: {stat.growth}%</span>
                        </div>
                        <button onClick={() => setSelectedHashtag(stat)}>
                          View Details
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedHashtag && (
                <div className="analytics-card">
                  <h4>Hashtag Details: #{selectedHashtag.name}</h4>
                  <div className="hashtag-details">
                    <p>Total Uses: {selectedHashtag.totalUses}</p>
                    <p>Total Views: {selectedHashtag.totalViews}</p>
                    <p>Average Engagement: {selectedHashtag.avgEngagement}%</p>
                    <p>Peak Performance: {selectedHashtag.peakDate}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendation-tuning">
            <h3>Recommendation System Tuning</h3>
            <div className="tuning-controls">
              <div className="control-group">
                <label>Algorithm Type</label>
                <select
                  value={recommendationSettings.algorithm}
                  onChange={(e) =>
                    setRecommendationSettings({
                      ...recommendationSettings,
                      algorithm: e.target.value
                    })
                  }
                >
                  <option value="default">Default</option>
                  <option value="collaborative">Collaborative Filtering</option>
                  <option value="content">Content-Based</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="control-group">
                <label>Diversity Weight: {recommendationSettings.diversity}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={recommendationSettings.diversity}
                  onChange={(e) =>
                    setRecommendationSettings({
                      ...recommendationSettings,
                      diversity: parseFloat(e.target.value)
                    })
                  }
                />
              </div>

              <div className="control-group">
                <label>Freshness Weight: {recommendationSettings.freshness}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={recommendationSettings.freshness}
                  onChange={(e) =>
                    setRecommendationSettings({
                      ...recommendationSettings,
                      freshness: parseFloat(e.target.value)
                    })
                  }
                />
              </div>

              <div className="control-group">
                <label>Engagement Weight: {recommendationSettings.engagement}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={recommendationSettings.engagement}
                  onChange={(e) =>
                    setRecommendationSettings({
                      ...recommendationSettings,
                      engagement: parseFloat(e.target.value)
                    })
                  }
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleUpdateRecommendationSettings}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SearchDiscoveryControl;
