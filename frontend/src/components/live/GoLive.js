import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { startLiveStream, endLiveStream } from '../../api/live';
import './GoLive.css';

const GoLive = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stream, setStream] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('all');
  const [viewerCount, setViewerCount] = useState(0);
  const [hasGuest, setHasGuest] = useState(false);
  const [guestRequests, setGuestRequests] = useState([]);
  const [guestVideo, setGuestVideo] = useState(null);
  const [cameraPreview, setCameraPreview] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [showStartPreview, setShowStartPreview] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  
  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const guestVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map()); // Map of socketId -> RTCPeerConnection
  const roomIdRef = useRef(null);
  const hostSocketIdRef = useRef(null);

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
    if (socket && isConnected && isLive) {
      setupSocketListeners();
    }

    return () => {
      if (socket) {
        socket.off('live:joined');
        socket.off('live:error');
        socket.off('live:viewer-count');
        socket.off('guest:request-received');
        socket.off('guest:accepted-host');
        socket.off('webrtc:offer');
        socket.off('webrtc:answer');
        socket.off('webrtc:ice-candidate');
      }
      
      // Cleanup camera preview
      if (localStreamRef.current && !isLive) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [socket, isConnected, isLive]);

  const requestCameraPreview = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      localStreamRef.current = stream;
      setCameraPreview(true);
      setShowStartPreview(false);
      setCameraError(null);
      setIsLoadingCamera(false);
      
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        await previewVideoRef.current.play();
      }
      
      // Update initial states
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      setIsCameraOn(videoTracks.length > 0 && videoTracks[0].enabled);
      setIsMuted(audioTracks.length > 0 && !audioTracks[0].enabled);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera.';
      let errorType = 'unknown';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
        errorType = 'permission';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
        errorType = 'notFound';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps using the camera.';
        errorType = 'inUse';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked for security reasons. Please use HTTPS or localhost.';
        errorType = 'security';
      }
      
      setCameraError({ message: errorMessage, type: errorType });
      setShowStartPreview(true);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const handleStartPreview = () => {
    requestCameraPreview();
  };

  const setupSocketListeners = () => {
    socket.on('live:joined', (data) => {
      console.log('Host joined room:', data);
      hostSocketIdRef.current = socket.id;
    });

    socket.on('live:error', (error) => {
      console.error('Live stream error:', error);
      alert('Error: ' + error.message);
    });

    socket.on('live:viewer-count', (data) => {
      setViewerCount(data.count || 0);
    });

    socket.on('guest:request-received', (data) => {
      setGuestRequests((prev) => [...prev, data]);
    });

    socket.on('guest:accepted-host', (data) => {
      // Start WebRTC connection with guest
      setupGuestConnection(data.guestSocketId, data.guestId);
    });

    // WebRTC signaling
    socket.on('webrtc:offer', async (data) => {
      await handleWebRTCOffer(data);
    });

    socket.on('webrtc:answer', async (data) => {
      await handleWebRTCAnswer(data);
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      await handleICE(data);
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted; // Toggle the enabled state
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isCameraOn; // Toggle the enabled state
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  const startStream = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your stream');
      return;
    }

    if (!localStreamRef.current) {
      alert('Camera not ready. Please start camera preview first.');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Start live stream via API first
      const response = await startLiveStream({
        title: title.trim(),
        category,
        description: '',
        isPrivate: false
      });

      if (response.success) {
        setStream(response.stream);
        roomIdRef.current = response.stream.roomId || response.stream._id;
        
        // Move stream from preview to main video
        if (videoRef.current && localStreamRef.current) {
          videoRef.current.srcObject = localStreamRef.current;
          await videoRef.current.play();
        }
        
        // Clear preview video
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = null;
        }
        
        setIsLive(true);
        setIsConnecting(false);
        setCameraPreview(false);

        // Join room as host
        if (socket && isConnected) {
          socket.emit('live:join', {
            roomId: roomIdRef.current,
            role: 'host'
          });
        }

        // Setup WebRTC for broadcasting
        setupWebRTCBroadcast();
      } else {
        throw new Error(response.message || 'Failed to start stream');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      alert('Failed to start stream: ' + error.message);
      setIsConnecting(false);
    }
  };

  const setupWebRTCBroadcast = () => {
    console.log('Setting up WebRTC broadcast for stream:', roomIdRef.current);
    // In a production app, this would set up RTMP publishing or WebRTC broadcasting
    // For this demo, the stream is available locally via the video element
  };

  const endStream = async () => {
    if (!window.confirm('Are you sure you want to end the live stream?')) {
      return;
    }

    try {
      if (stream?._id) {
        await endLiveStream(stream._id);
      }

      // Cleanup WebRTC connections
      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();

      // Stop camera stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Clear video elements
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = null;
      }

      // Leave socket room
      if (socket) {
        socket.emit('live:leave');
      }

      // Reset state
      setIsLive(false);
      setStream(null);
      setViewerCount(0);
      setHasGuest(false);
      setGuestRequests([]);
      setGuestVideo(null);
      setCameraPreview(false);
      setShowStartPreview(true);
      roomIdRef.current = null;
      
      // Navigate back
      navigate('/live');
      
    } catch (error) {
      console.error('Error ending stream:', error);
      alert('Error ending stream: ' + error.message);
    }
  };
        await endLiveStream(stream._id);
      }

      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        pc.close();
      });
      peerConnectionsRef.current.clear();

      // Leave room
      if (socket && roomIdRef.current) {
        socket.emit('live:leave');
      }

      // Cleanup
      setIsLive(false);
      setStream(null);
      setViewerCount(0);
      setHasGuest(false);
      setGuestRequests([]);
      roomIdRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      navigate('/live');
    } catch (error) {
      console.error('Error ending stream:', error);
      alert('Failed to end stream');
    }
  };

  const setupWebRTCBroadcast = () => {
    // This sets up WebRTC to broadcast to viewers
    // In a production setup, you'd use an SFU (Selective Forwarding Unit)
    // For now, this is a basic peer-to-peer setup
  };

  const setupGuestConnection = async (guestSocketId, guestId) => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      const peerConnection = new RTCPeerConnection(configuration);

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote stream (guest video)
      peerConnection.ontrack = (event) => {
        if (guestVideoRef.current && event.streams[0]) {
          guestVideoRef.current.srcObject = event.streams[0];
          setHasGuest(true);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc:ice-candidate', {
            roomId: roomIdRef.current,
            candidate: event.candidate,
            targetId: guestSocketId
          });
        }
      };

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('webrtc:offer', {
        roomId: roomIdRef.current,
        offer: offer,
        targetId: guestSocketId
      });

      peerConnectionsRef.current.set(guestSocketId, peerConnection);
    } catch (error) {
      console.error('Error setting up guest connection:', error);
    }
  };

  const handleWebRTCOffer = async (data) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(data.fromId);
      if (!peerConnection) return;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('webrtc:answer', {
        roomId: roomIdRef.current,
        answer: answer,
        targetId: data.fromId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleWebRTCAnswer = async (data) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(data.fromId);
      if (!peerConnection) return;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleICE = async (data) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(data.fromId);
      if (!peerConnection) return;

      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const acceptGuest = (guestId) => {
    if (socket && roomIdRef.current) {
      socket.emit('guest:accept', {
        roomId: roomIdRef.current,
        guestId
      });
      setGuestRequests((prev) => prev.filter((req) => req.guestId !== guestId));
    }
  };

  const rejectGuest = (guestId) => {
    if (socket && roomIdRef.current) {
      socket.emit('guest:reject', {
        roomId: roomIdRef.current,
        guestId
      });
      setGuestRequests((prev) => prev.filter((req) => req.guestId !== guestId));
    }
  };

  if (!isLive) {
    return (
      <div className="go-live-setup-tiktok">
        {/* Header Bar */}
        <div className="go-live-header">
          <button 
            onClick={() => navigate(-1)}
            className="close-btn-header"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <h1 className="go-live-header-title">Go Live</h1>
          <div className="header-spacer"></div>
        </div>

        {/* Main Content Area */}
        <div className="go-live-content-wrapper">
          <div className="camera-preview-container">
            {cameraError ? (
              <div className="camera-error-container">
                <div className="camera-error-content">
                  <i className="fa-solid fa-camera-slash"></i>
                  <p className="camera-error-message">{cameraError.message}</p>
                  {cameraError.type === 'permission' && (
                    <div className="camera-permission-instructions">
                      <p className="instructions-title">How to enable camera access:</p>
                      <ul className="instructions-list">
                        <li><strong>Chrome/Edge:</strong> Click the lock icon in the address bar → Site Settings → Camera → Allow</li>
                        <li><strong>Firefox:</strong> Click the lock icon → Permissions → Camera → Allow</li>
                        <li><strong>Safari:</strong> Safari → Settings → Websites → Camera → Allow</li>
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={requestCameraPreview}
                    className="try-again-btn"
                    disabled={isLoadingCamera}
                  >
                    {isLoadingCamera ? (
                      <>
                        <div className="spinner-small"></div>
                        <span>Requesting...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-rotate-right"></i>
                        <span>Try Again</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : showStartPreview ? (
              <div className="start-preview-placeholder">
                <div className="preview-placeholder-content">
                  <i className="fa-solid fa-camera"></i>
                  <p>Click "Start Preview" to begin</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-preview"
                />
                {!cameraPreview && (
                  <div className="camera-loading">
                    <div className="spinner-large"></div>
                    <p>Loading camera...</p>
                  </div>
                )}
                
                {/* Camera Controls Overlay */}
                {cameraPreview && (
                  <div className="camera-controls-overlay">
                    <button
                      onClick={toggleCamera}
                      className={`control-btn ${!isCameraOn ? 'disabled' : ''}`}
                      title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                    >
                      <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
                    </button>
                    <button
                      onClick={toggleMute}
                      className={`control-btn ${isMuted ? 'disabled' : ''}`}
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Only show Start Preview button when there's no error and preview hasn't started */}
          {showStartPreview && !cameraError && !isLoadingCamera ? (
            <div className="start-preview-container">
              <button
                onClick={handleStartPreview}
                className="start-preview-btn"
              >
                <i className="fa-solid fa-play"></i>
                <span>Start Preview</span>
              </button>
            </div>
          ) : !cameraError ? (
            <div className="go-live-form-container">
              <div className="title-input-container">
                <label htmlFor="stream-title" className="form-label">Stream Title *</label>
                <input
                  id="stream-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add a title..."
                  maxLength={200}
                  className="title-input-tiktok"
                />
                <span className="char-count">{title.length}/200</span>
              </div>

              <div className="category-selector">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="category-select-tiktok"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={startStream}
                disabled={isConnecting || !title.trim() || !cameraPreview}
                className="go-live-btn-tiktok"
              >
                {isConnecting ? (
                  <>
                    <div className="spinner-btn"></div>
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-circle"></i>
                    <span>Go Live</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="go-live-container">
      <div className="go-live-main">
        <div className="go-live-video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="go-live-video"
          />
          {hasGuest && (
            <div className="guest-video-container">
              <video
                ref={guestVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="guest-video"
              />
            </div>
          )}
          
          <div className="go-live-controls">
            <div className="live-info">
              <div className="live-badge-large">
                <span className="live-dot"></span>
                LIVE
              </div>
              <div className="viewer-count-large">
                <i className="fa-solid fa-eye"></i>
                {viewerCount.toLocaleString()}
              </div>
            </div>
            <div className="live-control-buttons">
              <button
                onClick={toggleCamera}
                className={`control-btn-live ${!isCameraOn ? 'disabled' : ''}`}
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
              </button>
              <button
                onClick={toggleMute}
                className={`control-btn-live ${isMuted ? 'disabled' : ''}`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
              </button>
              <button onClick={endStream} className="end-stream-btn-tiktok">
                <i className="fa-solid fa-stop"></i>
                End
              </button>
            </div>
          </div>
        </div>

        <div className="go-live-sidebar">
          <div className="guest-requests-container">
            <h3>Guest Requests</h3>
            {guestRequests.length === 0 ? (
              <p className="no-requests">No pending requests</p>
            ) : (
              <div className="guest-requests-list">
                {guestRequests.map((request, idx) => (
                  <div key={idx} className="guest-request-item">
                    <img
                      src={request.guest?.profile?.profilePicture || '/default-avatar.png'}
                      alt={request.guest?.username}
                      className="guest-request-avatar"
                    />
                    <div className="guest-request-info">
                      <h4>{request.guest?.username}</h4>
                      <p>Wants to join your stream</p>
                    </div>
                    <div className="guest-request-actions">
                      <button
                        onClick={() => acceptGuest(request.guestId)}
                        className="accept-btn"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <button
                        onClick={() => rejectGuest(request.guestId)}
                        className="reject-btn"
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stream-info-panel">
            <h3>Stream Info</h3>
            <div className="info-item">
              <span className="info-label">Title:</span>
              <span className="info-value">{stream?.title}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Category:</span>
              <span className="info-value">{category}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Viewers:</span>
              <span className="info-value">{viewerCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoLive;

