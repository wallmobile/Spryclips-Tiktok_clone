import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LiveStreamSetup from './LiveStreamSetup';
import LiveStreamPlayer from './LiveStreamPlayer';
import './LIVE.css';

const SAMPLE_STREAMS = [
  {
    id: 1,
    thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&auto=format&fit=crop&q=80',
    user: 'music_live',
    viewers: 18300,
    title: 'Live Music Session 🎵',
    category: 'music'
  },
  {
    id: 2,
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80',
    user: 'game_master',
    viewers: 8900,
    title: 'Gaming Stream 🎮',
    category: 'gaming'
  },
  {
    id: 3,
    thumbnail: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&auto=format&fit=crop&q=80',
    user: 'chef_live',
    viewers: 15200,
    title: 'Cooking Show 👨‍🍳',
    category: 'food'
  },
  {
    id: 4,
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    user: 'laughstream',
    viewers: 22100,
    title: 'Stand-up Comedy 😂',
    category: 'comedy'
  },
  {
    id: 5,
    thumbnail: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=80',
    user: 'dance_floor',
    viewers: 13450,
    title: 'Dance Battles Live 💃',
    category: 'dance'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'dance', label: 'Dance' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'food', label: 'Food' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'music', label: 'Music' }
];

const LIVE = ({ onClose = () => {} }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSetup, setShowSetup] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Handle Go Live button - check auth first
  const handleGoLive = () => {
    if (!isAuthenticated || !user) {
      // Redirect to login
      navigate('/login', { state: { from: { pathname: '/live' } } });
      return;
    }
    setShowSetup(true);
  };

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

  const filteredStreams = useMemo(() => {
    if (activeFilter === 'all') return SAMPLE_STREAMS;
    return SAMPLE_STREAMS.filter((stream) => stream.category.toLowerCase() === activeFilter);
  }, [activeFilter]);

  const formatViewerCount = (count = 0) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="live-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="live-container" onClick={(e) => e.stopPropagation()}>
        <div className="live-header">
          <button className="live-close-btn" onClick={onClose} aria-label="Close live overlay">
            <i className="fa-solid fa-times"></i>
          </button>
          <h1>
            <span className="live-indicator"></span>
            LIVE
          </h1>
          <button className="live-create-btn" onClick={handleGoLive} type="button">
            <i className="fa-solid fa-video"></i>
            Go Live
          </button>
        </div>

        <div className="live-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`live-category-btn ${activeFilter === cat.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat.id)}
              type="button"
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="live-content">
          {filteredStreams.length === 0 ? (
            <div className="live-empty">
              <i className="fa-solid fa-satellite-dish"></i>
              <h3>No live streams right now</h3>
              <p>Check back soon or start your own live broadcast.</p>
            </div>
          ) : (
            <div className="live-grid">
              {filteredStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="live-stream-card"
                  onClick={() => {
                    setActiveStream(stream);
                    setIsBroadcasting(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter') {
                      setActiveStream(stream);
                      setIsBroadcasting(false);
                    }
                  }}
                >
                  <div className="live-thumbnail-wrapper">
                    <img
                      src={stream.thumbnail}
                      alt={`${stream.title} by ${stream.user}`}
                      className="live-thumbnail"
                      loading="lazy"
                    />
                    <div className="live-badge">
                      <i className="fa-solid fa-circle"></i>
                      LIVE
                    </div>
                    <div className="live-viewers" aria-label="Viewer count">
                      <i className="fa-solid fa-users"></i>
                      {formatViewerCount(stream.viewers)}
                    </div>
                  </div>
                  <div className="live-stream-info">
                    <div className="live-creator-avatar">
                      <img
                        src={`https://ui-avatars.com/api/?name=${stream.user}&background=E50914&color=fff`}
                        alt={stream.user}
                        loading="lazy"
                      />
                    </div>
                    <div className="live-stream-details">
                      <h3>{stream.title}</h3>
                      <p>@{stream.user}</p>
                      <span className="live-category-tag">{stream.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSetup && (
        <LiveStreamSetup
          onClose={() => setShowSetup(false)}
          onStartLive={(streamData) => {
            setShowSetup(false);
            setIsBroadcasting(true);
            // streamData now contains roomId, hostUsername, etc. from backend
            setActiveStream({
              ...streamData,
              hostUsername: streamData.hostUsername || user?.username,
              hostId: streamData.hostId || user?._id
            });
          }}
        />
      )}

      {activeStream && (
        <LiveStreamPlayer
          streamData={activeStream}
          isBroadcaster={isBroadcasting}
          onEnd={() => {
            setIsBroadcasting(false);
            setActiveStream(null);
          }}
        />
      )}
    </div>
  );
};

export default LIVE;














