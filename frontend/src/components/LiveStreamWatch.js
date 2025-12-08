import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import './LIVE.css';
import './LiveStreamPlayer.css';

// STUN servers for WebRTC NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const LiveStreamWatch = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch stream data
  useEffect(() => {
    const fetchStreamData = async () => {
      try {
        setLoading(true);
        setError(null);

        const API_URL = window.APP_CONFIG?.API_URL || 'https://spryclips.com';
        const response = await fetch(`${API_URL}/api/live/room/${roomId}`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Stream not found');
        }

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

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log('[Viewer] Creating peer connection');
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Handle incoming tracks (this is the video from the host!)
    pc.ontrack = (event) => {
      console.log('[Viewer] Received track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(console.error);
        }
        setConnectionState('connected');
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[Viewer] Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Viewer] ICE connection state:', pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  // Handle offer from host
  const handleOffer = useCallback(async (offer, hostSocketId) => {
    try {
      console.log('[Viewer] Received offer from host');
      const pc = peerConnectionRef.current || createPeerConnection();

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[Viewer] Set remote description');

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc:ice-candidate', {
            roomId: streamData?._id,
            candidate: event.candidate,
            targetId: hostSocketId
          });
        }
      };

      socket.emit('webrtc:answer', {
        roomId: streamData?._id,
        answer: pc.localDescription,
        targetId: hostSocketId
      });

      console.log('[Viewer] Sent answer to host');
      setConnectionState('connecting');
    } catch (error) {
      console.error('[Viewer] Error handling offer:', error);
      setError('Failed to connect to stream');
    }
  }, [socket, streamData, createPeerConnection]);

  // Handle ICE candidate from host
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[Viewer] Added ICE candidate from host');
    } catch (error) {
      console.error('[Viewer] Error adding ICE candidate:', error);
    }
  }, []);

  // Join stream as viewer via WebSocket
  useEffect(() => {
    if (!socket || !isConnected || !streamData) return;

    console.log('[Viewer] Joining stream room:', streamData._id);
    setConnectionState('connecting');

    // Create peer connection first
    createPeerConnection();

    // Join the room as viewer
    socket.emit('live:join', { roomId: streamData._id, role: 'viewer' });

    // Handle joined confirmation
    const handleJoined = ({ role, viewerCount: count, hostSocketId }) => {
      console.log('[Viewer] Joined room as:', role, 'Viewers:', count);
      setViewerCount(count);
    };

    // Handle offer from host
    const handleOfferEvent = ({ offer, fromId }) => {
      handleOffer(offer, fromId);
    };

    // Handle ICE candidate from host
    const handleIceCandidateEvent = ({ candidate }) => {
      handleIceCandidate(candidate);
    };

    // Handle viewer count updates
    const handleViewerCount = ({ count }) => {
      setViewerCount(count);
    };

    // Handle host disconnecting
    const handleHostOffline = () => {
      setError('Host disconnected');
      setConnectionState('disconnected');
    };

    // Handle stream ended
    const handleStreamEnded = () => {
      setError('Stream has ended');
      setConnectionState('disconnected');
    };

    // Handle live chat messages
    const handleChatMessage = ({ message }) => {
      setComments(prev => [...prev.slice(-49), {
        id: message._id,
        username: message.user?.username || 'viewer',
        text: message.message,
        timestamp: message.createdAt
      }]);
    };

    socket.on('live:joined', handleJoined);
    socket.on('webrtc:offer', handleOfferEvent);
    socket.on('webrtc:ice-candidate', handleIceCandidateEvent);
    socket.on('live:viewer-count', handleViewerCount);
    socket.on('live:host-offline', handleHostOffline);
    socket.on('live:ended', handleStreamEnded);
    socket.on('live:chat', handleChatMessage);

    return () => {
      socket.off('live:joined', handleJoined);
      socket.off('webrtc:offer', handleOfferEvent);
      socket.off('webrtc:ice-candidate', handleIceCandidateEvent);
      socket.off('live:viewer-count', handleViewerCount);
      socket.off('live:host-offline', handleHostOffline);
      socket.off('live:ended', handleStreamEnded);
      socket.off('live:chat', handleChatMessage);
      
      // Leave room and close connection
      socket.emit('live:leave', { roomId: streamData._id });
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [socket, isConnected, streamData, createPeerConnection, handleOffer, handleIceCandidate]);

  // Scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Send chat message
  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !socket || !streamData) return;

    socket.emit('live:chat', {
      roomId: streamData._id,
      message: newComment.trim()
    });

    // Optimistically add comment
    setComments(prev => [...prev.slice(-49), {
      id: Date.now(),
      username: user?.username || 'viewer',
      text: newComment,
      timestamp: new Date()
    }]);
    
    setNewComment('');
    inputRef.current?.focus();
  };

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

  if (error && !streamData) {
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
    <div className="live-stream-player">
      {/* Main Video Area */}
      <div className="stream-main">
        <div className="stream-video-container video-loaded">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="stream-video"
          />
          
          {/* Connection State Overlay */}
          {connectionState === 'connecting' && (
            <div className="camera-loading-overlay">
              <div className="camera-loading-spinner"></div>
              <p>Connecting to host...</p>
            </div>
          )}

          {connectionState === 'failed' && (
            <div className="camera-error-overlay">
              <i className="fa-solid fa-wifi-slash"></i>
              <h4>Connection Failed</h4>
              <p>Unable to connect to the stream</p>
              <button className="retry-camera-btn" onClick={() => window.location.reload()}>
                <i className="fa-solid fa-refresh"></i>
                Retry
              </button>
            </div>
          )}

          {error && connectionState !== 'connected' && (
            <div className="camera-error-overlay">
              <i className="fa-solid fa-broadcast-tower"></i>
              <h4>Stream Ended</h4>
              <p>{error}</p>
              <button className="retry-camera-btn" onClick={handleClose}>
                <i className="fa-solid fa-arrow-left"></i>
                Back to Live
              </button>
            </div>
          )}
          
          {/* Stream Overlay Info */}
          <div className="stream-overlay">
            <div className="stream-info-top">
              <div className="live-badge-stream">
                <span className="live-dot"></span>
                LIVE
              </div>
              <div className="viewer-count">
                <i className="fa-solid fa-users"></i>
                {viewerCount} watching
              </div>
              <div className="connection-status">
                <i className={`fa-solid ${connectionState === 'connected' ? 'fa-wifi' : 'fa-spinner fa-spin'}`}></i>
                {connectionState === 'connected' ? 'Connected' : 'Connecting...'}
              </div>
            </div>

            {/* Stream Title */}
            <div className="stream-title-container">
              <div className="stream-title-bar">
                <span className="online-status-dot"></span>
                <div className="stream-title-content">
                  <h3>{streamData?.title || 'Live Stream'}</h3>
                  <p className="host-info">
                    <span className="host-label">Host:</span>
                    <span className="host-username">@{streamData?.streamer?.username || 'host'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button className="stream-close-btn" onClick={handleClose}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>

        {/* Live Comments Sidebar */}
        <div className="comments-sidebar">
          <div className="comments-header">
            <h4>Live Comments</h4>
            <span className="comment-count">{comments.length}</span>
          </div>

          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="live-comment-item">
                <div className="comment-content">
                  <span className="comment-username">@{comment.username}</span>
                  <span className="comment-text">{comment.text}</span>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Input */}
          <form className="comment-input-form" onSubmit={handleSendComment}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="comment-input"
            />
            <button type="submit" className="send-comment-btn">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamWatch;
