import React, { useRef, useEffect, useState } from 'react';
import { 
  EllipsisVertical, 
  Monitor, 
  Subtitles, 
  ArrowDownWideNarrow, 
  ExternalLink, 
  HeartOff, 
  Flag, 
  VolumeX, 
  Volume2,
  Download
} from 'lucide-react';
import './VideoPlayer.css';

const VideoPlayer = ({
  video,
  isActive,
  isLiked,
  isFollowing,
  onLike = () => {},
  onFollow = () => {},
  onShare = () => {},
  formatCount,
  onDislike,
  onReport,
  isMuted = false,
  volume = 50,
  onMuteToggle,
  onVolumeChange
}) => {
  const videoRef = useRef(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [floatingPlayer, setFloatingPlayer] = useState(false);
  const dropdownRef = useRef(null);

  const safeFormatCount =
    typeof formatCount === 'function'
      ? formatCount
      : (value) => {
          const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
          return numeric.toLocaleString();
        };

  const fallbackId =
    video?.id ??
    video?._id ??
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `video-${Date.now()}`);

  const safeChannel =
    video?.channel ??
    (video?.user && typeof video.user === 'object' ? video.user.username : undefined) ??
    'Unknown Creator';

  const safeAvatar =
    video?.avatar ??
    (video?.user && typeof video.user === 'object'
      ? video.user.profile?.avatar
      : undefined) ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(safeChannel)}&background=ff0050&color=fff`;

  const safeDescription = typeof video?.description === 'string' ? video.description : '';

  const safeVideo = {
    id: fallbackId,
    url: video?.url || video?.videoUrl || '',
    avatar: safeAvatar,
    channel: safeChannel,
    song: typeof video?.song === 'string' ? video.song : 'Original Sound',
    description: safeDescription,
    likes: Number.isFinite(Number(video?.likes)) ? Number(video.likes) : 0,
    comments: Number.isFinite(Number(video?.comments)) ? Number(video.comments) : 0,
    bookmarks: Number.isFinite(Number(video?.bookmarks)) ? Number(video.bookmarks) : 0,
    shares: Number.isFinite(Number(video?.shares)) ? Number(video.shares) : 0
  };

  useEffect(() => {
    if (!safeVideo.url) {
      return;
    }

    if (videoRef.current) {
      if (isActive) {
        // Only active video plays - apply mute and volume settings
        videoRef.current.muted = isMuted;
        videoRef.current.volume = volume / 100;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay was prevented - user interaction required
            console.log('Autoplay prevented - user interaction required');
          });
        }
      } else {
        // Pause and mute inactive videos to prevent audio overlap
        videoRef.current.pause();
        videoRef.current.muted = true;
        videoRef.current.currentTime = 0; // Reset to start
      }
    }
  }, [isActive, isMuted, volume, safeVideo.url]);

  const handleMuteToggle = () => {
    if (onMuteToggle) {
      onMuteToggle();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = Number.parseInt(e.target.value, 10);
    if (Number.isNaN(newVolume)) {
      return;
    }
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  const handleLike = () => {
    if (typeof onLike === 'function') {
      onLike();
    }
  };

  const handleFollow = () => {
    if (typeof onFollow === 'function') {
      onFollow();
    }
  };

  const handleShare = () => {
    if (typeof onShare === 'function') {
      onShare();
    }
  };

  const handleDownload = () => {
    if (!safeVideo.url) {
      console.warn('Download requested for video without a valid source', safeVideo.id);
      setShowMoreOptions(false);
      return;
    }
    
    // Get proper download URL - fix localhost issue in production
    let downloadUrl = safeVideo.url;
    
    // If URL contains localhost and we're in production, fix it
    if (downloadUrl.includes('localhost')) {
      // Get current base URL from APP_CONFIG
      const baseUrl = (typeof window !== 'undefined' && window.APP_CONFIG?.UPLOADS_BASE_URL) 
        ? window.APP_CONFIG.UPLOADS_BASE_URL.replace(/\/uploads$/, '')
        : window.location.origin;
      
      // Extract path after domain (e.g., /uploads/video.mp4 or /processed/video.mp4)
      const pathMatch = downloadUrl.match(/\/(uploads|processed)\/.+$/);
      if (pathMatch) {
        downloadUrl = baseUrl + pathMatch[0];
      }
    }
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `tiktok_video_${safeVideo.id}.mp4`;
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowMoreOptions(false);
  };

  const handleReportVideo = () => {
    if (onReport) {
      onReport();
    } else {
      alert('Report submitted. Thank you for keeping TikTok safe!');
    }
    setShowMoreOptions(false);
  };

  const handleNotInterested = () => {
    if (onDislike) {
      onDislike();
    } else {
      alert('Video marked as not interested');
    }
    setShowMoreOptions(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMoreOptions(false);
      }
    };

    if (showMoreOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreOptions]);

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={safeVideo.url}
        className="video"
        loop
        playsInline
        onMouseEnter={() => {
          if (videoRef.current && isActive && safeVideo.url) {
            videoRef.current.play().catch(() => {
              // User interaction required for play
            });
          }
        }}
        onMouseLeave={() => {
          if (videoRef.current && !isActive) {
            videoRef.current.pause();
          }
        }}
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {
                // User interaction required
              });
            } else {
              videoRef.current.pause();
            }
          }
        }}
      />
      
      {/* Volume Control - Top Left Corner */}
      <div className="volume-control" 
           onMouseEnter={() => setShowVolumeSlider(true)}
           onMouseLeave={() => setShowVolumeSlider(false)}>
        <button className="volume-btn" onClick={handleMuteToggle} type="button" aria-label={isMuted ? 'Unmute video' : 'Mute video'}>
          {isMuted || volume === 0 ? (
            <VolumeX size={20} />
          ) : (
            <Volume2 size={20} />
          )}
        </button>
        {showVolumeSlider && (
          <div className="volume-slider-container">
            <div className="volume-label">Volume</div>
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              orient="vertical"
            />
          </div>
        )}
      </div>
      
      {/* Video Info Overlay */}
      <div className="video-info">
        <div className="video-info-left">
          <div className="channel-info">
            <img src={safeVideo.avatar} alt={safeVideo.channel} className="avatar" />
            <div className="channel-text">
              <p className="channel-name">{safeVideo.channel}</p>
              <p className="channel-song">{safeVideo.song}</p>
            </div>
          </div>
          <button
            className={`follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleFollow}
            type="button"
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <p className="description">{safeVideo.description || 'No description available for this video.'}</p>
        </div>
      </div>

      {/* TikTok-Style Floating Sidebar */}
      <div className="floating-sidebar">
        {/* Profile Picture with Add Button */}
        <div className="sidebar-profile">
          <div className="profile-pic">
            <div className="action-avatar-initials">TR</div>
            <button className="add-button" onClick={handleFollow} type="button" aria-label="Follow creator">
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sidebar-actions">
          {/* Like Button */}
          <div className="sidebar-item">
            <button
              className={`sidebar-btn like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              type="button"
              aria-pressed={isLiked}
            >
              <i className="fa-solid fa-heart"></i>
            </button>
            <span className="counter">{safeFormatCount(safeVideo.likes + (isLiked ? 1 : 0))}</span>
          </div>

          {/* Comment Button */}
          <div className="sidebar-item">
            <button className="sidebar-btn comment-btn" type="button">
              <i className="fa-solid fa-comment-dots"></i>
            </button>
            <span className="counter">{safeFormatCount(safeVideo.comments || 518)}</span>
          </div>

          {/* Bookmark Button */}
          <div className="sidebar-item">
            <button className="sidebar-btn bookmark-btn" type="button">
              <i className="fa-solid fa-bookmark"></i>
            </button>
            <span className="counter">{safeFormatCount(safeVideo.bookmarks || 518)}</span>
          </div>

          {/* Share Button */}
          <div className="sidebar-item">
            <button className="sidebar-btn share-btn" onClick={handleShare} type="button">
              <i className="fa-solid fa-arrow-turn-up"></i>
            </button>
            <span className="counter">{safeFormatCount(safeVideo.shares)}</span>
          </div>

          {/* More Button - 3 Dot Menu */}
          <div className="sidebar-item">
            <button 
              className="sidebar-btn more-btn" 
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreOptions(!showMoreOptions);
              }}
              type="button"
              aria-haspopup="true"
              aria-expanded={showMoreOptions}
            >
              <EllipsisVertical size={18} />
            </button>
            <span className="counter">More</span>
          </div>
        </div>

        {/* Enhanced More Options Menu */}
        {showMoreOptions && (
          <div className="video-settings-dropdown" ref={dropdownRef}>
            {/* Quality */}
            <div className="dropdown-item">
              <Monitor size={18} />
              <span>Quality</span>
              <span className="dropdown-label">Auto</span>
            </div>

            {/* Captions Toggle */}
            <div 
              className="dropdown-item dropdown-item-toggle"
              onClick={() => setCaptionsEnabled(!captionsEnabled)}
            >
              <Subtitles size={18} />
              <span>Captions</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={captionsEnabled}
                  onChange={() => setCaptionsEnabled(!captionsEnabled)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Auto Scroll Toggle */}
            <div 
              className="dropdown-item dropdown-item-toggle"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              <ArrowDownWideNarrow size={18} />
              <span>Auto Scroll</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={() => setAutoScroll(!autoScroll)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Floating Player Toggle */}
            <div 
              className="dropdown-item dropdown-item-toggle"
              onClick={() => setFloatingPlayer(!floatingPlayer)}
            >
              <ExternalLink size={18} />
              <span>Floating Player</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={floatingPlayer}
                  onChange={() => setFloatingPlayer(!floatingPlayer)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Divider */}
            <div className="dropdown-divider"></div>

            {/* Download */}
            <div 
              className="dropdown-item dropdown-item-action"
              onClick={handleDownload}
            >
              <Download size={18} />
              <span>Download</span>
            </div>

            {/* Not Interested */}
            <div 
              className="dropdown-item dropdown-item-action"
              onClick={handleNotInterested}
            >
              <HeartOff size={18} />
              <span>Not Interested</span>
            </div>

            {/* Report */}
            <div 
              className="dropdown-item dropdown-item-action"
              onClick={handleReportVideo}
            >
              <Flag size={18} />
              <span>Report</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;












