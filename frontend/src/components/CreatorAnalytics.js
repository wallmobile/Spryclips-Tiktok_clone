import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCreatorAnalytics,
  getCreatorAnalyticsSummary,
  getAllVideosAnalytics,
  getTopVideos,
  getAudienceOverview,
  getAudienceGrowth,
  getAudienceDemographics,
  getAudienceActivity,
  getVideoAnalytics,
  getVideoAnalyticsSummary,
  getVideoEngagement,
  getVideoDemographics,
} from '../api/analytics';
import './CreatorAnalytics.css';

const DEFAULT_DATE_RANGE = '30d';

const CreatorAnalytics = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [videos, setVideos] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [audienceOverview, setAudienceOverview] = useState(null);
  const [audienceGrowth, setAudienceGrowth] = useState(null);
  const [audienceDemographics, setAudienceDemographics] = useState(null);
  const [audienceActivity, setAudienceActivity] = useState(null);

  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [videoDetails, setVideoDetails] = useState({
    loading: false,
    error: null,
    analytics: null,
    summary: null,
    engagement: null,
    demographics: null,
  });

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        summaryRes,
        videosRes,
        topRes,
        audienceRes,
        growthRes,
        audienceDemoRes,
        activityRes,
      ] = await Promise.all([
        getCreatorAnalytics(),
        getCreatorAnalyticsSummary(),
        getAllVideosAnalytics(),
        getTopVideos(5, 'views'),
        getAudienceOverview(),
        getAudienceGrowth(),
        getAudienceDemographics(),
        getAudienceActivity(),
      ]);

      setOverview(overviewRes?.overview || null);
      setSummary(summaryRes?.summary || null);
      setVideos(videosRes?.videos || []);
      setTopVideos(topRes?.videos || []);
      setAudienceOverview(audienceRes?.audience || null);
      setAudienceGrowth(growthRes?.growth || null);
      setAudienceDemographics(audienceDemoRes?.demographics || null);
      setAudienceActivity(activityRes?.activity || null);

      const firstVideoId = videosRes?.videos?.[0]?.video?._id || null;
      setSelectedVideoId(firstVideoId);
    } catch (err) {
      console.error('Failed to load creator analytics:', err);
      setError(err?.response?.data?.message || 'Unable to load analytics right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchVideoDetails = useCallback(async (videoId) => {
    if (!videoId) {
      setVideoDetails((prev) => ({ ...prev, analytics: null, summary: null, engagement: null, demographics: null }));
      return;
    }

    setVideoDetails({
      loading: true,
      error: null,
      analytics: null,
      summary: null,
      engagement: null,
      demographics: null,
    });

    try {
      const [analyticsRes, summaryRes, engagementRes, demographicsRes] = await Promise.all([
        getVideoAnalytics(videoId),
        getVideoAnalyticsSummary(videoId),
        getVideoEngagement(videoId),
        getVideoDemographics(videoId),
      ]);

      setVideoDetails({
        loading: false,
        error: null,
        analytics: analyticsRes?.analytics || null,
        summary: summaryRes?.summary || null,
        engagement: engagementRes?.engagement || null,
        demographics: demographicsRes?.demographics || null,
      });
    } catch (err) {
      console.error('Failed to fetch video analytics:', err);
      setVideoDetails({
        loading: false,
        error: err?.response?.data?.message || 'Unable to load video analytics.',
        analytics: null,
        summary: null,
        engagement: null,
        demographics: null,
      });
    }
  }, []);

  useEffect(() => {
    if (selectedVideoId) {
      fetchVideoDetails(selectedVideoId);
    }
  }, [selectedVideoId, fetchVideoDetails]);

  const formatNumber = (value, digits = 1) => {
    if (value === undefined || value === null) return '—';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(digits)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(digits)}K`;
    return value.toLocaleString();
  };

  const engagementRate = useMemo(() => {
    if (!overview) return '—';
    return `${(overview.averageEngagementRate ?? 0).toFixed(2)}%`;
  }, [overview]);

  const averageViews = useMemo(() => {
    if (!overview) return '—';
    return formatNumber(overview.averageViewsPerVideo || 0);
  }, [overview]);

  const handleExportReport = useCallback(() => {
    alert(`Exporting analytics snapshot (${dateRange.toUpperCase()}) as PDF...`);
  }, [dateRange]);

  const handleSelectVideo = (videoId) => {
    if (videoId !== selectedVideoId) {
      setSelectedVideoId(videoId);
    }
  };

  const renderOverviewTab = () => (
    <div className="analytics-tab-panel">
      <div className="overview-grid">
        <div className="overview-card">
          <span className="overview-label">Total Views</span>
          <span className="overview-value">{formatNumber(overview?.totalViews || 0)}</span>
        </div>
        <div className="overview-card">
          <span className="overview-label">Total Likes</span>
          <span className="overview-value">{formatNumber(overview?.totalLikes || 0)}</span>
        </div>
        <div className="overview-card">
          <span className="overview-label">Total Comments</span>
          <span className="overview-value">{formatNumber(overview?.totalComments || 0)}</span>
        </div>
        <div className="overview-card">
          <span className="overview-label">Total Shares</span>
          <span className="overview-value">{formatNumber(overview?.totalShares || 0)}</span>
        </div>
        <div className="overview-card">
          <span className="overview-label">Average Engagement</span>
          <span className="overview-value">{engagementRate}</span>
        </div>
        <div className="overview-card">
          <span className="overview-label">Average Views / Video</span>
          <span className="overview-value">{averageViews}</span>
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="section-title">Creator Summary</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="metric-label">Followers</span>
            <span className="metric-value">{formatNumber(summary?.profile?.followers || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Following</span>
            <span className="metric-value">{formatNumber(summary?.profile?.following || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Published Videos</span>
            <span className="metric-value">{formatNumber(summary?.profile?.totalVideos || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Total Engagements</span>
            <span className="metric-value">{formatNumber(summary?.engagement?.totalEngagements || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Engagement Rate</span>
            <span className="metric-value">
              {summary?.engagement?.engagementRate !== undefined
                ? `${summary.engagement.engagementRate.toFixed(2)}%`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <div className="section-header">
          <h3 className="section-title">Top Performing Videos</h3>
        </div>
        <div className="videos-list">
          {topVideos.length === 0 ? (
            <p className="empty-state">No videos available yet.</p>
          ) : (
            topVideos.map((item) => (
              <button
                key={item.video?._id}
                className={`video-list-item ${selectedVideoId === item.video?._id ? 'active' : ''}`}
                onClick={() => handleSelectVideo(item.video?._id)}
              >
                <div className="video-thumb">
                  {item.video?.thumbnail ? (
                    <img src={item.video.thumbnail} alt={item.video?.description || 'Video thumbnail'} />
                  ) : (
                    <div className="video-thumb-placeholder">
                      <i className="fa-solid fa-video"></i>
                    </div>
                  )}
                </div>
                <div className="video-meta">
                  <h4>{item.video?.description || 'Untitled Video'}</h4>
                  <div className="video-stats">
                    <span><i className="fa-solid fa-eye"></i> {formatNumber(item.metrics?.views || 0)}</span>
                    <span><i className="fa-solid fa-heart"></i> {formatNumber(item.metrics?.likes || 0)}</span>
                    <span><i className="fa-solid fa-comment"></i> {formatNumber(item.metrics?.comments || 0)}</span>
                  </div>
                </div>
                <div className="video-score">
                  <span>{formatNumber(item.metrics?.engagementRate || 0, 2)}%</span>
                  <p>Engagement</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderVideosTab = () => (
    <div className="analytics-tab-panel">
      <div className="videos-grid">
        <div className="videos-table">
          <div className="videos-table-header">
            <span>Video</span>
            <span>Views</span>
            <span>Likes</span>
            <span>Comments</span>
            <span>Shares</span>
            <span>Engagement</span>
          </div>
          <div className="videos-table-body">
            {videos.length === 0 ? (
              <div className="empty-state">No videos published yet.</div>
            ) : (
              videos.map((item) => (
                <button
                  key={item.video?._id}
                  className={`videos-table-row ${selectedVideoId === item.video?._id ? 'active' : ''}`}
                  onClick={() => handleSelectVideo(item.video?._id)}
                >
                  <div className="video-cell">
                    {item.video?.thumbnail ? (
                      <img src={item.video.thumbnail} alt={item.video?.description || 'Video thumbnail'} />
                    ) : (
                      <div className="video-thumb-placeholder small">
                        <i className="fa-solid fa-video"></i>
                      </div>
                    )}
                    <div>
                      <p>{item.video?.description || 'Untitled Video'}</p>
                      <span>{item.video?.createdAt ? new Date(item.video.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                  <span>{formatNumber(item.metrics?.views || 0)}</span>
                  <span>{formatNumber(item.metrics?.likes || 0)}</span>
                  <span>{formatNumber(item.metrics?.comments || 0)}</span>
                  <span>{formatNumber(item.metrics?.shares || 0)}</span>
                  <span>{formatNumber(item.metrics?.engagementRate || 0, 2)}%</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="video-detail-panel">
          {!selectedVideoId ? (
            <div className="empty-state">Select a video to see detailed analytics.</div>
          ) : videoDetails.loading ? (
            <div className="panel-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading video analytics...</p>
            </div>
          ) : videoDetails.error ? (
            <div className="panel-error">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <p>{videoDetails.error}</p>
            </div>
          ) : (
            <>
              <h3>Video Analytics</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Views</span>
                  <span className="metric-value">{formatNumber(videoDetails.summary?.views || 0)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Likes</span>
                  <span className="metric-value">{formatNumber(videoDetails.summary?.likes || 0)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Comments</span>
                  <span className="metric-value">{formatNumber(videoDetails.summary?.comments || 0)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Shares</span>
                  <span className="metric-value">{formatNumber(videoDetails.summary?.shares || 0)}</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Avg Watch Time</span>
                  <span className="metric-value">
                    {videoDetails.summary?.averageWatchTime
                      ? `${videoDetails.summary.averageWatchTime.toFixed(1)}s`
                      : '—'}
                  </span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Engagement Rate</span>
                  <span className="metric-value">
                    {videoDetails.engagement?.engagementRate !== undefined
                      ? `${videoDetails.engagement.engagementRate.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
              </div>

              <h4>Audience Breakdown</h4>
              <div className="demographics-grid">
                <div className="demographic-card">
                  <span className="metric-label">Top Age Groups</span>
                  <ul>
                    {Object.entries(videoDetails.demographics?.age || {}).length === 0
                      ? <li>No data yet.</li>
                      : Object.entries(videoDetails.demographics.age)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([age, value]) => (
                            <li key={age}>
                              <span>{age}</span>
                              <span>{formatNumber(value)}</span>
                            </li>
                          ))}
                  </ul>
                </div>
                <div className="demographic-card">
                  <span className="metric-label">Gender</span>
                  <ul>
                    {Object.entries(videoDetails.demographics?.gender || {}).length === 0
                      ? <li>No data yet.</li>
                      : Object.entries(videoDetails.demographics.gender).map(([gender, value]) => (
                          <li key={gender}>
                            <span>{gender}</span>
                            <span>{formatNumber(value)}</span>
                          </li>
                        ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderAudienceTab = () => (
    <div className="analytics-tab-panel">
      <div className="analytics-section">
        <h3 className="section-title">Audience Overview</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="metric-label">Followers</span>
            <span className="metric-value">{formatNumber(audienceOverview?.followers || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Age 18-24</span>
            <span className="metric-value">
              {formatNumber(audienceOverview?.demographics?.age?.['18-24'] || 0)}
            </span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Age 25-34</span>
            <span className="metric-value">
              {formatNumber(audienceOverview?.demographics?.age?.['25-34'] || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="section-title">Top Countries</h3>
        <div className="demographics-grid">
          <div className="demographic-card wide">
            <ul>
              {audienceDemographics?.location && Object.keys(audienceDemographics.location).length > 0 ? (
                Object.entries(audienceDemographics.location)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([country, count]) => (
                    <li key={country}>
                      <span>{country}</span>
                      <span>{formatNumber(count)}</span>
                    </li>
                  ))
              ) : (
                <li>No geographic data yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="section-title">Hourly Activity</h3>
        <div className="activity-grid">
          {audienceActivity?.hourly && Object.keys(audienceActivity.hourly).length > 0 ? (
            Object.entries(audienceActivity.hourly)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .slice(0, 12)
              .map(([hour, count]) => (
                <div key={hour} className="activity-card">
                  <span className="metric-label">{hour}:00</span>
                  <span className="metric-value">{formatNumber(count)}</span>
                </div>
              ))
          ) : (
            <div className="empty-state">Not enough audience activity data yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderGrowthTab = () => (
    <div className="analytics-tab-panel">
      <div className="analytics-section">
        <h3 className="section-title">Follower Growth</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="metric-label">Current Followers</span>
            <span className="metric-value">{formatNumber(audienceGrowth?.currentFollowers || 0)}</span>
          </div>
          <div className="summary-card">
            <span className="metric-label">Growth Rate</span>
            <span className="metric-value">
              {audienceGrowth?.growthRate !== undefined ? `${audienceGrowth.growthRate.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const activePanelLabelledBy = `analytics-tab-${activeTab}`;

  return (
    <div className="creator-analytics-overlay" onClick={onClose} role="presentation">
      <div
        className="creator-analytics-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-analytics-title"
      >
        <div className="analytics-header">
          <button className="analytics-close-btn" onClick={onClose} aria-label="Close creator analytics dialog">
            <i className="fa-solid fa-times" aria-hidden="true"></i>
          </button>
          <h2 id="creator-analytics-title">Creator Analytics</h2>
          <div className="analytics-header-actions">
            <select
              className="date-range-select"
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              aria-label="Select analytics date range"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
            <button className="export-btn" onClick={handleExportReport}>
              <i className="fa-solid fa-download" aria-hidden="true"></i>
              Export
            </button>
          </div>
        </div>

        <div className="analytics-tabs" role="tablist" aria-label="Analytics sections">
          <button
            className={`analytics-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            role="tab"
            id="analytics-tab-overview"
            aria-selected={activeTab === 'overview'}
            aria-controls="analytics-panel"
          >
            <i className="fa-solid fa-chart-line" aria-hidden="true"></i>
            Overview
          </button>
          <button
            className={`analytics-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
            role="tab"
            id="analytics-tab-videos"
            aria-selected={activeTab === 'videos'}
            aria-controls="analytics-panel"
          >
            <i className="fa-solid fa-video" aria-hidden="true"></i>
            Videos
          </button>
          <button
            className={`analytics-tab ${activeTab === 'audience' ? 'active' : ''}`}
            onClick={() => setActiveTab('audience')}
            role="tab"
            id="analytics-tab-audience"
            aria-selected={activeTab === 'audience'}
            aria-controls="analytics-panel"
          >
            <i className="fa-solid fa-users" aria-hidden="true"></i>
            Audience
          </button>
          <button
            className={`analytics-tab ${activeTab === 'growth' ? 'active' : ''}`}
            onClick={() => setActiveTab('growth')}
            role="tab"
            id="analytics-tab-growth"
            aria-selected={activeTab === 'growth'}
            aria-controls="analytics-panel"
          >
            <i className="fa-solid fa-seedling" aria-hidden="true"></i>
            Growth
          </button>
        </div>

        <div
          className="analytics-content"
          id="analytics-panel"
          role="tabpanel"
          aria-labelledby={activePanelLabelledBy}
          aria-live="polite"
        >
          {loading ? (
            <div className="analytics-loading" role="status" aria-live="polite" data-testid="analytics-loading">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
              <p>Loading analytics...</p>
            </div>
          ) : error ? (
            <div className="analytics-error" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <p>{error}</p>
              <button className="refresh-btn" onClick={loadAnalytics}>
                <i className="fa-solid fa-rotate" aria-hidden="true"></i>
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'videos' && renderVideosTab()}
              {activeTab === 'audience' && renderAudienceTab()}
              {activeTab === 'growth' && renderGrowthTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorAnalytics;

