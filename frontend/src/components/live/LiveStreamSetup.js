/**
 * Live Stream Setup Component
 * 
 * Recent Changes:
 * - Added camera preview functionality
 * - Implemented stream title and category selection
 * - Added thumbnail upload support
 * - Enhanced camera/microphone controls in preview
 * - Improved error handling for camera access
 * - Added stream creation API integration with roomId generation
 */

import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LiveStreamSetup.css';

const LiveStreamSetup = ({ onClose, onStartLive }) => {
  const { user } = useAuth();
  const thumbnailInputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const isGoingLiveRef = useRef(false); // Use ref to track if we're going live

  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('entertainment');
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [streamPreview, setStreamPreview] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraErrorType, setCameraErrorType] = useState(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  const categories = [
    { id: 'entertainment', label: 'Entertainment', icon: '🎭' },
    { id: 'gaming', label: 'Gaming', icon: '🎮' },
    { id: 'dance', label: 'Dance', icon: '💃' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'food', label: 'Food', icon: '🍕' },
    { id: 'comedy', label: 'Comedy', icon: '😂' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'education', label: 'Education', icon: '📚' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '✨' },
    { id: 'travel', label: 'Travel', icon: '✈️' },
  ];

  const selectedCat = categories.find((c) => c.id === selectedCategory) || categories[0];

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startPreview = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    setCameraErrorType(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      // Optional: probe permissions API (best-effort)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const cameraPermission = await navigator.permissions.query({ name: 'camera' });
          console.log('Camera permission state:', cameraPermission.state);
          if (cameraPermission.state === 'denied') {
            setCameraError('Camera permission is denied. If you recently changed permissions, click "Start Preview" again.');
            setCameraErrorType('permission');
          }
        } catch (permErr) {
          console.log('Permissions API camera query not available:', permErr?.message || permErr);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      if (!videoPreviewRef.current) {
        // Stop stream to avoid leaks
        stream.getTracks().forEach(t => t.stop());
        throw new Error('Video preview element not available. Please refresh the page.');
      }

      videoPreviewRef.current.srcObject = stream;
      try {
        await videoPreviewRef.current.play();
        setStreamPreview(stream);
        setIsCameraOn(true);
        setIsMicMuted(false);
        setCameraError(null);
        setCameraErrorType(null);
        console.log('✅ Camera preview started successfully');
      } catch (playErr) {
        console.error('Error playing preview:', playErr);
        // Attempt to classify the error
        if (playErr && (playErr.name === 'NotAllowedError' || playErr.name === 'SecurityError')) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideoInput = devices && devices.some(d => d.kind === 'videoinput');
            if (!hasVideoInput) {
              setCameraError('No camera devices detected. Please connect a camera or check drivers and device permissions.');
              setCameraErrorType('no-device');
            } else {
              setCameraError('Camera permission denied by the system. Check OS privacy settings, close other apps using the camera, or disable security software that blocks camera access. Try Start Preview again or open the page in an incognito window or another browser.');
              setCameraErrorType('system');
            }
          } catch (enumErr) {
            console.warn('enumerateDevices failed:', enumErr);
            setCameraError('Camera permission denied by the system. Check OS privacy settings and try again.');
            setCameraErrorType('system');
          }
        } else if (playErr && playErr.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera and check device drivers.');
          setCameraErrorType('no-device');
        } else if (playErr && playErr.name === 'NotReadableError') {
          setCameraError('Camera device is in use by another application. Close other apps (Zoom, Teams) and try again.');
          setCameraErrorType('in-use');
        } else {
          setCameraError(`Error accessing camera: ${playErr?.message || playErr?.name || 'unknown error'}`);
          setCameraErrorType('unknown');
        }
        // If playback failed, stop the stream to avoid leaks unless we expect user to fix permissions and retry
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera.';
      let errorType = 'unknown';

      if (error && (error.name === 'NotAllowedError' || error.name === 'SecurityError' || (error.message || '').toLowerCase().includes('permission') || (error.message || '').toLowerCase().includes('denied'))) {
        // Check if any video input exists to distinguish system block from no-device
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices && devices.some(d => d.kind === 'videoinput');
          if (!hasVideoInput) {
            errorMessage = 'No camera found. Please connect a camera and try again.';
            errorType = 'notFound';
          } else {
            errorMessage = 'Camera permission denied. Please check your browser and OS camera settings and try again.';
            errorType = 'permission';
          }
        } catch (enumErr) {
          errorMessage = 'Camera permission denied. Please check your browser and OS camera settings and try again.';
          errorType = 'permission';
        }
      } else if (error && (error.name === 'NotFoundError' || (error.message || '').toLowerCase().includes('no camera') || (error.message || '').toLowerCase().includes('not found') || (error.message || '').toLowerCase().includes('no device'))) {
        errorMessage = 'No camera found. Please connect a camera and try again.';
        errorType = 'notFound';
      } else if (error && (error.name === 'NotReadableError' || (error.message || '').toLowerCase().includes('in use') || (error.message || '').toLowerCase().includes('busy') || (error.message || '').toLowerCase().includes('could not start'))) {
        errorMessage = 'Camera is being used by another application. Please close other apps using the camera.';
        errorType = 'inUse';
      } else if (error && (error.name === 'SecurityError' || (error.message || '').toLowerCase().includes('https') || (error.message || '').toLowerCase().includes('secure') || (error.message || '').toLowerCase().includes('ssl'))) {
        errorMessage = 'Camera access requires a secure connection (HTTPS) or localhost.';
        errorType = 'security';
      } else if (error && error.message) {
        errorMessage = error.message;
      }

      setCameraError(errorMessage);
      setCameraErrorType(errorType);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const stopPreview = useCallback(() => {
    if (streamPreview) {
      streamPreview.getTracks().forEach(track => track.stop());
      setStreamPreview(null);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      setIsCameraOn(false);
      setIsMicMuted(false);
    }
  }, [streamPreview]);

  const handleClose = useCallback(() => {
    // Stop the stream when closing (not going live)
    if (streamPreview) {
      streamPreview.getTracks().forEach(track => track.stop());
    }
    onClose();
  }, [streamPreview, onClose]);

  const toggleCamera = () => {
    if (streamPreview) {
      const videoTracks = streamPreview.getVideoTracks();
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
    if (streamPreview) {
      const audioTracks = streamPreview.getAudioTracks();
      if (audioTracks.length > 0) {
        const isCurrentlyMuted = !audioTracks[0].enabled;
        audioTracks.forEach(track => {
          track.enabled = isCurrentlyMuted;
        });
        setIsMicMuted(!isCurrentlyMuted);
      }
    }
  };

  const handleStartLive = async () => {
    if (!streamTitle.trim()) {
      alert('Please enter a stream title!');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      alert('Please sign in to start a live stream');
      return;
    }

    setIsStarting(true);
    try {
      // Call backend API to create stream and get unique roomId
      const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/live/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use cookies for authentication
        body: JSON.stringify({
          title: streamTitle,
          category: selectedCategory,
          description: '',
          isPrivate: false
        })
      });

      const data = await response.json();

      // Handle authentication errors specifically
      if (response.status === 401 || response.status === 403) {
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create stream');
      }

      if (onStartLive) {
        isGoingLiveRef.current = true; // Mark that we're going live - don't stop the stream
        onStartLive({
          id: data.stream._id,
          roomId: data.roomId, // Unique shareable ID
          streamKey: data.streamKey,
          title: streamTitle,
          category: selectedCategory,
          thumbnail: thumbnailPreview,
          stream: streamPreview, // Pass the actual stream to the player
          hostId: user?._id,
          hostUsername: user?.username,
          streamUrl: data.stream.streamUrl,
          rtmpUrl: data.rtmpUrl
        });
      }
    } catch (error) {
      console.error('Error starting live stream:', error);
      alert(error.message || 'Failed to start live stream. Please try again.');
      setIsStarting(false);
    }
  };

  React.useEffect(() => {
    // Camera will start when user clicks "Start Preview" button
    return () => {
      // Only stop the stream if we're NOT going live
      // If we're going live, the LiveStreamPlayer will use this stream
      if (!isGoingLiveRef.current && streamPreview) {
        streamPreview.getTracks().forEach(track => track.stop());
      }
    };
  }, [streamPreview]);

  const copyCameraInstructions = async () => {
    const text = `How to enable camera access:\n\nChrome/Edge: Click the lock icon in the address bar → Site Settings → Camera → Allow\nFirefox: Click the lock icon → Permissions → Camera → Allow\nSafari: Safari → Settings → Websites → Camera → Allow for this site\nMobile: Go to browser settings → Site Permissions → Camera → Allow`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Camera instructions copied to clipboard');
    } catch (err) {
      console.warn('Clipboard write failed', err);
      // fallback: show prompt with text
      prompt('Copy these instructions:', text);
    }
  };

  return (
    <div className="live-stream-setup-overlay" onClick={handleClose}>
      <div className="live-stream-setup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="setup-header">
          <button className="setup-close-btn" onClick={handleClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Go Live</h2>
          <div className="setup-header-placeholder"></div>
        </div>

        <div className="setup-content">
          <div className="left-column">
            {/* Preview Section */}
            <div className="preview-section">
              <div className={`video-preview-container ${streamPreview ? 'has-stream' : ''}`}>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="preview-video"
                />

                {isLoadingCamera && (
                  <div className="preview-loading">
                    <div className="preview-loading-spinner"></div>
                    <p>Accessing camera...</p>
                  </div>
                )}

                {cameraError && !isLoadingCamera && (
                  <div className="preview-error">
                      <i className="fa-solid fa-video-slash"></i>
                      {typeof cameraError === 'string' ? (
                        <p className="error-message">{cameraError}</p>
                      ) : (
                        cameraError?.message && <p className="error-message">{cameraError.message}</p>
                      )}
                    
                    {cameraErrorType === 'permission' && (
                      <div className="permission-instructions">
                        <p className="instructions-title">How to enable camera access:</p>
                        <ul className="instructions-list">
                          <li>
                            <strong>Chrome/Edge:</strong> Click the <i className="fa-solid fa-lock"></i> lock icon in the address bar → 
                            Site Settings → Camera → Allow
                          </li>
                          <li>
                            <strong>Firefox:</strong> Click the <i className="fa-solid fa-lock"></i> lock icon → 
                            Permissions → Camera → Allow
                          </li>
                          <li>
                            <strong>Safari:</strong> Safari → Settings → Websites → Camera → Allow for this site
                          </li>
                          <li>
                            <strong>Mobile:</strong> Go to browser settings → Site Permissions → Camera → Allow
                          </li>
                        </ul>
                      </div>
                    )}
                    
                    {cameraErrorType === 'notFound' && (
                      <div className="permission-instructions">
                        <p className="instructions-title">Troubleshooting:</p>
                        <ul className="instructions-list">
                          <li>Make sure your camera is connected and turned on</li>
                          <li>Check if your camera is enabled in system settings</li>
                          <li>Try refreshing the page after connecting your camera</li>
                        </ul>
                      </div>
                    )}
                    
                    {cameraErrorType === 'inUse' && (
                      <div className="permission-instructions">
                        <p className="instructions-title">Troubleshooting:</p>
                        <ul className="instructions-list">
                          <li>Close other applications using the camera (Zoom, Teams, Skype, etc.)</li>
                          <li>Check if another browser tab is using the camera</li>
                          <li>Restart your browser if the issue persists</li>
                        </ul>
                      </div>
                    )}
                    
                    {cameraErrorType === 'security' && (
                      <div className="permission-instructions">
                        <p className="instructions-title">Troubleshooting:</p>
                        <ul className="instructions-list">
                          <li>Make sure you're using HTTPS (secure connection)</li>
                          <li>If testing locally, use <code>localhost</code> or <code>127.0.0.1</code></li>
                          <li>Some browsers require HTTPS for camera access on production sites</li>
                        </ul>
                      </div>
                    )}
                    
                    {cameraErrorType === 'browser' && (
                      <div className="permission-instructions">
                        <p className="instructions-title">Browser Support:</p>
                        <ul className="instructions-list">
                          <li>Use a modern browser: Chrome, Firefox, Edge, or Safari</li>
                          <li>Make sure your browser is up to date</li>
                          <li>Try clearing browser cache and cookies</li>
                        </ul>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button className="retry-btn" onClick={startPreview}>
                        <i className="fa-solid fa-refresh"></i>
                        Try Again
                      </button>
                      <button className="copy-instructions-btn" onClick={copyCameraInstructions}>
                        Copy Instructions
                      </button>
                    </div>
                  </div>
                )}

                {!streamPreview && !isLoadingCamera && !cameraError && (
                  <div className="preview-placeholder">
                    <i className="fa-solid fa-video"></i>
                    <p>Click "Start Preview" to enable camera</p>
                  </div>
                )}

                <div className="preview-overlay" />

                {streamPreview && (
                  <div className="preview-controls">
                    <button
                      className={`preview-control-btn ${isCameraOn ? 'active' : 'inactive'}`}
                      onClick={toggleCamera}
                      title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                    >
                      <i className={`fa-solid ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`}></i>
                    </button>
                    <button
                      className={`preview-control-btn ${!isMicMuted ? 'active' : 'inactive'}`}
                      onClick={toggleMicrophone}
                      title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                      <i className={`fa-solid ${isMicMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
                    </button>
                  </div>
                )}
              </div>

              {!streamPreview ? (
                <button
                  className="start-preview-btn"
                  onClick={startPreview}
                  disabled={isLoadingCamera}
                >
                  {isLoadingCamera ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Accessing Camera...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-video"></i>
                      Start Preview
                    </>
                  )}
                </button>
              ) : (
                <button className="stop-preview-btn" onClick={stopPreview}>
                  <i className="fa-solid fa-stop"></i>
                  Stop Preview & Close Camera
                </button>
              )}
            </div>

            {/* Action Buttons placed directly under preview */}
            <div className="setup-actions left-column-inline">
              <button className="cancel-btn" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="go-live-btn"
                onClick={handleStartLive}
                disabled={!streamTitle.trim() || isStarting || !streamPreview}
              >
                {isStarting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Starting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-video"></i>
                    Go Live
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Setup Form */}
          <div className="right-column">
            <div className="setup-form">
              <div className="form-group">
                <label>Stream Title *</label>
                <input
                  type="text"
                  placeholder="What's your stream about?"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  maxLength={100}
                  className="title-input"
                />
                <span className="char-count">{streamTitle.length}/100</span>
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="category-select-wrapper">
                  <div
                    className="category-dropdown"
                    tabIndex={0}
                    role="button"
                    aria-haspopup="listbox"
                    aria-expanded={isCatOpen}
                    onClick={() => setIsCatOpen(!isCatOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsCatOpen(!isCatOpen);
                      } else if (e.key === 'Escape') {
                        setIsCatOpen(false);
                      }
                    }}
                  >
                    <div className="category-display">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="category-icon-preview">{selectedCat.icon}</span>
                        <span className="category-label-preview">{selectedCat.label}</span>
                      </div>
                      <i className={`fa-solid fa-chevron-${isCatOpen ? 'up' : 'down'}`} style={{ color: '#6B7280' }}></i>
                    </div>

                    {isCatOpen && (
                      <div className="category-options" role="listbox">
                        {categories.map((cat) => (
                          <div
                            key={cat.id}
                            role="option"
                            tabIndex={0}
                            className={`category-option ${cat.id === selectedCategory ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setIsCatOpen(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedCategory(cat.id);
                                setIsCatOpen(false);
                              }
                            }}
                          >
                            <span className="category-icon">{cat.icon}</span>
                            <span className="category-label">{cat.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Thumbnail (Optional)</label>
                <div className="thumbnail-section">
                  {thumbnailPreview ? (
                    <div className="thumbnail-preview-container">
                      <img src={thumbnailPreview} alt="Thumbnail" className="thumbnail-preview" />
                      {thumbnail && (
                        <div className="thumbnail-meta">
                          <span className="thumbnail-name">{thumbnail.name}</span>
                          <span className="thumbnail-size">
                            {(thumbnail.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      )}
                      <button
                        className="remove-thumbnail-btn"
                        onClick={() => {
                          setThumbnail(null);
                          setThumbnailPreview(null);
                        }}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  ) : (
                    <button
                      className="upload-thumbnail-btn"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      <i className="fa-solid fa-image"></i>
                      <span>Upload Thumbnail</span>
                    </button>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* left-column-actions removed; actions are rendered inline below preview */}
      </div>
    </div>
  );
};

export default LiveStreamSetup;
