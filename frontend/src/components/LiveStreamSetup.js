import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './LiveStreamSetup.css';

const LiveStreamSetup = ({ onClose, onStartLive }) => {
  const { user } = useAuth();
  const thumbnailInputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const isGoingLiveRef = useRef(false); // Use ref to track if we're going live

  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('entertainment');
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [streamPreview, setStreamPreview] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [cameraError, setCameraError] = useState(null);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 1280, min: 640 }, 
          height: { ideal: 720, min: 480 } 
        },
        audio: true
      });
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        // Ensure video plays
        await videoPreviewRef.current.play().catch(e => {
          console.log('Autoplay prevented, user interaction needed:', e);
        });
        setStreamPreview(stream);
        setIsCameraOn(true);
        setIsMicMuted(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps using the camera.';
      }
      
      setCameraError(errorMessage);
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
      const API_URL = window.APP_CONFIG?.API_URL || 'https://spryclips.com';
      
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
          <div className="setup-main">
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
              
              {/* Camera Loading State */}
              {isLoadingCamera && (
                <div className="preview-loading">
                  <div className="preview-loading-spinner"></div>
                  <p>Accessing camera...</p>
                </div>
              )}
              
              {/* Camera Error State */}
              {cameraError && !isLoadingCamera && (
                <div className="preview-error">
                  <i className="fa-solid fa-video-slash"></i>
                  <p>{cameraError}</p>
                  <button className="retry-btn" onClick={startPreview}>
                    <i className="fa-solid fa-refresh"></i>
                    Try Again
                  </button>
                </div>
              )}
              
              {/* No Camera State */}
              {!streamPreview && !isLoadingCamera && !cameraError && (
                <div className="preview-placeholder">
                  <i className="fa-solid fa-video"></i>
                  <p>Click "Start Preview" to enable camera</p>
                </div>
              )}
              
              <div className="preview-overlay">
              </div>
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

          {/* Setup Form */}
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
              <div className="category-grid">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className="category-icon">{cat.icon}</span>
                    <span className="category-label">{cat.label}</span>
                  </button>
                ))}
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
          {/* Action Buttons */}
          <div className="setup-actions">
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
      </div>
    </div>
  );
};

export default LiveStreamSetup;
