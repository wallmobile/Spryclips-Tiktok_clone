import React, { useRef, useEffect, useState } from 'react';
import { useVideoStore } from '../../store/videoStore';
import ActionBar from '../common/ActionBar';
import VolumeControl from '../common/VolumeControl';
import { trackVideoView } from '../../api/videos';
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
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string | null>(null);
  const [videoDisplayWidth, setVideoDisplayWidth] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    
    // Reset view tracking when video source changes
    setHasTrackedView(false);
    setWatchStartTime(null);
  }, [src, id]); // Reapply when video source or ID changes

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
        
        // Track view when video starts playing (only once per video)
        if (!hasTrackedView && id) {
          setWatchStartTime(Date.now());
          trackVideoView(id, 0, 0).then((result) => {
            if (result?.success) {
              setHasTrackedView(true);
              console.log('✅ Video view tracked:', id);
            }
          }).catch((err) => {
            console.warn('Failed to track video view:', err);
          });
        }
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

  // Track watch time and completion when video ends
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive || !hasTrackedView || !watchStartTime) return;

    const handleVideoEnd = () => {
      // Calculate watch time and completion rate
      if (duration > 0) {
        const watchTime = Math.min(duration, (Date.now() - watchStartTime) / 1000);
        const completionRate = Math.min(100, (watchTime / duration) * 100);
        
        // Update view tracking with watch time and completion
        trackVideoView(id, watchTime, completionRate).catch((err) => {
          console.warn('Failed to update view tracking:', err);
        });
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    return () => {
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [isActive, hasTrackedView, watchStartTime, duration, id]);

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

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

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

  // Calculate and store video aspect ratio
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const updateAspectRatio = () => {
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        const aspectRatioString = `${video.videoWidth} / ${video.videoHeight}`;
        setVideoAspectRatio(aspectRatioString);
        
        // Apply aspect ratio to container via CSS custom property for dynamic sizing
        container.style.setProperty('--video-aspect-ratio', aspectRatio.toString());
        container.style.setProperty('--video-width', `${video.videoWidth}px`);
        container.style.setProperty('--video-height', `${video.videoHeight}px`);
        
        // Calculate actual display width based on container and aspect ratio
        // The video uses object-fit: contain, so we need to calculate the visible width
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let displayWidth: number;
        if (aspectRatio > containerAspectRatio) {
          // Video is wider - constrained by width
          displayWidth = containerWidth;
        } else {
          // Video is taller - constrained by height
          displayWidth = containerHeight * aspectRatio;
        }
        
        setVideoDisplayWidth(displayWidth);
      }
    };

    const handleLoadedMetadata = () => {
      updateAspectRatio();
    };

    // Check if metadata is already loaded
    if (video.readyState >= 1) {
      // Metadata already loaded
      updateAspectRatio();
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    }
    
    // Also recalculate on window resize
    const handleResize = () => {
      updateAspectRatio();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      window.removeEventListener('resize', handleResize);
    };
  }, [src, isActive]);

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
  // Ensure description is properly sanitized and displayed
  const sanitizedDescription = description ? String(description).trim() : '';
  const displayDescription = showFullDescription || !shouldShowMore ? sanitizedDescription : sanitizedDescription.substring(0, maxDescriptionLength) + '...';

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

  // Handle translation
  const handleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    if (translatedText) {
      setShowTranslation(true);
      return;
    }

    setIsTranslating(true);
    try {
      // TODO: Integrate with translation API (Google Translate, etc.)
      // For now, just show a placeholder
      const translated = description ? `[Translated] ${description}` : '';
      setTranslatedText(translated);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Fullscreen functionality removed

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;




  return (
    <div 
      className="video-card-container" 
      ref={containerRef} 
      style={{ 
        aspectRatio: videoAspectRatio ? (() => {
          const match = videoAspectRatio.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            const ratio = parseInt(match[1]) / parseInt(match[2]);
            return ratio.toString();
          }
          return 'auto';
        })() : 'auto'
      } as React.CSSProperties}
    >
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
        crossOrigin="anonymous"
        onError={(e) => {
          const videoEl = e.target as HTMLVideoElement;
          const error = videoEl.error;
          let errorMessage = 'Failed to load video.';
          
          if (error) {
            switch (error.code) {
              case error.MEDIA_ERR_ABORTED:
                errorMessage = 'Video loading was aborted.';
                break;
              case error.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error. Please check your connection.';
                break;
              case error.MEDIA_ERR_DECODE:
                errorMessage = 'Video decoding error. The file may be corrupted.';
                break;
              case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Video format not supported or file not found.';
                break;
              default:
                errorMessage = 'Failed to load video. Please try again.';
            }
          }
          
          console.error('Video loading error:', {
            errorCode: error?.code,
            errorMessage: error?.message,
            videoSrc: src,
            videoUrl: videoEl.src,
            networkState: videoEl.networkState,
            readyState: videoEl.readyState
          });
          
          // Retry logic (max 2 retries)
          if (retryCount < 2 && src) {
            setRetryCount(prev => prev + 1);
            setVideoError(`${errorMessage} Retrying...`);
            
            // Clear any existing retry timeout
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            
            // Retry after a delay
            retryTimeoutRef.current = setTimeout(() => {
              if (videoRef.current && src) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }, 2000);
          } else {
            setVideoError(errorMessage);
          }
        }}
        onLoadedData={(e) => {
          setVideoError(null);
          setRetryCount(0);
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          // Set duration when video metadata is loaded
          const videoEl = e.target as HTMLVideoElement;
          if (videoEl.duration && videoEl.duration > 0) {
            setDuration(videoEl.duration);
          }
        }}
        onLoadedMetadata={(e) => {
          const videoEl = e.target as HTMLVideoElement;
          if (videoEl.duration && videoEl.duration > 0) {
            setDuration(videoEl.duration);
          }
        }}
        onTimeUpdate={(e) => {
          const videoEl = e.target as HTMLVideoElement;
          setCurrentTime(videoEl.currentTime);
          if (videoEl.duration && videoEl.duration > 0) {
            setDuration(videoEl.duration);
          }
        }}
        onCanPlay={() => {
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
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '1.25rem 1.75rem',
            borderRadius: '12px',
            zIndex: 1000,
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            maxWidth: '90%',
            minWidth: '280px'
          }}>
            <i className="fa-solid fa-exclamation-triangle" style={{ 
              marginRight: '0.5rem',
              color: '#FF6B6B',
              fontSize: '1.25rem'
            }}></i>
            <span style={{ fontSize: '0.95rem', lineHeight: '1.5', display: 'block' }}>{videoError}</span>
            {retryCount >= 2 && src && (
              <button
                onClick={() => {
                  setRetryCount(0);
                  setVideoError(null);
                  if (videoRef.current && src) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <i className="fa-solid fa-rotate" style={{ marginRight: '0.5rem' }}></i>
                Retry
              </button>
            )}
          </div>
        )}

        {/* Video Effects Link */}
        {(video as any)?.effect?.name && (
          <div 
            className="video-card-effect-link"
            onClick={() => {
              const effectId = (video as any)?.effect?.id || (video as any)?.effectId;
              if (effectId) {
                window.location.href = `/effect/${effectId}`;
              }
            }}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            <span>{(video as any).effect.name}</span>
          </div>
        )}
        
        {/* Video Progress Bar */}
        <div 
          className="video-progress-container"
          style={{
            width: videoDisplayWidth > 0 ? `${videoDisplayWidth}px` : 'calc(100% - 32px)',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
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
          username={username}
          userId={(video?.user as any)?._id || (video?.user as any)?.id}
          likes={likesCount}
          comments={commentsCount}
          shares={sharesCount}
          saves={savesCount}
          isLiked={isLiked}
          isBookmarked={false}
          isFollowing={isFollowing}
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

        {/* Description with clickable hashtags and mentions */}
        {description && (
          <>
            <div className={`video-card-description ${showFullDescription ? 'expanded' : ''}`}>
              {showTranslation && translatedText ? (
                <span>{translatedText}</span>
              ) : descriptionParts.length > 0 ? (
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
                      return <span 
                        key={index}
                        style={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >{part.content}</span>;
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
                  <span style={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    display: 'inline-block',
                    width: '100%'
                  }}>{displayDescription}</span>
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

            {/* Translation Button */}
            <button 
              className="video-card-translation-btn"
              onClick={handleTranslation}
              disabled={isTranslating}
            >
              {isTranslating ? 'Translating...' : showTranslation ? 'See original' : 'See translation'}
            </button>
          </>
        )}

        {/* Music/Sound Link */}
        {(video?.soundId || video?.musicId || song) && (
          <div 
            className="video-card-music-link"
            onClick={handleMusicClick}
          >
            <i className="fa-solid fa-music"></i>
            <span>
              {song || (video as any)?.music?.name || (video as any)?.sound?.name || 'original sound'}
              {(video as any)?.music?.artist && ` - ${(video as any).music.artist}`}
              {(video as any)?.sound?.artist && ` - ${(video as any).sound.artist}`}
            </span>
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











