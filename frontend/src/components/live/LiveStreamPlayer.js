import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import './LiveStreamPlayer.css';

// STUN servers for WebRTC NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const LiveStreamPlayer = ({ streamData, onEnd, isBroadcaster = false }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const videoRef = useRef(null);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [totalGifts, setTotalGifts] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const streamRef = useRef(null);
  
  // WebRTC refs for broadcasting
  const peerConnectionsRef = useRef(new Map()); // viewerSocketId -> RTCPeerConnection
  const viewerPeerRef = useRef(null); // RTCPeerConnection for viewer mode
  const hostSocketIdRef = useRef(null);

  const giftOptions = useMemo(() => [
    { id: 'rose', name: 'Rose', emoji: '🌹', price: 1 },
    { id: 'heart', name: 'Heart', emoji: '❤️', price: 5 },
    { id: 'diamond', name: 'Diamond', emoji: '💎', price: 10 },
    { id: 'rocket', name: 'Rocket', emoji: '🚀', price: 50 },
    { id: 'crown', name: 'Crown', emoji: '👑', price: 100 },
  ], []);

  // Simulate viewer count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
        return Math.max(0, prev + change);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Stream duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simulate live comments
  useEffect(() => {
    const interval = setInterval(() => {
      const mockComments = [
        { text: 'Amazing stream! 🔥', username: 'viewer1' },
        { text: 'Keep it up!', username: 'fan123' },
        { text: 'This is great! 👏', username: 'user456' },
      ];
      
      if (Math.random() > 0.7 && comments.length < 50) {
        const comment = mockComments[Math.floor(Math.random() * mockComments.length)];
        const newComment = {
          id: Date.now(),
          username: comment.username,
          text: comment.text,
          timestamp: new Date(),
          gift: Math.random() > 0.9 ? giftOptions[Math.floor(Math.random() * giftOptions.length)] : null,
        };
        setComments(prev => [...prev.slice(-49), newComment]);
        
        if (newComment.gift) {
          setTotalGifts(prev => prev + newComment.gift.price);
          setGifts(prev => [...prev, {
            id: Date.now(),
            gift: newComment.gift,
            username: newComment.username,
          }]);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [comments.length, giftOptions]);

  // Scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Initialize camera for broadcaster
  const initializeCamera = useCallback(async () => {
    console.log('initializeCamera called, isBroadcaster:', isBroadcaster);
    console.log('streamData?.stream:', streamData?.stream);
    
    if (!isBroadcaster) {
      console.log('Not broadcaster, skipping camera init');
      return;
    }
    
    try {
      setCameraError(null);
      
      // If we have a stream from setup, check if it's still active
      if (streamData?.stream) {
        const tracks = streamData.stream.getTracks();
        const activeTracks = tracks.filter(t => t.readyState === 'live');
        console.log('Stream has', tracks.length, 'tracks,', activeTracks.length, 'are live');
        
        // If stream tracks are stopped, request new camera access
        if (activeTracks.length === 0) {
          console.log('Stream tracks are stopped, requesting new camera');
        } else {
          console.log('Using existing stream from setup');
          streamRef.current = streamData.stream;
          if (videoRef.current) {
            videoRef.current.srcObject = streamData.stream;
            await videoRef.current.play().catch(console.error);
            setIsVideoLoaded(true);
            
            const videoTracks = streamData.stream.getVideoTracks();
            const audioTracks = streamData.stream.getAudioTracks();
            console.log('Video tracks:', videoTracks.length, 'Audio tracks:', audioTracks.length);
            console.log('Video track state:', videoTracks[0]?.readyState, 'enabled:', videoTracks[0]?.enabled);
            setIsCameraOn(videoTracks.length > 0 && videoTracks[0].enabled);
            setIsMicMuted(audioTracks.length > 0 && !audioTracks[0].enabled);
            return; // Successfully used existing stream
          }
        }
      }
      
      // Request new camera access if no stream provided or tracks are stopped
      console.log('Requesting new camera access');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: true
      });
      
      console.log('Got new stream:', stream);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(console.error);
        setIsVideoLoaded(true);
        setIsCameraOn(true);
        setIsMicMuted(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError(error.message || 'Failed to access camera');
    }
  }, [isBroadcaster, streamData?.stream]);

  // Initialize stream
  useEffect(() => {
    if (isBroadcaster) {
      initializeCamera();
    } else {
      // For viewers: if a WebRTC session is available we'll attach remoteStream,
      // otherwise fall back to a stream URL (if provided)
      if (videoRef.current) {
        if (streamData?.streamUrl) {
          // set src as fallback while waiting for WebRTC
          videoRef.current.src = streamData.streamUrl;
        }
      }
    }
  }, [isBroadcaster, streamData?.streamUrl, initializeCamera]);

  // Cleanup effect - stop stream when component unmounts
  useEffect(() => {
    // Capture video ref at effect time (it doesn't change after mount)
    const currentVideo = videoRef.current;

    return () => {
      // Stop all media tracks when component unmounts
      // streamRef.current must be accessed directly since it's set asynchronously
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
        streamRef.current = null;
      }
      // Clear video element
      if (currentVideo) {
        currentVideo.srcObject = null;
        currentVideo.src = '';
      }
      // Close all WebRTC connections
      // eslint-disable-next-line react-hooks/exhaustive-deps
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, []);

  // ==================== WebRTC Broadcasting Logic ====================
  
  // Create peer connection for a viewer
  const createPeerConnectionForViewer = useCallback(async (viewerSocketId) => {
    if (!streamRef.current) {
      console.error('[WebRTC] No local stream available');
      return;
    }

    console.log('[WebRTC] Creating peer connection for viewer:', viewerSocketId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks to the connection
    streamRef.current.getTracks().forEach(track => {
      console.log('[WebRTC] Adding track to peer connection:', track.kind);
      pc.addTrack(track, streamRef.current);
    });

    // Handle ICE candidates - send to viewer
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[WebRTC] Sending ICE candidate to viewer');
        socket.emit('webrtc:ice-candidate', {
          roomId: streamData?.id || streamData?._id,
          candidate: event.candidate,
          targetId: viewerSocketId
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        peerConnectionsRef.current.delete(viewerSocketId);
      }
    };

    // Store peer connection
    peerConnectionsRef.current.set(viewerSocketId, pc);

    try {
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc:offer', {
        roomId: streamData?.id || streamData?._id,
        offer: pc.localDescription,
        targetId: viewerSocketId
      });

      console.log('[WebRTC] Sent offer to viewer:', viewerSocketId);
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
      peerConnectionsRef.current.delete(viewerSocketId);
    }
  }, [socket, streamData]);

  // Handle answer from viewer
  const handleWebRTCAnswer = useCallback(async (viewerSocketId, answer) => {
    const pc = peerConnectionsRef.current.get(viewerSocketId);
    if (!pc) {
      console.error('[WebRTC] No peer connection for viewer:', viewerSocketId);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[WebRTC] Set remote description for viewer:', viewerSocketId);
    } catch (error) {
      console.error('[WebRTC] Error setting remote description:', error);
    }
  }, []);

  // Handle ICE candidate from viewer
  const handleWebRTCIceCandidate = useCallback(async (viewerSocketId, candidate) => {
    const pc = peerConnectionsRef.current.get(viewerSocketId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[WebRTC] Added ICE candidate from viewer');
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error);
    }
  }, []);

  // Join room as host and set up WebRTC event listeners
  useEffect(() => {
    if (!socket || !isBroadcaster || !isConnected) return;
    
    const roomId = streamData?.id || streamData?._id;
    if (!roomId) return;

    console.log('[WebRTC] Joining room as host:', roomId);
    
    // Join the room as host
    socket.emit('live:join', { roomId, role: 'host' });

    // Handle new viewer requesting to connect
    const handleViewerRequest = ({ viewerId, viewerSocketId }) => {
      console.log('[WebRTC] Viewer requesting connection:', viewerId);
      // Wait a bit for stream to be ready
      setTimeout(() => {
        if (streamRef.current) {
          createPeerConnectionForViewer(viewerSocketId);
        }
      }, 500);
    };

    // Handle answer from viewer
    const handleAnswer = ({ answer, fromId }) => {
      handleWebRTCAnswer(fromId, answer);
    };

    // Handle ICE candidate from viewer
    const handleIceCandidate = ({ candidate, fromId }) => {
      handleWebRTCIceCandidate(fromId, candidate);
    };

    // Handle viewer count updates
    const handleViewerCount = ({ count }) => {
      setViewerCount(count);
    };

    // Handle viewer leaving
    const handleViewerLeft = ({ viewerId, viewerSocketId }) => {
      const pc = peerConnectionsRef.current.get(viewerSocketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(viewerSocketId);
      }
    };

    socket.on('live:viewer-request', handleViewerRequest);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('live:viewer-count', handleViewerCount);
    socket.on('live:viewer-left', handleViewerLeft);

    return () => {
      socket.off('live:viewer-request', handleViewerRequest);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('live:viewer-count', handleViewerCount);
      socket.off('live:viewer-left', handleViewerLeft);
      
      // Leave room when component unmounts
      socket.emit('live:leave', { roomId });
    };
  }, [socket, isBroadcaster, isConnected, streamData, createPeerConnectionForViewer, handleWebRTCAnswer, handleWebRTCIceCandidate]);

  // Viewer WebRTC: join as viewer and handle offer/ICE from host
  useEffect(() => {
    if (!socket || isBroadcaster || !streamData) return;

    const canonicalRoomId = streamData?.id || streamData?._id || streamData?.roomId;
    if (!canonicalRoomId) return;

    // Create peer connection for viewer
    const pc = new RTCPeerConnection(ICE_SERVERS);
    viewerPeerRef.current = pc;

    // Handle incoming tracks
    pc.ontrack = (event) => {
      if (videoRef.current && event.streams && event.streams[0]) {
        console.log('[Viewer] Received remote stream from host');
        videoRef.current.srcObject = event.streams[0];
        setIsVideoLoaded(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          roomId: canonicalRoomId,
          candidate: event.candidate,
          targetId: hostSocketIdRef.current || null
        });
      }
    };

    const handleJoined = (data) => {
      console.log('[Viewer] live:joined', data);
      hostSocketIdRef.current = data.hostSocketId || hostSocketIdRef.current;
    };

    const handleOffer = async ({ offer, fromId }) => {
      try {
        console.log('[Viewer] Received offer from host', fromId);
        if (!viewerPeerRef.current) return;
        await viewerPeerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await viewerPeerRef.current.createAnswer();
        await viewerPeerRef.current.setLocalDescription(answer);
        socket.emit('webrtc:answer', {
          roomId: canonicalRoomId,
          answer: viewerPeerRef.current.localDescription,
          targetId: fromId
        });
        console.log('[Viewer] Sent answer to host');
      } catch (err) {
        console.error('[Viewer] Error handling offer:', err);
      }
    };

    const handleIce = async ({ candidate }) => {
      try {
        if (!viewerPeerRef.current) return;
        await viewerPeerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[Viewer] Error adding ICE candidate:', err);
      }
    };

    socket.on('live:joined', handleJoined);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:ice-candidate', handleIce);

    // Join the room as viewer
    socket.emit('live:join', { roomId: canonicalRoomId, role: 'viewer' });
    console.log('[Viewer] Joining live room:', canonicalRoomId);

    return () => {
      socket.off('live:joined', handleJoined);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:ice-candidate', handleIce);
      if (viewerPeerRef.current) {
        viewerPeerRef.current.close();
        viewerPeerRef.current = null;
      }
      if (socket) {
        socket.emit('live:leave', { roomId: canonicalRoomId });
      }
    };
  }, [socket, isBroadcaster, streamData]);

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      username: user?.username || 'viewer',
      text: newComment,
      timestamp: new Date(),
    };

    setComments(prev => [...prev.slice(-49), comment]);
    setNewComment('');
    inputRef.current?.focus();
  };

  const handleSendGift = (gift) => {
    setTotalGifts(prev => prev + gift.price);
    setGifts(prev => [...prev, {
      id: Date.now(),
      gift: gift,
      username: user?.username || 'viewer',
    }]);
    setShowGifts(false);
  };

  const handleEndStream = async () => {
    // Open in-app confirmation modal instead of using browser confirm
    setShowEndConfirm(true);
  };

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const confirmEndStream = async () => {
    setShowEndConfirm(false);
    try {
      // Stop the camera/media tracks first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Call backend API to end the stream
      const streamId = streamData?.id || streamData?._id;
      if (streamId) {
        const API_URL = window.APP_CONFIG?.API_URL || 'https://spryclips.com';
        const response = await fetch(`${API_URL}/api/live/${streamId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Use cookies for authentication
        });

        const data = await response.json();
        if (!response.ok) {
          console.error('Failed to end stream on server:', data.message);
        } else {
          console.log('Stream ended successfully on server');
        }
      }

      // Call the onEnd callback to update parent state
      if (onEnd) {
        onEnd();
      }
    } catch (error) {
      console.error('Error ending stream:', error);
      if (onEnd) {
        onEnd();
      }
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const isCurrentlyOn = videoTracks[0].enabled;
        videoTracks.forEach(track => {
          track.enabled = !isCurrentlyOn;
        });
        setIsCameraOn(!isCurrentlyOn);
      }
    }
  };

  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const isCurrentlyMuted = !audioTracks[0].enabled;
        audioTracks.forEach(track => {
          track.enabled = isCurrentlyMuted;
        });
        setIsMicMuted(!isCurrentlyMuted);
      }
    }
  };

  // Generate share URL using unique roomId
  const getShareUrl = useCallback(() => {
    // Use roomId for shareable links - this is unique per stream
    const roomId = streamData?.roomId;
    if (roomId) {
      return `${window.location.origin}/live/watch/${roomId}`;
    }
    // Fallback to stream ID if roomId not available
    const streamId = streamData?.id || streamData?._id;
    if (streamId) {
      return `${window.location.origin}/live/watch/${streamId}`;
    }
    return `${window.location.origin}/live`;
  }, [streamData]);

  // Share handlers
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareTwitter = () => {
    const url = getShareUrl();
    const text = `Watch this live stream: ${streamData?.title || 'Live Stream'}`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareFacebook = () => {
    const url = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    const text = `Watch this live stream: ${streamData?.title || 'Live Stream'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: streamData?.title || 'Live Stream',
          text: `Watch this live stream by @${streamData?.username || streamData?.hostUsername || user?.username || 'host'}`,
          url: getShareUrl(),
        });
        setShowShareMenu(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  return (
    <div className="live-stream-player" onClick={() => {}}>
      {/* Main Video Area */}
      <div className="stream-main">
        <div className={`stream-video-container ${isVideoLoaded ? 'video-loaded' : ''}`} onClick={(e) => e.stopPropagation()}>
          {/* Host confirm modal for ending stream */}
          {showEndConfirm && isBroadcaster && (
            <div className="end-stream-confirm" role="dialog" aria-modal="true">
              <div className="end-stream-confirm-card">
                <h4>End Stream</h4>
                <p>Are you sure you want to end the stream?</p>
                <div className="end-stream-actions">
                  <button className="end-confirm-btn cancel" onClick={() => setShowEndConfirm(false)}>Cancel</button>
                  <button className="end-confirm-btn confirm" onClick={confirmEndStream}>End Stream</button>
                </div>
              </div>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isBroadcaster}
            className="stream-video"
            onClick={(e) => e.stopPropagation()}
            onLoadedMetadata={() => setIsVideoLoaded(true)}
          />
          
          {/* Camera Error State */}
          {cameraError && isBroadcaster && (
            <div className="camera-error-overlay">
              <i className="fa-solid fa-video-slash"></i>
              <h4>Camera Error</h4>
              <p>{cameraError}</p>
              <button className="retry-camera-btn" onClick={initializeCamera}>
                <i className="fa-solid fa-refresh"></i>
                Retry Camera Access
              </button>
            </div>
          )}

          {/* Loading State */}
          {!isVideoLoaded && !cameraError && isBroadcaster && (
            <div className="camera-loading-overlay">
              <div className="camera-loading-spinner"></div>
              <p>Initializing camera...</p>
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
                {viewerCount > 0 ? (viewerCount >= 1000 ? `${(viewerCount / 1000).toFixed(1)}K` : viewerCount) : '0'} watching
              </div>
              <div className="gift-total">
                <i className="fa-solid fa-gift"></i>
                {totalGifts} coins
              </div>
              {isBroadcaster && (
                <div className="stream-duration">
                  <i className="fa-solid fa-clock"></i>
                  {formatTime(streamDuration)}
                </div>
              )}
              
              {/* Share Button */}
              <div className="share-button-container">
                <button
                  className="share-stream-btn"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Share Stream"
                >
                  <i className="fa-solid fa-share-nodes"></i>
                  Share
                </button>

                {/* Share Menu Popup */}
                {showShareMenu && (
                  <div className="share-menu-popup">
                    <div className="share-menu-header">
                      <h4>Share Stream</h4>
                      <button className="close-share-btn" onClick={() => setShowShareMenu(false)}>
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                    
                    <div className="share-link-section">
                      <input
                        type="text"
                        value={getShareUrl()}
                        readOnly
                        className="share-link-input"
                      />
                      <button className={`copy-link-btn ${copySuccess ? 'copied' : ''}`} onClick={handleCopyLink}>
                        <i className={`fa-solid ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i>
                        {copySuccess ? 'Copied!' : 'Copy'}
                      </button>
                    </div>

                    <div className="share-options">
                      {navigator.share && (
                        <button className="share-option-btn native-share" onClick={handleNativeShare}>
                          <i className="fa-solid fa-share-from-square"></i>
                          <span>Share</span>
                        </button>
                      )}
                      <button className="share-option-btn twitter" onClick={handleShareTwitter}>
                        <i className="fa-brands fa-twitter"></i>
                        <span>Twitter</span>
                      </button>
                      <button className="share-option-btn facebook" onClick={handleShareFacebook}>
                        <i className="fa-brands fa-facebook-f"></i>
                        <span>Facebook</span>
                      </button>
                      <button className="share-option-btn whatsapp" onClick={handleShareWhatsApp}>
                        <i className="fa-brands fa-whatsapp"></i>
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stream Title - Floating Bottom Bar */}
            <div className="stream-title-container">
              <div className="stream-title-bar">
                <span className="online-status-dot"></span>
                <div className="stream-title-content">
                  <h3>{streamData?.title || 'Live Stream'}</h3>
                  <p className="host-info">
                    <span className="host-label">Host:</span>
                    <span className="host-username">@{streamData?.username || streamData?.hostUsername || user?.username || 'host'}</span>
                    {(streamData?.hostId || streamData?.userId || user?._id) && (
                      <span className="host-id">#{(streamData?.hostId || streamData?.userId || user?._id || '').slice(-6)}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Broadcaster Controls */}
            {isBroadcaster && (
              <div className="broadcaster-controls">
                <button
                  className={`control-btn ${isCameraOn ? 'active' : 'inactive'}`}
                  onClick={toggleCamera}
                  title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
                  {isCameraOn ? 'Camera On' : 'Camera Off'}
                </button>
                <button
                  className={`control-btn ${!isMicMuted ? 'active' : 'inactive'}`}
                  onClick={toggleMicrophone}
                  title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  <i className={`fa-solid ${isMicMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                  {isMicMuted ? 'Muted' : 'Mic On'}
                </button>
                <button
                  className="control-btn end-stream-btn"
                  onClick={handleEndStream}
                  title="End Stream"
                >
                  <i className="fa-solid fa-stop"></i>
                  End
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Comments Sidebar */}
        <div className="comments-sidebar" onClick={(e) => e.stopPropagation()}>
          <div className="comments-header">
            <h4>Live Comments</h4>
            <span className="comment-count">{comments.length}</span>
          </div>

          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="live-comment-item">
                {comment.gift && (
                  <span className="gift-emoji-large">{comment.gift.emoji}</span>
                )}
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
            <button
              type="button"
              className="gift-btn"
              onClick={() => setShowGifts(!showGifts)}
              title="Send Gift"
            >
              <i className="fa-solid fa-gift"></i>
            </button>
          </form>

          {/* Gifts Panel */}
          {showGifts && (
            <div className="gifts-panel">
              <h4>Send Gift</h4>
              <div className="gifts-grid">
                {giftOptions.map(gift => (
                  <button
                    key={gift.id}
                    className="gift-option"
                    onClick={() => handleSendGift(gift)}
                  >
                    <span className="gift-emoji">{gift.emoji}</span>
                    <span className="gift-name">{gift.name}</span>
                    <span className="gift-price">{gift.price} coins</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Gifts Animation */}
      <div className="gifts-animation-container">
        {gifts.slice(-5).map(gift => (
          <div key={gift.id} className="gift-animation">
            <span className="gift-animation-emoji">{gift.gift.emoji}</span>
            <span className="gift-animation-username">@{gift.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveStreamPlayer;
