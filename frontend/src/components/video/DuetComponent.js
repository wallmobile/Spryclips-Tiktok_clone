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
      // Play the original video when recording starts
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: true
      });

      // Show the camera preview
      if (recordedVideoRef.current) {
        recordedVideoRef.current.srcObject = stream;
        recordedVideoRef.current.play();
      }

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
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
        
        // Stop camera preview
        stream.getTracks().forEach(track => track.stop());
        if (recordedVideoRef.current) {
          recordedVideoRef.current.srcObject = null;
        }

        // Pause original video
        if (videoRef.current) {
          videoRef.current.pause();
        }
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please allow camera and microphone permissions in your browser settings.');
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
      // Convert recorded video blob URL to actual blob
      const response = await fetch(recordedVideo);
      const blob = await response.blob();

      // Create FormData to upload
      const formData = new FormData();
      formData.append('video', blob, 'duet-video.webm');
      formData.append('metadata', JSON.stringify({
        videoType: 'duet',
        originalVideoId: video?._id || video?.id,
        layout: layout,
        description: `Duet with @${video?.username || 'user'}`,
        caption: `Duet with @${video?.username || 'user'} ✨`
      }));

      // Upload the duet video
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const result = await uploadResponse.json();
      console.log('Duet uploaded:', result);

      if (onComplete) {
        onComplete({
          originalVideo: video,
          duetVideo: recordedVideo,
          layout: layout,
          userId: user?.id,
          uploadedVideo: result
        });
      }

      alert('Duet created successfully! 🎉');
      
      // Dispatch event to refresh feed
      window.dispatchEvent(new CustomEvent('videoUploaded', { 
        detail: result 
      }));

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
                  <button 
                    className="re-record-btn"
                    onClick={() => {
                      setRecordedVideo(null);
                      setRecordingDuration(0);
                    }}
                  >
                    <i className="fa-solid fa-redo"></i>
                    Re-record
                  </button>
                </div>
              ) : isRecording ? (
                <div className="recording-live-preview">
                  <video
                    ref={recordedVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="preview-video mirror"
                  />
                  <div className="recording-indicator">
                    <span className="recording-dot"></span>
                    <span>{formatTime(recordingDuration)}</span>
                  </div>
                  <button className="stop-recording-btn" onClick={stopRecording}>
                    <i className="fa-solid fa-stop"></i>
                    Stop Recording
                  </button>
                </div>
              ) : (
                <div className="recording-placeholder">
                  <i className="fa-solid fa-video"></i>
                  <p>Record your duet</p>
                  <div className="duet-instructions">
                    <p><i className="fa-solid fa-info-circle"></i> The original video will play while you record</p>
                    <p><i className="fa-solid fa-camera"></i> Make sure your camera and microphone are enabled</p>
                  </div>
                  <button className="start-recording-btn" onClick={startRecording}>
                    <i className="fa-solid fa-circle"></i>
                    Start Recording
                  </button>
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
