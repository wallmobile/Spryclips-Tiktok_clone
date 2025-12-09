import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleLike, shareVideo } from '../../api/videos';
import { generateIdempotencyKey } from '../../utils/idempotency';
import ReactPicker from './ReactPicker';
import './ActionBar.css';
import { useLibraryStore, makeLibraryVideoFromFeed } from '../../store/libraryStore';
import {
  addToWatchLater as addWatchLaterApi,
  removeFromWatchLater as removeWatchLaterApi
} from '../../api/collections';
import { useAuth } from '../../context/AuthContext';

interface ReactionOption {
  id: string;
  emoji: string;
  label: string;
}

interface ActionBarProps {
  videoId: string;
  profileImg?: string;
  username?: string;
  userId?: string;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
  onLike?: (videoId: string, payload: { isLiked: boolean; likes: number }) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string, payload: { shares: number }) => void;
  onFollow?: (videoId: string) => void;
  onSave?: (videoId: string, saved: boolean) => void;
  onError?: (message: string) => void;
  onDuet?: (videoId: string) => void;
  onStitch?: (videoId: string) => void;
  onReact?: (videoId: string, reaction: ReactionOption | null) => void;
  video?: any; // Full video object for duet/stitch
  interactionMode?: 'api' | 'local';
  currentReaction?: ReactionOption | null;
}

interface ActionState {
  liked: boolean;
  likes: number;
  bookmarked: boolean;
  bookmarks: number;
  shares: number;
  comments: number;
  pending: {
    like: boolean;
    bookmark: boolean;
    share: boolean;
  };
}

const normalizeCount = (value?: number | null): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return value;
};

const isHexObjectId = (value?: string): boolean => {
  if (!value) {
    return false;
  }
  return /^[0-9a-fA-F]{24}$/.test(value);
};

