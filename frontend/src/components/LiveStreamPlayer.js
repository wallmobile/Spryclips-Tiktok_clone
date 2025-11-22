import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import './LiveStreamPlayer.css';

const LiveStreamPlayer = ({ streamData, onEnd, isBroadcaster = false }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [totalGifts, setTotalGifts] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const effects = useMemo(() => [
    { id: 'none', label: 'None', icon: '🎬' },
    { id: 'beauty', label: 'Beauty', icon: '✨' },
    { id: 'vintage', label: 'Vintage', icon: '📷' },
    { id: 'cool', label: 'Cool', icon: '❄️' },
    { id: 'warm', label: 'Warm', icon: '🔥' },
  ], []);

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

  // Initialize stream
  useEffect(() => {
    if (isBroadcaster && streamData?.stream) {
      // In production, this would connect to WebRTC/RTMP server
      if (videoRef.current) {
        videoRef.current.srcObject = streamData.stream;
        streamRef.current = streamData.stream;
        // Set initial states
        const videoTracks = streamData.stream.getVideoTracks();
        const audioTracks = streamData.stream.getAudioTracks();
        setIsCameraOn(videoTracks.length > 0 && videoTracks[0].enabled);
        setIsMicMuted(audioTracks.length > 0 && !audioTracks[0].enabled);
        
        // Add class when video is loaded
        videoRef.current.addEventListener('loadedmetadata', () => {
          if (videoRef.current?.parentElement) {
            videoRef.current.parentElement.classList.add('video-loaded');
          }
        });
      }

      // Start recording if enabled
      if (isRecording) {
        startRecording();
      }
    } else {
      // For viewers, connect to stream URL
      // In production, this would be a WebRTC connection or HLS stream
      if (videoRef.current && streamData?.streamUrl) {
        videoRef.current.src = streamData.streamUrl;
        videoRef.current.play();
        
        // Add class when video is loaded
        videoRef.current.addEventListener('loadedmetadata', () => {
          if (videoRef.current?.parentElement) {
            videoRef.current.parentElement.classList.add('video-loaded');
          }
        });
      }
    }

    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isBroadcaster, streamData, isRecording]);

  const startRecording = async () => {
    if (streamRef.current) {
      try {
        const recorder = new MediaRecorder(streamRef.current);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          // In production, upload to server
          console.log('Recording saved:', url);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

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
    const giftComment = {
      id: Date.now(),
      username: user?.username || 'viewer',
      text: `sent ${gift.emoji} ${gift.name}`,
      timestamp: new Date(),
      gift: gift,
    };

    setComments(prev => [...prev.slice(-49), giftComment]);
    setTotalGifts(prev => prev + gift.price);
    setGifts(prev => [...prev, {
      id: Date.now(),
      gift: gift,
      username: user?.username || 'viewer',
    }]);
    setShowGifts(false);
  };

  const handleEndStream = () => {
    if (window.confirm('Are you sure you want to end the stream?')) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current) {
        stopRecording();
      }
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

  return (
    <div className="live-stream-player">
      {/* Main Video Area */}
      <div className="stream-main">
        <div className="stream-video-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isBroadcaster}
            className="stream-video"
          />
          
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
            </div>

            {/* Stream Title */}
            <div className="stream-title-overlay">
              <h3>{streamData?.title || 'Live Stream'}</h3>
              <p>@{streamData?.username || user?.username || 'user'}</p>
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
                  className={`control-btn ${isRecording ? 'recording' : ''}`}
                  onClick={() => {
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                    setIsRecording(!isRecording);
                  }}
                  title={isRecording ? 'Stop Recording' : 'Start Recording'}    
                >
                  <i className="fa-solid fa-circle"></i>
                  {isRecording ? 'Recording' : 'Record'}
                </button>
                <button
                  className="control-btn"
                  onClick={() => setShowEffects(!showEffects)}
                  title="Effects"
                >
                  <i className="fa-solid fa-magic"></i>
                  Effects
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

            {/* Effects Panel */}
            {showEffects && (
              <div className="effects-panel">
                <h4>Effects</h4>
                <div className="effects-grid">
                  {effects.map(effect => (
                    <button
                      key={effect.id}
                      className={`effect-btn ${selectedEffect === effect.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedEffect(effect.id);
                        // In production, apply effect to stream
                      }}
                    >
                      <span className="effect-icon">{effect.icon}</span>
                      <span>{effect.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
