import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LiveStreamSetup from './LiveStreamSetup';
import LiveStreamPlayer from './LiveStreamPlayer';
import { useSocket } from '../hooks/useSocket';
import { getActiveLiveStreams } from '../api/live';
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
  const { socket } = useSocket();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSetup, setShowSetup] = useState(false);
  const [activeStream, setActiveStream] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [myActiveStream, setMyActiveStream] = useState(null);
  const [loadingMyStream, setLoadingMyStream] = useState(false);
  const [streams, setStreams] = useState([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Fetch user's active stream
  const fetchMyActiveStream = useCallback(async () => {
    const userId = user?._id || user?.id;
    if (!isAuthenticated || !userId) {
      console.log('Not fetching stream - not authenticated or no user ID', { isAuthenticated, userId });
      return;
    }
    
    setLoadingMyStream(true);
    try {
      const API_URL = window.APP_CONFIG?.API_URL || 'https://spryclips.com';
      console.log('Fetching active stream for user:', userId);
      const response = await fetch(`${API_URL}/api/live/user/${userId}?status=live`, {
        credentials: 'include'
      });
      const data = await response.json();
      console.log('Active stream response:', data);
      
      if (data.success && data.streams && data.streams.length > 0) {
        // User has an active stream
        const stream = data.streams[0];
        console.log('Found active stream:', stream);
        setMyActiveStream({
          id: stream._id,
          roomId: stream.roomId,
          title: stream.title,
          category: stream.category,
          thumbnail: stream.thumbnail || user?.profile?.profilePicture,
          viewers: stream.viewers || 0,
          hostUsername: stream.streamer?.username || user?.username,
          hostId: stream.streamer?._id || userId,
          streamUrl: stream.streamUrl,
          createdAt: stream.actualStartTime || stream.createdAt
        });
      } else {
        console.log('No active streams found');
        setMyActiveStream(null);
      }
    } catch (error) {
      console.error('Error fetching active stream:', error);
      setMyActiveStream(null);
    } finally {
      setLoadingMyStream(false);
    }
  }, [isAuthenticated, user]);

  // Fetch user's active stream on mount and when user changes
  useEffect(() => {
    fetchMyActiveStream();
  }, [fetchMyActiveStream]);

  // Fetch active streams for LIVE section
  useEffect(() => {
    let isMounted = true;
    const fetchStreams = async () => {
      try {
        setLoadingStreams(true);
        const data = await getActiveLiveStreams(activeFilter);
        if (!isMounted) return;
        if (data && data.streams) {
          setStreams(data.streams);
        } else {
          setStreams([]);
        }
      } catch (err) {
        console.error('Failed to fetch active streams:', err);
      } finally {
        if (isMounted) setLoadingStreams(false);
      }
    };

    fetchStreams();

    // Polling fallback every 10s
    const interval = setInterval(fetchStreams, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeFilter]);

  // Listen for realtime stream-started events and update list
  useEffect(() => {
    if (!socket) return;

    const handleStarted = ({ stream }) => {
      try {
        // If the stream matches current filter, prepend it
        if (activeFilter === 'all' || stream.category === activeFilter) {
          setStreams(prev => {
            // avoid duplicates
            if (prev.find(s => String(s.id) === String(stream.id))) return prev;
            return [stream, ...(prev || [])].slice(0, 50);
          });
        }
      } catch (e) {
        console.error('Error handling live:stream-started', e);
      }
    };

    socket.on('live:stream-started', handleStarted);
    return () => {
      socket.off('live:stream-started', handleStarted);
    };
  }, [socket, activeFilter]);

  // Handle Go Live button - check auth first
  const handleGoLive = () => {
    if (!isAuthenticated || !user) {
      // Redirect to login
      navigate('/login', { state: { from: { pathname: '/live' } } });
      return;
    }
    
    // If user already has an active stream, resume it
    if (myActiveStream) {
      setActiveStream(myActiveStream);
      setIsBroadcasting(true);
      return;
    }
    
    setShowSetup(true);
  };

  // Resume my active stream
  const handleResumeStream = () => {
    if (myActiveStream) {
      setActiveStream({
        ...myActiveStream,
        isResuming: true
      });
      setIsBroadcasting(true);
    }
  };

  // End stream from card without resuming
  const handleEndStreamFromCard = async (e) => {
    e.stopPropagation(); // Prevent card click (resuming)
    
    if (!window.confirm('Are you sure you want to end your stream?')) {
      return;
    }

    try {
      const streamId = myActiveStream?.id || myActiveStream?._id;
      if (!streamId) {
        console.error('No stream ID found');
        return;
      }

      const API_URL = window.APP_CONFIG?.API_URL || 'https://spryclips.com';
      const response = await fetch(`${API_URL}/api/live/${streamId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to end stream:', data.message);
        alert('Failed to end stream: ' + (data.message || 'Unknown error'));
        return;
      }

      console.log('Stream ended successfully');
      setMyActiveStream(null);
      fetchMyActiveStream(); // Refresh to confirm
    } catch (error) {
      console.error('Error ending stream:', error);
      alert('Error ending stream. Please try again.');
    }
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
    // prefer real streams fetched from API; fall back to SAMPLE_STREAMS
    const list = (streams && streams.length > 0) ? streams : SAMPLE_STREAMS;
    if (activeFilter === 'all') return list;
    return list.filter((stream) => (stream.category || '').toLowerCase() === activeFilter);
  }, [activeFilter, streams]);

  const formatViewerCount = (count = 0) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // Format stream duration
  const formatDuration = (startTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
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
            {myActiveStream ? 'Resume Stream' : 'Go Live'}
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
          {/* My Active Stream Card */}
          {myActiveStream && !loadingMyStream && (
            <div className="my-active-stream-section">
              <h2 className="my-stream-header">
                <i className="fa-solid fa-broadcast-tower"></i>
                Your Active Stream
              </h2>
              <div className="my-stream-card">
                <div className="my-stream-preview">
                  <div className="my-stream-thumbnail">
                    {myActiveStream.thumbnail ? (
                      <img src={myActiveStream.thumbnail} alt="Stream thumbnail" />
                    ) : (
                      <div className="my-stream-placeholder">
                        <i className="fa-solid fa-video"></i>
                      </div>
                    )}
                    <div className="my-stream-live-badge">
                      <span className="pulse-dot"></span>
                      LIVE
                    </div>
                  </div>
                  <div className="my-stream-info">
                    <h3>{myActiveStream.title}</h3>
                    <div className="my-stream-stats">
                      <span className="my-stream-stat">
                        <i className="fa-solid fa-users"></i>
                        {formatViewerCount(myActiveStream.viewers)} watching
                      </span>
                      <span className="my-stream-stat">
                        <i className="fa-solid fa-clock"></i>
                        {formatDuration(myActiveStream.createdAt)}
                      </span>
                      <span className="my-stream-category">{myActiveStream.category}</span>
                    </div>
                    <p className="my-stream-room-id">
                      Room ID: <code>{myActiveStream.roomId?.slice(0, 8)}...</code>
                    </p>
                  </div>
                </div>
                <div className="my-stream-actions">
                  <button className="resume-stream-btn" onClick={handleResumeStream}>
                    <i className="fa-solid fa-play"></i>
                    Resume Broadcasting
                  </button>
                  <button className="end-stream-card-btn" onClick={handleEndStreamFromCard}>
                    <i className="fa-solid fa-stop"></i>
                    End Stream
                  </button>
                </div>
              </div>
            </div>
          )}

          {filteredStreams.length === 0 && !myActiveStream ? (
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
            console.log('onStartLive called with streamData:', streamData);
            console.log('streamData.stream:', streamData.stream);
            console.log('stream tracks:', streamData.stream?.getTracks?.());
            
            // Set active stream FIRST before closing setup
            // This ensures the stream reference is captured before setup unmounts
            setActiveStream({
              ...streamData,
              hostUsername: streamData.hostUsername || user?.username,
              hostId: streamData.hostId || user?._id
            });
            setIsBroadcasting(true);
            setShowSetup(false);
            // Refresh my active stream
            fetchMyActiveStream();
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
            // Refresh to check if stream ended
            fetchMyActiveStream();
          }}
        />
      )}
    </div>
  );
};

export default LIVE;














