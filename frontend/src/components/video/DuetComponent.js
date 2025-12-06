import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './DuetComponent.css';

const DuetComponent = ({ video, onClose, onComplete }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const recordedVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [layout, setLayout] = useState('side-by-side'); // 'side-by-side', 'top-bottom'
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const originalVideoUrl = video?.url || video?.src || '';
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (videoRef.current && originalVideoUrl) {
      videoRef.current.src = originalVideoUrl;
      videoRef.current.load();
    }
  }, [originalVideoUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      });

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start duration timer
      const startTime = Date.now();
      const interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      mediaRecorder.onstop = () => {
        clearInterval(interval);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const handleCreateDuet = async () => {
    if (!recordedVideo) {
      alert('Please record your video first!');
      return;
    }

    setIsProcessing(true);
    try {
      // Here you would upload both videos and merge them on the backend
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (onComplete) {
        onComplete({
          originalVideo: video,
          duetVideo: recordedVideo,
          layout: layout,
          userId: user?.id
        });
      }

      onClose();
    } catch (error) {
      console.error('Error creating duet:', error);
      alert('Failed to create duet. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="duet-overlay" onClick={onClose}>
      <div className="duet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="duet-header">
          <button className="duet-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Create Duet</h2>
          <div className="duet-header-placeholder"></div>
        </div>

        <div className="duet-content">
          {/* Layout Options */}
          <div className="duet-layout-section">
            <h3>Choose Layout</h3>
            <div className="layout-options">
              <button
                className={`layout-option ${layout === 'side-by-side' ? 'active' : ''}`}
                onClick={() => setLayout('side-by-side')}
              >
                <i className="fa-solid fa-grip-lines-vertical"></i>
                <span>Side by Side</span>
              </button>
              <button
                className={`layout-option ${layout === 'top-bottom' ? 'active' : ''}`}
                onClick={() => setLayout('top-bottom')}
              >
                <i className="fa-solid fa-grip-lines"></i>
                <span>Top & Bottom</span>
              </button>
            </div>
          </div>

          {/* Video Preview */}
          <div className="duet-preview-section">
            <div className={`duet-preview-container ${layout}`}>
              <div className="original-video-preview">
                <video
                  ref={videoRef}
                  src={originalVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="preview-video"
                />
                <div className="video-label">Original Video</div>
              </div>

              {recordedVideo && !isRecording ? (
                <div className="recorded-video-preview">
                  <video
                    ref={recordedVideoRef}
                    src={recordedVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="preview-video"
                  />
                  <div className="video-label">Your Video</div>
                </div>
              ) : (
                <div className="recording-placeholder">
                  {isRecording ? (
                    <>
                      <div className="recording-indicator">
                        <span className="recording-dot"></span>
                        <span>{formatTime(recordingDuration)}</span>
                      </div>
                      <button className="stop-recording-btn" onClick={stopRecording}>
                        <i className="fa-solid fa-stop"></i>
                        Stop Recording
                      </button>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-video"></i>
                      <p>Tap to record your duet</p>
                      <button className="start-recording-btn" onClick={startRecording}>
                        <i className="fa-solid fa-circle"></i>
                        Start Recording
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="duet-actions">
            <button className="duet-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="duet-create-btn"
              onClick={handleCreateDuet}
              disabled={!recordedVideo || isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i>
                  Create Duet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuetComponent;
