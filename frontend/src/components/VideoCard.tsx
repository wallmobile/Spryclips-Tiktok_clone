import React, { useRef, useEffect, useState } from 'react';
import { useVideoStore } from '../store/videoStore';
import ActionBar from './ActionBar';
import VolumeControl from './VolumeControl';
import './ForYouFeed.css';

interface VideoDetails {
  [key: string]: unknown;
  soundId?: string;
  musicId?: string;
}

interface ReactionOption {
  id: string;
  emoji: string;
  label: string;
}

interface VideoCardProps {
  id: string;
  src: string;
  poster?: string;
  preload?: "none" | "metadata";
  profileImg?: string;
  username?: string;
  description?: string;
  song?: string;
  video?: VideoDetails; // Full video object for duet/stitch
  onLike?: (videoId: string, payload: { isLiked: boolean; likes: number }) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string, payload: { shares: number }) => void;
  onFollow?: (videoId: string) => void;
  onSave?: (videoId: string, saved: boolean) => void;
  onDuet?: (videoId: string) => void;
  onStitch?: (videoId: string) => void;
  onReact?: (videoId: string, reaction: ReactionOption | null) => void;
  isLiked?: boolean;
  isFollowing?: boolean;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  savesCount?: number;
  interactionMode?: 'api' | 'local';
  currentReaction?: ReactionOption | null;
}

