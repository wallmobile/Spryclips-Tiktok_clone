import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLiveStreams } from '../api/live';
import './LiveList.css';

const LiveList = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'dance', label: 'Dance' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'food', label: 'Food' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'music', label: 'Music' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'education', label: 'Education' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'travel', label: 'Travel' }
  ];

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const resp = await getActiveLiveStreams(selectedCategory);
      if (resp && resp.success) {
        setStreams(resp.streams || []);
      } else {
        setStreams([]);
      }
    } catch (err) {
      console.error('Error fetching live streams', err);
      setStreams([]);
    } finally {
      setLoading(false);
    }
  };

  const resolveUrl = (path) => {
    const API_URL = window.APP_CONFIG?.API_URL || '';
    if (!path) return '';
    try {
      // already absolute
      const u = new URL(path);
      return u.href;
    } catch (e) {
      if (!API_URL) return path;
      const prefix = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const p = path.startsWith('/') ? path : `/${path}`;
      return `${prefix}${p}`;
    }
  };

  const handleStreamClick = (stream) => {
    navigate(`/live/watch/${stream.roomId || stream.id || stream._id}` , { state: { stream } });
  };

  const formatViewerCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  return (
    <div className="live-list-container">
      <div className="live-list-header">
        <h1 className="live-list-title"><i className="fa-solid fa-broadcast-tower"></i> Live Now</h1>
        <div className="live-list-categories">
          {categories.map(cat => (
            <button
              key={cat.value}
              className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.value)}
            >{cat.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="live-list-loading">
          <div className="spinner" />
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
          {streams.map(stream => {
            const thumbnail = resolveUrl(stream.thumbnail || stream.profilePicture || '/default-avatar.png');
            return (
              <div key={stream.id || stream._id} className="live-stream-card" onClick={() => handleStreamClick(stream)}>
                <div className="live-stream-thumb">
                  <img src={thumbnail} alt={stream.title || 'Live'} onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }} />
                  <div className="live-badge"><span className="live-dot" /> LIVE</div>
                  <div className="live-viewer-count"><i className="fa-solid fa-eye"></i> {formatViewerCount(stream.viewerCount)}</div>
                </div>
                <div className="live-stream-info">
                  <div className="live-stream-user">
                    <img className="live-stream-avatar" src={resolveUrl(stream.profilePicture || '/default-avatar.png')} alt={stream.username} onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }} />
                    <div className="live-stream-user-info">
                      <h3 className="live-stream-username">{stream.username}</h3>
                      <p className="live-stream-title">{stream.title}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LiveList;

