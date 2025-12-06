import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './StitchComponent.css';

const StitchComponent = ({ video, onClose, onComplete }) => {
  const { user } = useAuth();
  const originalVideoRef = useRef(null);
  const recordedVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const [selectedStartTime, setSelectedStartTime] = useState(0);
  const [selectedEndTime, setSelectedEndTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const originalVideoUrl = video?.url || video?.src || '';
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (originalVideoRef.current && originalVideoUrl) {
      originalVideoRef.current.src = originalVideoUrl;
      originalVideoRef.current.load();
    }
  }, [originalVideoUrl]);

  useEffect(() => {
    const video = originalVideoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      setSelectedEndTime(Math.min(video.duration, 15)); // Default to 15 seconds or video length
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

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

  const handleSeek = (time) => {
    if (originalVideoRef.current) {
      originalVideoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleCreateStitch = async () => {
    if (!recordedVideo) {
      alert('Please record your video first!');
      return;
    }

    if (selectedStartTime >= selectedEndTime) {
      alert('Invalid clip selection. End time must be after start time.');
      return;
    }

    setIsProcessing(true);
    try {
      // Here you would upload the clip selection and new video, then merge on backend
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (onComplete) {
        onComplete({
          originalVideo: video,
          originalCreator: video.user || { username: video.username || 'user' },
          clipStartTime: selectedStartTime,
          clipEndTime: selectedEndTime,
          stitchedVideo: recordedVideo,
          userId: user?.id
        });
      }

      onClose();
    } catch (error) {
      console.error('Error creating stitch:', error);
      alert('Failed to create stitch. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clipDuration = selectedEndTime - selectedStartTime;

  return (
    <div className="stitch-overlay" onClick={onClose}>
      <div className="stitch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stitch-header">
          <button className="stitch-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Create Stitch</h2>
          <div className="stitch-header-placeholder"></div>
        </div>

        <div className="stitch-content">
          {/* Original Video Section */}
          <div className="stitch-section">
            <h3>Select Clip from Original Video</h3>
            <div className="video-preview-container">
              <video
                ref={originalVideoRef}
                src={originalVideoUrl}
                controls
                className="preview-video"
              />
              <div className="video-info">
                <p>Original by @{video?.user?.username || video?.username || 'user'}</p>
              </div>
            </div>

            {/* Timeline Selector */}
            <div className="timeline-selector">
              <div className="timeline-label">
                <span>Start: {formatTime(selectedStartTime)}</span>
                <span>End: {formatTime(selectedEndTime)}</span>
                <span>Duration: {formatTime(clipDuration)}</span>
              </div>
              <div className="timeline-track">
                <div
                  className="timeline-range"
                  style={{
                    left: `${(selectedStartTime / videoDuration) * 100}%`,
                    width: `${((selectedEndTime - selectedStartTime) / videoDuration) * 100}%`
                  }}
                >
                  <div className="range-handle start-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const track = e.currentTarget.closest('.timeline-track');
                      const handleDrag = (e) => {
                        const rect = track.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const time = percent * videoDuration;
                        if (time < selectedEndTime) {
                          setSelectedStartTime(time);
                          handleSeek(time);
                        }
                      };
                      document.addEventListener('mousemove', handleDrag);
                      document.addEventListener('mouseup', () => {
                        document.removeEventListener('mousemove', handleDrag);
                      });
                    }}
                  ></div>
                  <div className="range-handle end-handle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const track = e.currentTarget.closest('.timeline-track');
                      const handleDrag = (e) => {
                        const rect = track.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const time = percent * videoDuration;
                        if (time > selectedStartTime) {
                          setSelectedEndTime(time);
                        }
                      };
                      document.addEventListener('mousemove', handleDrag);
                      document.addEventListener('mouseup', () => {
                        document.removeEventListener('mousemove', handleDrag);
                      });
                    }}
                  ></div>
                </div>
                <div
                  className="timeline-progress"
                  style={{ left: `${(currentTime / videoDuration) * 100}%` }}
                ></div>
              </div>
              <div className="timeline-buttons">
                <button
                  className="timeline-btn"
                  onClick={() => handleSeek(Math.max(0, currentTime - 1))}
                >
                  <i className="fa-solid fa-backward-step"></i>
                </button>
                <button
                  className="timeline-btn"
                  onClick={() => {
                    if (originalVideoRef.current.paused) {
                      originalVideoRef.current.play();
                    } else {
                      originalVideoRef.current.pause();
                    }
                  }}
                >
                  <i className="fa-solid fa-play"></i>
                </button>
                <button
                  className="timeline-btn"
                  onClick={() => handleSeek(Math.min(videoDuration, currentTime + 1))}
                >
                  <i className="fa-solid fa-forward-step"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Your Video Section */}
          <div className="stitch-section">
            <h3>Record Your Video</h3>
            {recordedVideo && !isRecording ? (
              <div className="video-preview-container">
                <video
                  ref={recordedVideoRef}
                  src={recordedVideo}
                  autoPlay
                  loop
                  muted
                  controls
                  className="preview-video"
                />
                <div className="video-info">
                  <p>Your Video</p>
                </div>
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
                    <p>Record your video to add after the clip</p>
                    <button className="start-recording-btn" onClick={startRecording}>
                      <i className="fa-solid fa-circle"></i>
                      Start Recording
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Attribution Notice */}
          <div className="attribution-notice">
            <i className="fa-solid fa-info-circle"></i>
            <p>Your stitch will automatically credit the original creator</p>
          </div>

          {/* Action Buttons */}
          <div className="stitch-actions">
            <button className="stitch-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="stitch-create-btn"
              onClick={handleCreateStitch}
              disabled={!recordedVideo || isProcessing || clipDuration <= 0}
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-scissors"></i>
                  Create Stitch
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StitchComponent;
