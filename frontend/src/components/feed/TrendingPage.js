import React, { useState, useEffect } from 'react';
import { getTrendingVideos } from '../../api/recommendations';
import { getTrendingHashtags } from '../../api/hashtags';
import './TrendingPage.css';

const TrendingPage = ({ onClose }) => {
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' or 'hashtags'
  const [timeRange, setTimeRange] = useState('today'); // 'today', 'week', 'month'
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadVideos = async () => {
      setLoadingVideos(true);
      setError(null);
      try {
        const params = { limit: 20, period: timeRange };
        if (timeRange === 'today') params.range = '24h';
        const response = await getTrendingVideos(params);
        const items = Array.isArray(response?.videos)
          ? response.videos
          : Array.isArray(response)
            ? response
            : response?.data || [];
        setTrendingVideos(items.map(normalizeVideo).filter(Boolean));
      } catch (err) {
        console.error('Error loading trending videos:', err);
        setError('Unable to load trending videos.');
        setTrendingVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    };

    const loadHashtags = async () => {
      setLoadingHashtags(true);
      try {
        const response = await getTrendingHashtags(30);
        const items = Array.isArray(response?.hashtags)
          ? response.hashtags
          : Array.isArray(response)
            ? response
            : [];
        setTrendingHashtags(items.map(normalizeHashtag));
      } catch (err) {
        console.error('Error loading trending hashtags:', err);
        setTrendingHashtags([]);
      } finally {
        setLoadingHashtags(false);
      }
    };

    loadVideos();
    loadHashtags();
  }, [timeRange]);

  const normalizeVideo = (video) => {
    if (!video) return null;
    const stats = video.stats || {};

    return {
      id: video._id || video.id,
      src: video.transcoded?.url || video.url || video.playbackUrl || '',
      profileImg:
        video.creator?.profile?.avatar ||
        video.owner?.profile?.avatar ||
        video.avatar ||
        'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
      username: video.creator?.username || video.owner?.username || video.username || 'creator',
      description: video.description || video.caption || '',
      likes: stats.likes ?? video.likes ?? 0,
      comments: stats.comments ?? video.comments ?? 0,
      shares: stats.shares ?? video.shares ?? 0,
      views: stats.views ?? video.views ?? 0,
      createdAt: video.createdAt || video.publishedAt || new Date().toISOString(),
      trendingScore: video.trendingScore ?? stats.trendingScore ?? video.score ?? 0,
    };
  };

  const normalizeHashtag = (tag) => {
    if (!tag) return null;
    return {
      tag: (tag.name || tag.tag || tag.hashtag || '').replace(/^#/, ''),
      count: tag.videoCount ?? tag.count ?? 0,
      score: tag.trendingScore ?? tag.score ?? tag.viewCount ?? 0,
    };
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="trending-page-overlay" onClick={onClose}>
      <div className="trending-page-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="trending-page-header">
          <button className="trending-page-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Trending</h2>
          <div className="trending-page-header-actions">
            <select 
              className="time-range-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="trending-tabs">
          <button
            className={`trending-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <i className="fa-solid fa-video"></i>
            <span>Videos</span>
          </button>
          <button
            className={`trending-tab ${activeTab === 'hashtags' ? 'active' : ''}`}
            onClick={() => setActiveTab('hashtags')}
          >
            <i className="fa-solid fa-hashtag"></i>
            <span>Hashtags</span>
          </button>
        </div>

        {/* Content */}
        <div className="trending-content">
          {activeTab === 'videos' ? (
            <div className="trending-videos-grid">
              {loadingVideos ? (
                <div className="trending-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading trending videos...</p>
                </div>
              ) : error ? (
                <div className="trending-error">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <p>{error}</p>
                </div>
              ) : trendingVideos.length === 0 ? (
                <div className="trending-empty">
                  <i className="fa-solid fa-video-slash"></i>
                  <p>No trending videos available.</p>
                </div>
              ) : (
                trendingVideos.map((video, index) => (
                  <div key={video.id} className="trending-video-card">
                    <div className="trending-rank">#{index + 1}</div>
                    <div className="trending-video-thumbnail">
                      {video.src ? (
                        <video
                          src={video.src}
                          muted
                          playsInline
                          onMouseEnter={(e) => e.target.play()}
                          onMouseLeave={(e) => {
                            e.target.pause();
                            e.target.currentTime = 0;
                          }}
                        />
                      ) : (
                        <div className="trending-video-placeholder">
                          <i className="fa-solid fa-video"></i>
                        </div>
                      )}
                      <div className="trending-video-overlay">
                        <div className="trending-engagement">
                          <span><i className="fa-solid fa-heart"></i> {formatCount(video.likes || 0)}</span>
                          <span><i className="fa-solid fa-comment"></i> {formatCount(video.comments || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="trending-video-info">
                      <div className="trending-video-creator">
                        <img src={video.profileImg} alt={video.username} />
                        <span>@{video.username}</span>
                      </div>
                      <p className="trending-video-description">{video.description}</p>
                      <div className="trending-video-stats">
                        <span>{formatTime(video.createdAt)}</span>
                        <span className="trending-score">
                          <i className="fa-solid fa-fire"></i>
                          {formatCount(Math.floor(video.trendingScore || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="trending-hashtags-list">
              {loadingHashtags ? (
                <div className="trending-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading trending hashtags...</p>
                </div>
              ) : trendingHashtags.length === 0 ? (
                <div className="trending-empty">
                  <i className="fa-solid fa-hashtag"></i>
                  <p>No trending hashtags available.</p>
                </div>
              ) : (
                trendingHashtags.map((item, index) => (
                  <div key={item.tag || index} className="trending-hashtag-item">
                    <div className="hashtag-rank">#{index + 1}</div>
                    <div className="hashtag-info">
                      <h3>#{item.tag}</h3>
                      <div className="hashtag-stats">
                        <span>
                          <i className="fa-solid fa-video"></i>
                          {formatCount(item.count)} videos
                        </span>
                        <span>
                          <i className="fa-solid fa-fire"></i>
                          {formatCount(Math.floor(item.score))} trending score
                        </span>
                      </div>
                    </div>
                    <button className="hashtag-view-btn" onClick={() => {
                      window.location.href = `/tag/${item.tag}`;
                    }}>
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;
