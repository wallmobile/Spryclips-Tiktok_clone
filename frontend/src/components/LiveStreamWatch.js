import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LiveStreamPlayer from './LiveStreamPlayer';
import './LIVE.css';

const LiveStreamWatch = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreamData = async () => {
      try {
        setLoading(true);
        setError(null);

        const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/live/room/${roomId}`, {
          credentials: 'include' // Use cookies for authentication
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Stream not found');
        }

        // Check if stream is still live
        if (data.stream.status !== 'live') {
          throw new Error('This stream has ended');
        }

        setStreamData(data.stream);
      } catch (err) {
        console.error('Error fetching stream:', err);
        setError(err.message || 'Failed to load stream');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchStreamData();
    }
  }, [roomId]);

  const handleClose = () => {
    navigate('/live');
  };

  if (loading) {
    return (
      <div className="live-overlay" role="dialog" aria-modal="true">
        <div className="live-stream-loading">
          <div className="loading-spinner-large"></div>
          <p>Connecting to stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-overlay" role="dialog" aria-modal="true">
        <div className="live-stream-error">
          <i className="fa-solid fa-satellite-dish"></i>
          <h3>Stream Unavailable</h3>
          <p>{error}</p>
          <button className="back-to-live-btn" onClick={handleClose}>
            <i className="fa-solid fa-arrow-left"></i>
            Browse Live Streams
          </button>
        </div>
      </div>
    );
  }

  if (!streamData) {
    return null;
  }

  return (
    <div className="live-overlay" role="dialog" aria-modal="true">
      <LiveStreamPlayer
        streamData={streamData}
        isBroadcaster={false}
        onEnd={handleClose}
      />
    </div>
  );
};

export default LiveStreamWatch;