const VideoCard: React.FC<VideoCardProps> = ({
  id,
  src,
  poster,
  preload = "none",
  profileImg,
  username,
  description,
  song,
  video,
  onLike,
  onComment,
  onShare,
  onFollow,
  onSave,
  onDuet,
  onStitch,
  onReact,
  isLiked = false,
  isFollowing = false,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  savesCount = 0,
  interactionMode = 'api',
  currentReaction = null,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { globalMute, globalVolume, activeId } = useVideoStore();
  const isActive = activeId === id;
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply saved settings on mount and when video changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Apply playback speed
    const savedSpeed = parseFloat(localStorage.getItem('playbackSpeed') || '1.0');
    video.playbackRate = savedSpeed;

    // Apply captions
    const savedCaptions = localStorage.getItem('captionsEnabled') === 'true';
    if (video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = savedCaptions ? 'showing' : 'hidden';
      }
    }

    // Disable loop if auto-scroll is enabled
    const autoScrollEnabled = localStorage.getItem('autoScroll') === 'true';
    video.loop = !autoScrollEnabled;
  }, [src]); // Reapply when video source changes

  // Handle video playback based on active state and global mute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      // CRITICAL: First, pause ALL other videos to prevent audio overlap
      // Get all video elements in the document
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((v) => {
        if (v !== video) {
          v.pause();
          v.muted = true;
          v.currentTime = 0; // Reset to start
        }
      });

      // Active video: play and respect globalMute
      // First, ensure previous play promise is cancelled
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {}); // Ignore previous promise
        playPromiseRef.current = null;
      }
      
      // CRITICAL: Set mute and volume IMMEDIATELY and SYNCHRONOUSLY before playing
      // Force update the video element's muted property
      if (globalMute) {
        video.muted = true;
        video.volume = 0;
      } else {
        video.muted = false;
        video.volume = globalVolume / 100;
      }
      
      // Small delay to ensure muted state is applied before play
      requestAnimationFrame(() => {
        // Double-check muted state is correct
        if (globalMute) {
          video.muted = true;
          video.volume = 0;
        } else {
          video.muted = false;
          video.volume = globalVolume / 100;
        }
        
        // Race guard: only allow one play() promise at a time
        playPromiseRef.current = video.play().catch((error) => {
          // Autoplay prevented - try muted playback if unmuted failed
          if (!globalMute && error.name === 'NotAllowedError') {
            // Browser blocked unmuted autoplay - mute and try again
            video.muted = true;
            video.volume = 0;
            return video.play().catch((mutedError) => {
              console.log('Muted play also failed:', mutedError);
              playPromiseRef.current = null;
            });
          }
          console.log('Play failed:', error);
          playPromiseRef.current = null;
        });
      });
    } else {
      // Inactive video: pause and mute IMMEDIATELY and FORCEFULLY
      video.pause();
      video.muted = true;
      video.volume = 0;
      video.currentTime = 0; // Reset to start
      
      // Cancel any pending play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {});
        playPromiseRef.current = null;
      }
    }

    // Cleanup: pause on unmount or when becoming inactive
    return () => {
      if (video && !isActive) {
        video.pause();
        video.muted = true;
        video.volume = 0;
      }
    };
  }, [isActive, globalMute, globalVolume]);

  // Sync volume with store when it changes (VolumeControl updates the store)
  // CRITICAL: This must update IMMEDIATELY when mute state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // ALWAYS sync mute state, even for inactive videos (to prevent sound from inactive videos)
    if (globalMute) {
      video.muted = true;
      video.volume = 0;
    } else {
      // Only unmute if video is active
      if (isActive) {
        video.muted = false;
        video.volume = globalVolume / 100;
      } else {
        // Keep inactive videos muted
        video.muted = true;
        video.volume = 0;
      }
    }
  }, [globalVolume, globalMute, isActive]);

    // Handle document visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.hidden) {
        // Pause all videos when tab is hidden
        video.pause();
      } else {
        // Resume only active video when tab becomes visible
        if (isActive) {
          video.muted = globalMute;
          video.volume = globalMute ? 0 : globalVolume / 100;
          video.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);      
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange); 
    };
  }, [isActive, globalMute, globalVolume]);

  // Handle video ended event for auto-scroll
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    const handleVideoEnd = () => {
      const autoScrollEnabled = localStorage.getItem('autoScroll') === 'true';
      
      if (autoScrollEnabled) {
        // Find the video container
        const videoContainer = video.closest('.for-you-feed-card');
        if (!videoContainer) return;

        // Find the feed container
        const feedContainer = document.querySelector('.for-you-feed');
        if (!feedContainer) return;

        // Get current scroll position
        const currentScroll = feedContainer.scrollTop;
        const cardHeight = window.innerHeight - 60; // Account for navbar

        // Scroll to next video
        const nextScroll = currentScroll + cardHeight;
        const maxScroll = feedContainer.scrollHeight - feedContainer.clientHeight;

        if (nextScroll <= maxScroll) {
          feedContainer.scrollTo({
            top: nextScroll,
            behavior: 'smooth'
          });
        } else {
          // If at the end, restart the video or loop back
          video.currentTime = 0;
          video.play().catch(() => {});
        }
      } else {
        // If auto-scroll is disabled, restart the video
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [isActive, src]);

  // Listen for playback speed changes from ActionBar
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'playbackSpeed' && e.newValue) {
        video.playbackRate = parseFloat(e.newValue);
      } else if (e.key === 'captionsEnabled' && video.textTracks) {
        const captionsEnabled = e.newValue === 'true';
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = captionsEnabled ? 'showing' : 'hidden';
        }
      } else if (e.key === 'autoScroll') {
        video.loop = e.newValue !== 'true';
      }
    };

    // Listen for storage events (when ActionBar updates settings)
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (same-tab updates)
    type VideoSettingsChangeEvent = CustomEvent<{ type: string; value: string }>;

    const handleSettingsChange = (event: Event) => {
      const customEvent = event as VideoSettingsChangeEvent;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      if (detail.type === 'playbackSpeed') {
        video.playbackRate = parseFloat(detail.value);
      } else if (detail.type === 'captionsEnabled') {
        const captionsEnabled = detail.value === 'true';
        if (video.textTracks) {
          for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = captionsEnabled ? 'showing' : 'hidden';
          }
        }
      } else if (detail.type === 'autoScroll') {
        // Update loop based on auto-scroll setting
        video.loop = detail.value !== 'true';
      }
    };

    window.addEventListener('videoSettingsChange', handleSettingsChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('videoSettingsChange', handleSettingsChange);
    };
  }, []);

  // Video progress and time tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      if (!duration) {
        setDuration(video.duration || 0);
      }
    };

    const updateDuration = () => {
      setDuration(video.duration || 0);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
    };
  }, [isActive, duration]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click (seek)
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Parse hashtags and mentions from description
  const parseDescription = (text: string) => {
    if (!text) return [];
    
    const parts: Array<{ type: 'text' | 'hashtag' | 'mention'; content: string }> = [];
    const hashtagRegex = /#(\w+)/g;
    const mentionRegex = /@(\w+)/g;
    let lastIndex = 0;
    const matches: Array<{ index: number; type: 'hashtag' | 'mention'; content: string }> = [];

    // Find all hashtags
    let match;
    while ((match = hashtagRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        type: 'hashtag',
        content: match[1]
      });
    }

    // Find all mentions
    while ((match = mentionRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        type: 'mention',
        content: match[1]
      });
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Build parts array
    matches.forEach((match) => {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        });
      }
      parts.push({
        type: match.type,
        content: match.content
      });
      lastIndex = match.index + match.content.length + (match.type === 'hashtag' ? 1 : 1);
    });

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const descriptionParts = description ? parseDescription(description) : [];
  const maxDescriptionLength = 100;
  const shouldShowMore = description && description.length > maxDescriptionLength;
  const displayDescription = showFullDescription || !shouldShowMore ? description : description.substring(0, maxDescriptionLength) + '...';

  // Handle hashtag click
  const handleHashtagClick = (hashtag: string) => {
    window.location.href = `/tag/${hashtag}`;
  };

  // Handle mention click
  const handleMentionClick = (username: string) => {
    window.location.href = `/@${username}`;
  };

  // Handle username click
  const handleUsernameClick = () => {
    if (username) {
      window.location.href = `/@${username.replace('@', '')}`;
    }
  };

  // Handle music click
  const handleMusicClick = () => {
    if (video?.soundId || video?.musicId) {
      window.location.href = `/music/${video.soundId || video.musicId}`;
    }
  };

  // Fullscreen functionality removed

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;




  return (
    <div className="video-card-container" ref={containerRef}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="video-card-video"
        loop={localStorage.getItem('autoScroll') !== 'true'} // Disable loop if auto-scroll enabled
        playsInline
        controls={false}
        preload={preload}
        muted={globalMute} // Respect globalMute state
        onError={(e) => {
          console.error('Video loading error:', e);
          setVideoError('Failed to load video. Please try again.');
        }}
        onLoadedData={() => {
          setVideoError(null);
        }}
      />
      
      {/* Overlay with actions */}
      <div className="video-card-overlay">
        {/* Video Error Message */}
        {videoError && (
          <div className="video-card-error" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            zIndex: 1000,
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
            <span>{videoError}</span>
          </div>
        )}
        
        {/* Video Progress Bar */}
        <div className="video-progress-container">
          <div 
            ref={progressBarRef}
            className="video-progress-bar"
            onClick={handleProgressClick}
          >
            <div 
              className="video-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="video-progress-time">
            <span>{formatTime(currentTime)}</span>
            <span> / </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control - Bottom Left (TikTok style) */}
        <VolumeControl 
          videoRef={videoRef}
          isActive={isActive}
        />
        
        {/* Full Screen Button removed */}

        {/* Right side: TikTok-style Action Bar */}
        <ActionBar
          videoId={id}
          profileImg={profileImg}
          likes={likesCount}
          comments={commentsCount}
          shares={sharesCount}
          saves={savesCount}
          isLiked={isLiked}
          isBookmarked={false}
          allowDuet={true}
          allowStitch={true}
          video={video}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          onFollow={onFollow}
          onSave={onSave}
          onDuet={onDuet}
          onStitch={onStitch}
          onReact={onReact}
          interactionMode={interactionMode}
          currentReaction={currentReaction}
        />

        {/* Video Info & Follow Button at Bottom */}
        <div className="video-card-info">
          <div className="video-card-channel">
            <img 
              src={profileImg || `https://ui-avatars.com/api/?name=${username || 'User'}&background=E50914&color=fff`}
              alt="Channel"
              className="video-card-avatar"
              onClick={handleUsernameClick}
              style={{ cursor: 'pointer' }}
            />
            <div className="video-card-channel-text">
              <span 
                className="video-card-channel-name"
                onClick={handleUsernameClick}
                style={{ cursor: 'pointer' }}
              >
                {username || '@username'}
              </span>
              {song && (
                <span 
                  className="video-card-song"
                  onClick={handleMusicClick}
                  style={{ cursor: 'pointer' }}
                >
                  {song}
                </span>
              )}
            </div>
          </div>
          <button 
            className={`video-card-follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={() => onFollow && onFollow(id)}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
        
        {/* Description with clickable hashtags and mentions */}
        {description && (
          <div className="video-card-description">
            {descriptionParts.length > 0 ? (
              <>
                {descriptionParts.map((part, index) => {
                  if (part.type === 'hashtag') {
                    return (
                      <span
                        key={index}
                        className="video-card-hashtag"
                        onClick={() => handleHashtagClick(part.content)}
                      >
                        #{part.content}
                      </span>
                    );
                  } else if (part.type === 'mention') {
                    return (
                      <span
                        key={index}
                        className="video-card-mention"
                        onClick={() => handleMentionClick(part.content)}
                      >
                        @{part.content}
                      </span>
                    );
                  } else {
                    return <span key={index}>{part.content}</span>;
                  }
                })}
                {shouldShowMore && (
                  <button
                    className="video-card-description-more"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? 'less' : 'more'}
                  </button>
                )}
              </>
            ) : (
              <>
                {displayDescription}
                {shouldShowMore && (
                  <button
                    className="video-card-description-more"
                    onClick={() => setShowFullDescription(!showFullDescription)}
                  >
                    {showFullDescription ? 'less' : 'more'}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Temporarily remove memo to fix React hooks error
// const MemoizedVideoCard = memo(VideoCard);
// MemoizedVideoCard.displayName = 'VideoCard';

export default VideoCard;











