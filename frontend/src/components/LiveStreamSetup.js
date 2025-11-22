import React, { useState, useRef, useCallback } from 'react';
import './LiveStreamSetup.css';

const LiveStreamSetup = ({ onClose, onStartLive }) => {
  const thumbnailInputRef = useRef(null);
  const videoPreviewRef = useRef(null);

  const [streamTitle, setStreamTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('entertainment');
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [streamPreview, setStreamPreview] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        setStreamPreview(stream);
        setIsCameraOn(true);
        setIsMicMuted(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
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

    setIsStarting(true);
    try {
      // Here you would connect to your streaming server (WebRTC, RTMP, etc.)
      // For now, we'll simulate the connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onStartLive) {
        onStartLive({
          title: streamTitle,
          category: selectedCategory,
          thumbnail: thumbnailPreview,
          stream: streamPreview // In production, this would be the actual stream
        });
      }
    } catch (error) {
      console.error('Error starting live stream:', error);
      alert('Failed to start live stream. Please try again.');
      setIsStarting(false);
    }
  };

  React.useEffect(() => {
    // Camera will start when user clicks "Start Preview" button
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  return (
    <div className="live-stream-setup-overlay" onClick={onClose}>
      <div className="live-stream-setup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="setup-header">
          <button className="setup-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Go Live</h2>
          <div className="setup-header-placeholder"></div>
        </div>

        <div className="setup-content">
          {/* Preview Section */}
          <div className="preview-section">
            <div className="video-preview-container">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="preview-video"
              />
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
              <button className="start-preview-btn" onClick={startPreview}>
                <i className="fa-solid fa-play"></i>
                Start Preview
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

          {/* Action Buttons */}
          <div className="setup-actions">
            <button className="cancel-btn" onClick={onClose}>
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
