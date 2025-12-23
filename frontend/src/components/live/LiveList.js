/**
 * Live Stream List Component
 * 
 * Recent Changes:
 * - Added category filtering for live streams
 * - Enhanced image URL resolution with API_URL support
 * - Improved error handling for missing thumbnails
 * - Added real-time stream updates with polling
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLiveStreams } from '../../api/live';
import './LiveList.css';

const LiveList = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'dance', label: 'Dance' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'food', label: 'Food' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'music', label: 'Music' },
    { value: 'talk', label: 'Talk' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'fashion', label: 'Fashion' }
  ];

  useEffect(() => {
    fetchStreams();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, [selectedCategory]);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const response = await getActiveLiveStreams(selectedCategory);
      if (response.success) {
        setStreams(response.streams || []);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamClick = (stream) => {
    navigate(`/live/${stream.id}`, { state: { stream } });
  };

  const formatViewerCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="live-list-container">
      <div className="live-list-header">
        <h1 className="live-list-title">
          <i className="fa-solid fa-broadcast-tower"></i> Live Now
        </h1>
        <div className="live-list-categories">
          {categories.map((cat) => (
              const apiBase = window.APP_CONFIG?.API_URL ?? 'http://localhost:5000';

              const resolveUrl = (path) => {
                if (!path) return '';
                try {
                  // If it's already an absolute URL, return as-is
                  const u = new URL(path);
                  return u.href;
                } catch (e) {
                  // Not an absolute URL — prefix with API_URL
                  const prefix = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
                  const p = path.startsWith('/') ? path : `/${path}`;
                  return `${prefix}${p}`;
                }
              };

              const thumbnailSrc = stream.thumbnail ? resolveUrl(stream.thumbnail) : (stream.profilePicture ? resolveUrl(stream.profilePicture) : '/default-avatar.png');
              const avatarSrc = stream.profilePicture ? resolveUrl(stream.profilePicture) : '/default-avatar.png';

              return (
            <button
              key={cat.value}
              className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
                  <img
                    src={thumbnailSrc}
                    alt={stream.title}
                    onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                  />
          <div className="spinner"></div>
          <p>Loading live streams...</p>
        </div>
      ) : streams.length === 0 ? (
        <div className="live-list-empty">
          <i className="fa-solid fa-broadcast-tower"></i>
          <h2>No live streams at the moment</h2>
          <p>Be the first to go live!</p>
        </div>
      ) : (
        <div className="live-list-grid">
                    <img
                      src={avatarSrc}
                      alt={stream.username}
                      className="live-stream-avatar"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                    />
                  src={stream.thumbnail || stream.profilePicture || '/default-avatar.png'}
                  alt={stream.title}
                  onError={(e) => {
                    e.target.src = '/default-avatar.png';
                  }}
                />
              );
            })}
                  <span className="live-dot"></span>
                  LIVE
                </div>
                <div className="live-viewer-count">
                  <i className="fa-solid fa-eye"></i>
                  {formatViewerCount(stream.viewerCount)}
                </div>
              </div>
              <div className="live-stream-info">
                <div className="live-stream-user">
                  <img
                    src={stream.profilePicture || '/default-avatar.png'}
                    alt={stream.username}
                    className="live-stream-avatar"
                    onError={(e) => {
                      e.target.src = '/default-avatar.png';
                    }}
                  />
                  <div className="live-stream-user-info">
                    <h3 className="live-stream-username">{stream.username}</h3>
                    <p className="live-stream-title">{stream.title}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveList;