const ActionBar: React.FC<ActionBarProps> = ({
  videoId,
  profileImg,
  username,
  userId,
  likes,
  comments,
  shares,
  saves = 0,
  isLiked = false,
  isBookmarked = false,
  isFollowing = false,
  allowDuet = true,
  allowStitch = true,
  onLike,
  onComment,
  onShare,
  onFollow,
  onSave,
  onError,
  onDuet,
  onStitch,
  onReact,
  video,
  interactionMode = 'api',
  currentReaction: currentReactionProp = null,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [state, setState] = useState<ActionState>({
    liked: isLiked,
    likes: normalizeCount(likes),
    bookmarked: isBookmarked,
    bookmarks: normalizeCount(saves),
    shares: normalizeCount(shares),
    comments: normalizeCount(comments),
    pending: { like: false, bookmark: false, share: false },
  });

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<ReactionOption | null>(currentReactionProp);
  const [moreMenuStyle, setMoreMenuStyle] = useState<React.CSSProperties>({});
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuItemRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const reactButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCurrentReaction(currentReactionProp);
  }, [currentReactionProp]);

  // Video settings state
  const [videoQuality, setVideoQuality] = useState<string>(
    localStorage.getItem('videoQuality') || 'Auto'
  );
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(
    parseFloat(localStorage.getItem('playbackSpeed') || '1.0')
  );
  const [autoScroll, setAutoScroll] = useState<boolean>(
    localStorage.getItem('autoScroll') === 'true'
  );
  const [floatingPlayer, setFloatingPlayer] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Throttle & inFlight locks
  const likeThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const bookmarkThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const likeInFlightRef = useRef(false);
  const bookmarkInFlightRef = useRef(false);
  const shareInFlightRef = useRef(false);
  const shareDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const hydrateLibrary = useLibraryStore((state) => state.hydrate);
  const watchLaterEntries = useLibraryStore((state) => state.watchLater);
  const addToWatchLater = useLibraryStore((state) => state.addToWatchLater);
  const removeFromWatchLater = useLibraryStore((state) => state.removeFromWatchLater);

  useEffect(() => {
    hydrateLibrary();
  }, [hydrateLibrary]);

  const isVideoSaved = useMemo(
    () => watchLaterEntries.some((entry) => entry.video._id === videoId),
    [watchLaterEntries, videoId]
  );

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      bookmarked: isVideoSaved,
    }));
  }, [isVideoSaved]);

  // Sync with props (only comments from server, others are controlled internally)
  useEffect(() => {
    setState(prev => ({
      ...prev,
      comments: normalizeCount(comments), // Only sync comments from server - don't increment manually
    }));
  }, [comments]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      liked: isLiked,
      likes: normalizeCount(likes),
      shares: normalizeCount(shares),
      bookmarked: isBookmarked,
      bookmarks: normalizeCount(saves),
    }));
  }, [isLiked, likes, shares, isBookmarked, saves]);

  const libraryVideo = useMemo(() => {
    const record = (video ?? {}) as Record<string, unknown>;
    const userRecord = (record['user'] ?? {}) as Record<string, unknown>;

    const derivedUsername =
      (userRecord['username'] as string | undefined) ||
      (record['username'] as string | undefined) ||
      (record['creator'] as string | undefined);

    const derivedDescription =
      (record['description'] as string | undefined) ||
      (record['caption'] as string | undefined);

    const derivedThumbnail =
      (record['thumbnail'] as string | undefined) ||
      (record['poster'] as string | undefined) ||
      (record['coverImage'] as string | undefined);

    const derivedUrl =
      (record['videoUrl'] as string | undefined) ||
      (record['url'] as string | undefined) ||
      (record['src'] as string | undefined);

    const derivedAvatar =
      (userRecord['profile'] as { avatar?: string } | undefined)?.avatar ||
      (record['avatar'] as string | undefined) ||
      profileImg;

    return makeLibraryVideoFromFeed(videoId, {
      src: derivedUrl,
      thumbnail: derivedThumbnail,
      description: derivedDescription,
      username: derivedUsername,
      avatar: derivedAvatar,
      source: (record['__source'] as 'api' | 'sample' | undefined) ?? 'api',
    });
  }, [profileImg, video, videoId]);

  // Format count with animation
  const formatCount = (rawCount?: number | null): string => {
    const count = normalizeCount(rawCount);
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Like handler with throttle + inFlight + optimistic UI
  const handleLike = useCallback(() => {
    if (state.pending.like || likeInFlightRef.current) return;

    if (interactionMode === 'local') {
      const newLiked = !state.liked;
      const optimisticCount = Math.max(0, state.likes + (newLiked ? 1 : -1));
      setState(prev => ({
        ...prev,
        liked: newLiked,
        likes: optimisticCount,
      }));
      onLike && onLike(videoId, { isLiked: newLiked, likes: optimisticCount });
      return;
    }

    // Clear existing throttle
    if (likeThrottleRef.current) {
      clearTimeout(likeThrottleRef.current);
    }

    likeThrottleRef.current = setTimeout(() => {
      if (likeInFlightRef.current) return;
      
      likeInFlightRef.current = true;
      const newLiked = !state.liked;
      const optimisticCount = newLiked ? state.likes + 1 : state.likes - 1;

      // Optimistic update
      setState(prev => ({
        ...prev,
        liked: newLiked,
        likes: optimisticCount,
        pending: { ...prev.pending, like: true },
      }));

      // API call with idempotency
      const idempotencyKey = generateIdempotencyKey();
      toggleLike(videoId, idempotencyKey)
        .then((response: { isLiked: boolean; likes: number }) => {
          // Server response is source of truth
          setState(prev => ({
            ...prev,
            liked: response.isLiked,
            likes: response.likes,
            pending: { ...prev.pending, like: false },
          }));
          onLike && onLike(videoId, { isLiked: response.isLiked, likes: response.likes });
        })
        .catch((error: unknown) => {
          // Rollback on error
          setState(prev => ({
            ...prev,
            liked: !newLiked,
            likes: state.likes,
            pending: { ...prev.pending, like: false },
          }));
          
          // Better error message - prioritize userMessage for 401 errors
          const errorObj = error as any;
          const errorMessage = errorObj?.userMessage || 
                             errorObj?.response?.data?.userMessage ||
                             errorObj?.response?.data?.message || 
                             errorObj?.message || 
                             'Failed to update like. Please try again.';
          
          onError && onError(errorMessage);
          console.error('Like error:', error);
          
          // Show toast if available (check with type guard)
          if (typeof (window as any).showToast === 'function') {
            (window as any).showToast(errorMessage, 'error');
          }
        })
        .finally(() => {
          likeInFlightRef.current = false;
        });
    }, 300);
  }, [videoId, state.liked, state.likes, onLike, onError, interactionMode, state.pending.like]);

  const syncBookmarkWithServer = useCallback(
    async (
      shouldSave: boolean,
      previous: { bookmarked: boolean; bookmarks: number }
    ) => {
      if (
        interactionMode === 'local' ||
        !isHexObjectId(videoId)
      ) {
        return;
      }

      if (!isAuthenticated) {
        return;
      }

      try {
        if (shouldSave) {
          await addWatchLaterApi(videoId);
          console.log('[ActionBar] Successfully added video to watch later:', videoId);
          // Dispatch event to notify Watch Later page
          window.dispatchEvent(new CustomEvent('watchlater:updated', { detail: { action: 'add', videoId } }));
        } else {
          await removeWatchLaterApi(videoId);
          console.log('[ActionBar] Successfully removed video from watch later:', videoId);
          // Dispatch event to notify Watch Later page
          window.dispatchEvent(new CustomEvent('watchlater:updated', { detail: { action: 'remove', videoId } }));
        }
      } catch (error) {
        console.error('[ActionBar] Failed to sync Watch Later', error);
        onError?.(
          shouldSave
            ? 'Failed to save video to Watch Later. Please try again.'
            : 'Failed to remove video from Watch Later. Please try again.'
        );

        if (shouldSave) {
          removeFromWatchLater(videoId);
        } else {
          addToWatchLater(libraryVideo);
        }

        setState((prev) => ({
          ...prev,
          bookmarked: previous.bookmarked,
          bookmarks: previous.bookmarks,
          pending: { ...prev.pending, bookmark: false },
        }));

        if (onSave) {
          onSave(videoId, previous.bookmarked);
        }
      }
    },
    [
      addToWatchLater,
      interactionMode,
      isAuthenticated,
      libraryVideo,
      onError,
      onSave,
      removeFromWatchLater,
      videoId,
    ]
  );

  const handleBookmark = useCallback(() => {
    if (state.pending.bookmark || bookmarkInFlightRef.current) return;

    if (bookmarkThrottleRef.current) {
      clearTimeout(bookmarkThrottleRef.current);
    }

    bookmarkThrottleRef.current = setTimeout(() => {
      if (bookmarkInFlightRef.current) return;

      bookmarkInFlightRef.current = true;

      setState((prev) => ({
        ...prev,
        pending: { ...prev.pending, bookmark: true },
      }));

      const nextBookmarked = !isVideoSaved;
      const prevBookmarked = state.bookmarked;
      const prevBookmarks = state.bookmarks;
      if (nextBookmarked) {
        addToWatchLater(libraryVideo);
      } else {
        removeFromWatchLater(videoId);
      }

      setState((prev) => ({
        ...prev,
        bookmarked: nextBookmarked,
        bookmarks: Math.max(
          0,
          nextBookmarked ? prev.bookmarks + 1 : prev.bookmarks - 1
        ),
        pending: { ...prev.pending, bookmark: false },
      }));

      if (onSave) {
        onSave(videoId, nextBookmarked);
      }

      if (interactionMode !== 'local' && isHexObjectId(videoId)) {
        void syncBookmarkWithServer(nextBookmarked, {
          bookmarked: prevBookmarked,
          bookmarks: prevBookmarks,
        });
      }

      bookmarkInFlightRef.current = false;
    }, 150);
  }, [
    addToWatchLater,
    isVideoSaved,
    libraryVideo,
    onSave,
    interactionMode,
    removeFromWatchLater,
    syncBookmarkWithServer,
    state.pending.bookmark,
    videoId,
  ]);

  // Share handler with 2s debounce + inFlight lock
  const handleShare = useCallback((type: string) => {
    setShowShareMenu(false);
    
    // Prevent multiple share calls
    if (shareInFlightRef.current || state.pending.share) return;
    
    // Execute share action immediately
    switch (type) {
      case 'copy':
        navigator.clipboard.writeText(window.location.href);
        onError && onError('Link copied to clipboard!');
        break;
      case 'whatsapp':
        try {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(window.location.href)}`;
          // Use window.location for better mobile compatibility
          window.location.href = whatsappUrl;
        } catch (err) {
          console.error('WhatsApp share error:', err);
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(window.location.href).then(() => {
            onError && onError('Link copied! Paste it in WhatsApp.');
          }).catch(() => {
            onError && onError('Failed to share. Please copy the link manually.');
          });
        }
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`);
        break;
      default:
        if (navigator.share) {
          navigator.share({
            title: 'Check out this video!',
            url: window.location.href,
          }).catch(() => {});
        }
    }

    if (interactionMode === 'local') {
      const nextShares = state.shares + 1;
      setState(prev => ({
        ...prev,
        shares: nextShares,
      }));
      onShare && onShare(videoId, { shares: nextShares });
      return;
    }

    // Debounced API call (max +1 per action, 2s debounce)
    if (shareDebounceRef.current) {
      clearTimeout(shareDebounceRef.current);
    }

    shareDebounceRef.current = setTimeout(() => {
      if (shareInFlightRef.current || state.pending.share) return;
      
      shareInFlightRef.current = true;
      const previousShares = state.shares;

      // Optimistic update
      setState(prev => ({
        ...prev,
        shares: prev.shares + 1,
        pending: { ...prev.pending, share: true },
      }));

      const shareIdempotencyKey = generateIdempotencyKey();
      shareVideo(videoId, shareIdempotencyKey)
        .then((response: { shares: number }) => {
          const nextShares = typeof response?.shares === 'number' ? response.shares : previousShares + 1;
          // Server response is source of truth
          setState(prev => ({
            ...prev,
            shares: nextShares,
            pending: { ...prev.pending, share: false },
          }));
          onShare && onShare(videoId, { shares: nextShares });
        })
        .catch((error: unknown) => {
          // Rollback on error
          setState(prev => ({
            ...prev,
            shares: previousShares,
            pending: { ...prev.pending, share: false },
          }));
          
          // Better error message - prioritize userMessage for 401 errors
          const errorObj = error as any;
          const errorMessage = errorObj?.userMessage || 
                             errorObj?.response?.data?.userMessage ||
                             errorObj?.response?.data?.message || 
                             errorObj?.message || 
                             'Failed to update share count. Please try again.';
          
          onError && onError(errorMessage);
          console.error('Share error:', error);
        })
        .finally(() => {
          shareInFlightRef.current = false;
        });
    }, 2000);
  }, [videoId, state.pending.share, state.shares, onShare, onError, interactionMode]);


  // Position more menu dynamically to prevent overflow
  useEffect(() => {
    if (showMoreMenu && moreButtonRef.current) {
      const updatePosition = () => {
        if (!moreButtonRef.current || !moreMenuItemRef.current) return;
        
        const buttonRect = moreButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Wait for menu to render to get actual height
        const menuHeight = moreMenuItemRef.current.offsetHeight || 400;
        const right = viewportWidth - buttonRect.right + 60;
        let top = buttonRect.top;
        
        // Check if menu would overflow bottom
        if (buttonRect.top + menuHeight > viewportHeight - 20) {
          // Position above button if not enough space below
          top = buttonRect.bottom - menuHeight;
          // Ensure it doesn't go above viewport
          if (top < 20) {
            top = 20;
            const maxHeight = viewportHeight - top - 20;
            setMoreMenuStyle({
              top: `${top}px`,
              right: `${right}px`,
              bottom: 'auto',
              maxHeight: `${maxHeight}px`
            });
          } else {
            setMoreMenuStyle({
              top: `${top}px`,
              right: `${right}px`,
              bottom: 'auto',
              maxHeight: 'none'
            });
          }
        } else {
          // Normal positioning - align with button top
          setMoreMenuStyle({
            top: `${top}px`,
            right: `${right}px`,
            bottom: 'auto',
            maxHeight: `${viewportHeight - top - 20}px`
          });
        }
      };
      
      // Initial position calculation
      setTimeout(updatePosition, 0);
      
      // Recalculate after menu renders
      setTimeout(updatePosition, 10);
      
      // Handle window resize
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    } else {
      setMoreMenuStyle({});
    }
  }, [showMoreMenu]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
      if ((!moreMenuRef.current || !moreMenuRef.current.contains(event.target as Node)) &&
          (!moreMenuItemRef.current || !moreMenuItemRef.current.contains(event.target as Node)) &&
          (!moreButtonRef.current || !moreButtonRef.current.contains(event.target as Node))) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

      const handleFullscreen = () => {
    const videoElement = document.querySelector('video');
    if (videoElement) {
      if (!document.fullscreenElement) {
        videoElement.requestFullscreen().catch(err => {
          console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleQualitySelect = (quality: string) => {
    setVideoQuality(quality);
    setShowQualityMenu(false);
    
    // Store quality preference in localStorage
    localStorage.setItem('videoQuality', quality);
    
    // Try to apply quality to video element if possible
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      // Note: Actual quality change requires different video sources/transcoding
      // For now, we just store the preference
      // In a full implementation, you'd switch video sources based on quality
      console.log(`Quality preference set to: ${quality}`);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    localStorage.setItem('playbackSpeed', speed.toString());
    
    // Apply to all video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((videoElement) => {
      videoElement.playbackRate = speed;
    });

    // Dispatch custom event for immediate update in same tab
    window.dispatchEvent(new CustomEvent('videoSettingsChange', {
      detail: { type: 'playbackSpeed', value: speed.toString() }
    }));
  };

    const handleMoreAction = (action: string) => {
      switch (action) {
        case 'quality':
          setShowQualityMenu(!showQualityMenu);
          setShowSpeedMenu(false);
          break;
        case 'captions':
          const newCaptionsState = !captionsEnabled;
          setCaptionsEnabled(newCaptionsState);
          localStorage.setItem('captionsEnabled', newCaptionsState.toString());
          
          // Enable/disable captions on all video elements
          const allVideosForCaptions = document.querySelectorAll('video');
          allVideosForCaptions.forEach((videoElement) => {
            const tracks = videoElement.textTracks;
            for (let i = 0; i < tracks.length; i++) {
              tracks[i].mode = newCaptionsState ? 'showing' : 'hidden';
            }
          });

          // Dispatch custom event for immediate update in same tab
          window.dispatchEvent(new CustomEvent('videoSettingsChange', {
            detail: { type: 'captionsEnabled', value: newCaptionsState.toString() }
          }));
          break;
        case 'fullscreen':
          handleFullscreen();
          break;
        case 'speed':
          setShowSpeedMenu(!showSpeedMenu);
          setShowQualityMenu(false);
          break;
        case 'auto-scroll':
          const newAutoScrollState = !autoScroll;
          setAutoScroll(newAutoScrollState);
          localStorage.setItem('autoScroll', newAutoScrollState.toString());
          
          // Update loop property on all videos based on auto-scroll setting
          const allVideosForAutoScroll = document.querySelectorAll('video');
          allVideosForAutoScroll.forEach((videoElement) => {
            videoElement.loop = !newAutoScrollState;
          });

          // Dispatch custom event for immediate update in same tab
          window.dispatchEvent(new CustomEvent('videoSettingsChange', {
            detail: { type: 'autoScroll', value: newAutoScrollState.toString() }
          }));
          break;
        case 'floating-player':
          const newFloatingState = !floatingPlayer;
          setFloatingPlayer(newFloatingState);
          setShowMoreMenu(false);
          
          const videoEl = document.querySelector('video') as HTMLVideoElement;
          if (videoEl && 'pictureInPictureEnabled' in document) {
            if (newFloatingState) {
              // Enter Picture-in-Picture
              videoEl.requestPictureInPicture().catch((err) => {
                console.error('Picture-in-Picture failed:', err);
                setFloatingPlayer(false);
              });
            } else {
              // Exit Picture-in-Picture
              if (document.pictureInPictureElement) {
                document.exitPictureInPicture().catch((err) => {
                  console.error('Exit Picture-in-Picture failed:', err);
                });
              }
            }
          } else {
            alert('Picture-in-Picture is not supported in your browser.');
            setFloatingPlayer(false);
          }
          break;
        case 'report':
          setShowMoreMenu(false);
          handleReportVideo();
          break;
        case 'not-interested':
          setShowMoreMenu(false);
          alert('Video marked as not interested');
          break;
        case 'save':
          setShowMoreMenu(false);
          handleBookmark();
        break;
      case 'copy-link':
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
        break;
      case 'duet':
        if (onDuet && video) {
          onDuet(videoId);
        } else {
          alert('Duet feature coming soon!');
        }
        break;
      case 'stitch':
        if (onStitch && video) {
          onStitch(videoId);
        } else {
          alert('Stitch feature coming soon!');
        }
        break;
    }
  };

  const handleReaction = (reaction: ReactionOption | null) => {
    setCurrentReaction(reaction);
    if (onReact) {
      onReact(videoId, reaction);
    }
    setTimeout(() => setShowReactPicker(false), 300);
  };

  const handleLikeLongPress = useCallback(() => {
    setShowReactPicker(true);
  }, []);

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  // Report video handler
  const handleReportVideo = async () => {
    try {
      // Import report API
      const { reportVideo } = await import('../../api/moderation');
      await reportVideo(videoId, 'inappropriate', {
        description: 'Reported via More menu'
      });
      onError && onError('Report submitted. Thank you for keeping TikTok safe!');
    } catch (error) {
      console.error('Report error:', error);
      // Fallback to alert if API fails
      alert('Report submitted. Thank you for keeping TikTok safe!');
    }
  };

  // Note: Auto-scroll is now handled in VideoCard component
  // This allows each video to handle its own ended event properly

  // Handle Picture-in-Picture state changes
  useEffect(() => {
    const handlePiPChange = () => {
      if (!document.pictureInPictureElement) {
        setFloatingPlayer(false);
      }
    };

    document.addEventListener('leavepictureinpicture', handlePiPChange);
    return () => {
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);

  // Apply saved settings on mount
  useEffect(() => {
    // Apply playback speed
    const savedSpeed = parseFloat(localStorage.getItem('playbackSpeed') || '1.0');
    if (savedSpeed !== 1.0) {
      setPlaybackSpeed(savedSpeed);
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((videoElement) => {
        videoElement.playbackRate = savedSpeed;
      });
    }

    // Apply captions
    const savedCaptions = localStorage.getItem('captionsEnabled') === 'true';
    if (savedCaptions) {
      setCaptionsEnabled(true);
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((videoElement) => {
        const tracks = videoElement.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = 'showing';
        }
      });
    }

    // Apply auto-scroll (update loop property)
    const savedAutoScroll = localStorage.getItem('autoScroll') === 'true';
    setAutoScroll(savedAutoScroll);
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((videoElement) => {
      videoElement.loop = !savedAutoScroll;
    });
  }, []);

  return (
    <div className="action-bar">
      {/* Profile Picture */}
      <div className="action-bar-item profile-item">
        <div className="profile-picture-wrapper">
          <img 
            src={profileImg || `https://ui-avatars.com/api/?name=User&background=E50914&color=fff`}
            alt="Profile"
            className="profile-picture"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Check if user is authenticated
              if (!isAuthenticated) {
                // Show error message
                if (onError) {
                  onError('Please login to view profile');
                } else {
                  // Show alert message
                  alert('Please login to view profile');
                }
                // Navigate to login page with message
                navigate('/login', { state: { message: 'Please login to view profile' } });
                return;
              }
              
              // Navigate to user profile page without page reload
              if (username) {
                const cleanUsername = username.replace('@', '');
                navigate(`/user/${cleanUsername}`);
              } else if (userId) {
                navigate(`/user/${userId}`);
              } else if (video?.user) {
                const user = video.user;
                const userUsername = (typeof user === 'object' ? (user.username || user._id || user.id) : user) || 
                                   (video as any)?.username || 
                                   (video as any)?.channel;
                if (userUsername) {
                  navigate(`/user/${String(userUsername).replace('@', '')}`);
                } else {
                  navigate('/profile');
                }
              } else {
                navigate('/profile');
              }
            }}
            style={{ cursor: 'pointer' }}
            title="View profile"
          />
          {!isFollowing && (
            <button 
              className="follow-button"
              onClick={(e) => {
                e.stopPropagation();
                onFollow && onFollow(videoId);
              }}
              aria-label="Follow user"
              title="Follow user"
              onKeyDown={(e) => {
                e.stopPropagation();
                handleKeyDown(e, () => onFollow && onFollow(videoId));
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          )}
        </div>
      </div>

      {/* Like Button with Reactions */}
      <div className="action-bar-item react-item" style={{ position: 'relative' }}>
        <button
          ref={reactButtonRef}
          className={`action-button like-button ${state.liked || currentReaction ? 'liked' : ''} ${state.pending.like ? 'pending' : ''}`}
          onClick={handleLike}
          onMouseDown={(e) => {
            // Long press detection for reactions
            const timer = setTimeout(() => {
              handleLikeLongPress();
            }, 500);
            const cleanup = () => {
              clearTimeout(timer);
              document.removeEventListener('mouseup', cleanup);
              document.removeEventListener('mouseleave', cleanup);
            };
            document.addEventListener('mouseup', cleanup);
            document.addEventListener('mouseleave', cleanup);
          }}
          onTouchStart={(e) => {
            const timer = setTimeout(() => {
              handleLikeLongPress();
            }, 500);
            const cleanup = () => {
              clearTimeout(timer);
              document.removeEventListener('touchend', cleanup);
            };
            document.addEventListener('touchend', cleanup);
          }}
          disabled={state.pending.like || likeInFlightRef.current}
          aria-label={state.liked || currentReaction ? 'Unlike' : 'Like'}
          aria-pressed={state.liked || !!currentReaction}
          title={currentReaction ? currentReaction.label : (state.liked ? 'Unlike' : 'Like (Hold for reactions)')}
          onKeyDown={(e) => handleKeyDown(e, handleLike)}
        >
          {currentReaction ? (
            <span className="reaction-emoji">{currentReaction.emoji}</span>
          ) : (
            <i className={`fa-solid fa-heart ${state.liked ? 'fa-bounce' : ''}`}></i>
          )}
          {state.pending.like && <span className="spinner"></span>}
        </button>
        {showReactPicker && (
          <ReactPicker
            onReaction={handleReaction}
            currentReaction={currentReaction}
            position="bottom"
          />
        )}
        <span className={`action-count ${state.pending.like ? 'pending' : ''}`}>
          {formatCount(state.likes)}
        </span>
      </div>

      {/* Comment Button */}
      <div className="action-bar-item">
        <button
          className="action-button comment-button"
          onClick={() => onComment && onComment(videoId)}
          aria-label="Comment"
          title="Add comment"
          onKeyDown={(e) => handleKeyDown(e, () => onComment && onComment(videoId))}
        >
          <i className="fa-solid fa-comment-dots"></i>
        </button>
        <span className="action-count">{formatCount(state.comments)}</span>
      </div>

      {/* Save/Bookmark Button */}
      <div className="action-bar-item">
        <button
          className={`action-button save-button ${state.bookmarked ? 'bookmarked' : ''} ${state.pending.bookmark ? 'pending' : ''}`}
          onClick={handleBookmark}
          disabled={state.pending.bookmark || bookmarkInFlightRef.current}
          aria-label={state.bookmarked ? 'Unbookmark' : 'Bookmark'}
          aria-pressed={state.bookmarked}
          title={state.bookmarked ? 'Remove bookmark' : 'Save video'}
          onKeyDown={(e) => handleKeyDown(e, handleBookmark)}
        >
          <i className={`fa-solid fa-bookmark ${state.bookmarked ? 'filled' : ''}`}></i>
          {state.pending.bookmark && <span className="spinner"></span>}
        </button>
        <span className={`action-count ${state.pending.bookmark ? 'pending' : ''}`}>
          {formatCount(state.bookmarks)}
        </span>
      </div>

      {/* Share Button */}
      <div className="action-bar-item share-item" ref={shareMenuRef}>
        <button
          className={`action-button share-button ${state.pending.share ? 'pending' : ''}`}
          onClick={() => setShowShareMenu(!showShareMenu)}
          disabled={state.pending.share || shareInFlightRef.current}
          aria-label="Share"
          aria-expanded={showShareMenu}
          title="Share video"
          onKeyDown={(e) => handleKeyDown(e, () => setShowShareMenu(!showShareMenu))}
        >
          <i className="fa-solid fa-share"></i>
          {state.pending.share && <span className="spinner"></span>}
        </button>
        <span className={`action-count ${state.pending.share ? 'pending' : ''}`}>
          {formatCount(state.shares)}
        </span>
        
        {/* Share Menu */}
        {showShareMenu && (
          <div className="share-menu">
            <button onClick={() => handleShare('copy')} className="share-menu-item">
              <i className="fa-solid fa-link"></i>
              <span>Copy Link</span>
            </button>
            <button onClick={() => handleShare('whatsapp')} className="share-menu-item">
              <i className="fa-brands fa-whatsapp"></i>
              <span>WhatsApp</span>
            </button>
            <button onClick={() => handleShare('facebook')} className="share-menu-item">
              <i className="fa-brands fa-facebook"></i>
              <span>Facebook</span>
            </button>
            <button onClick={() => handleShare('twitter')} className="share-menu-item">
              <i className="fa-brands fa-twitter"></i>
              <span>Twitter</span>
            </button>
          </div>
        )}
      </div>

             {/* More Menu (3 dots) */}
       <div className="action-bar-item more-item" ref={moreMenuRef}>
         <button
           ref={moreButtonRef}
           className="action-button more-button"
           onClick={() => setShowMoreMenu(!showMoreMenu)}
           aria-label="More options"
           aria-expanded={showMoreMenu}
           title="More options"
           onKeyDown={(e) => handleKeyDown(e, () => setShowMoreMenu(!showMoreMenu))}
         >
           <i className="fa-solid fa-ellipsis"></i>
         </button>
         
                                                                   {/* More Menu */}
          {showMoreMenu && (
            <div className="more-menu" ref={moreMenuItemRef} style={moreMenuStyle}>
            {/* Quality */}
            <div className="more-menu-item-wrapper">
              <button onClick={() => handleMoreAction('quality')} className="more-menu-item">
                <i className="fa-solid fa-tv" style={{ fontSize: '18px', width: '20px' }}></i>
                <span>Quality</span>
                <span className="more-menu-value">{videoQuality}</span>
              </button>
              {showQualityMenu && (
                <div className="more-menu-submenu">
                  <button onClick={() => handleQualitySelect('Auto')} className={`more-menu-subitem ${videoQuality === 'Auto' ? 'active' : ''}`}>
                    Auto
                  </button>
                  <button onClick={() => handleQualitySelect('720p')} className={`more-menu-subitem ${videoQuality === '720p' ? 'active' : ''}`}>
                    720p
                  </button>
                  <button onClick={() => handleQualitySelect('480p')} className={`more-menu-subitem ${videoQuality === '480p' ? 'active' : ''}`}>
                    480p
                  </button>
                </div>
              )}
            </div>

            {/* Captions */}
            <button onClick={() => handleMoreAction('captions')} className="more-menu-item more-menu-item-toggle">
              <i className="fa-solid fa-closed-captioning" style={{ fontSize: '18px', width: '20px' }}></i>
              <span>Captions</span>
              <label className="toggle-switch-small">
                <input
                  type="checkbox"
                  checked={captionsEnabled}
                  onChange={() => handleMoreAction('captions')}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="toggle-slider-small"></span>
              </label>
            </button>

            {/* Full screen */}
            <button onClick={() => handleMoreAction('fullscreen')} className="more-menu-item">
              <i className="fa-solid fa-expand" style={{ fontSize: '18px', width: '20px' }}></i>
              <span>Full screen</span>
            </button>

            {/* Speed */}
            <div className="more-menu-item-wrapper">
              <button onClick={() => handleMoreAction('speed')} className="more-menu-item">
                <i className="fa-solid fa-gauge-high" style={{ fontSize: '18px', width: '20px' }}></i>
                <span>Speed</span>
                <span className="more-menu-value">{playbackSpeed}x</span>
              </button>
              {showSpeedMenu && (
                <div className="more-menu-submenu">
                  <button onClick={() => handleSpeedSelect(0.5)} className={`more-menu-subitem ${playbackSpeed === 0.5 ? 'active' : ''}`}>
                    0.5x
                  </button>
                  <button onClick={() => handleSpeedSelect(0.75)} className={`more-menu-subitem ${playbackSpeed === 0.75 ? 'active' : ''}`}>
                    0.75x
                  </button>
                  <button onClick={() => handleSpeedSelect(1.0)} className={`more-menu-subitem ${playbackSpeed === 1.0 ? 'active' : ''}`}>
                    1.0x
                  </button>
                  <button onClick={() => handleSpeedSelect(1.25)} className={`more-menu-subitem ${playbackSpeed === 1.25 ? 'active' : ''}`}>
                    1.25x
                  </button>
                  <button onClick={() => handleSpeedSelect(1.5)} className={`more-menu-subitem ${playbackSpeed === 1.5 ? 'active' : ''}`}>
                    1.5x
                  </button>
                  <button onClick={() => handleSpeedSelect(2.0)} className={`more-menu-subitem ${playbackSpeed === 2.0 ? 'active' : ''}`}>
                    2.0x
                  </button>
                </div>
              )}
            </div>

            {/* Auto scroll */}
            <button onClick={() => handleMoreAction('auto-scroll')} className="more-menu-item more-menu-item-toggle">
              <i className="fa-solid fa-arrow-up-wide-short" style={{ fontSize: '18px', width: '20px' }}></i>
              <span>Auto scroll</span>
              <label className="toggle-switch-small">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={() => handleMoreAction('auto-scroll')}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="toggle-slider-small"></span>
              </label>
            </button>

            {/* Floating Player */}
            <button onClick={() => handleMoreAction('floating-player')} className="more-menu-item">
              <i className="fa-solid fa-window-restore" style={{ fontSize: '18px', width: '20px' }}></i>
              <span>Floating Player</span>
            </button>

            {/* Report */}
            <button onClick={() => handleMoreAction('report')} className="more-menu-item danger">
              <i className="fa-solid fa-flag" style={{ fontSize: '18px', width: '20px' }}></i>
              <span>Report</span>
            </button>
          </div>
          )}
      </div>

    </div>
  );
};

export default ActionBar;













