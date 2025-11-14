import React, { useRef, useEffect, useCallback, useState, memo } from 'react';
import VideoCard from './VideoCard';
import CommentsModal from './CommentsModal';
import DuetComponent from './DuetComponent';
import StitchComponent from './StitchComponent';
import { useVideoStore } from '../store/videoStore';
import { useWatchHistory } from '../context/WatchHistoryContext';
import { toggleFollow } from '../api/videos';
import type { VideoData } from '../App';
import './ForYouFeed.css';

interface VideoItem {
  id: string;
  src: string;
  poster?: string;
  profileImg?: string;
  username?: string;
  description?: string;
  song?: string;
  video?: VideoData | Record<string, unknown>;
  likes?: number;
  comments?: number;
  shares?: number;
  isLiked?: boolean;
}

interface ForYouFeedProps {
  items: VideoItem[];
}

interface VideoMetrics {
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
}

const ForYouFeed: React.FC<ForYouFeedProps> = ({ items }) => {
  const { activeId, setActiveId } = useVideoStore();
  const { recordWatch } = useWatchHistory();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intersectionMapRef = useRef<Map<string, number>>(new Map());
  const activeIdRef = useRef<string | undefined>(activeId);
  const [preloadMap, setPreloadMap] = useState<Map<string, "none" | "metadata">>(new Map());                                                                    
  const [showComments, setShowComments] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);    
  const [currentVideoOwner, setCurrentVideoOwner] = useState<string | null>(null);
  const [showDuet, setShowDuet] = useState(false);
  const [showStitch, setShowStitch] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [videoReactions, setVideoReactions] = useState<Map<string, any>>(new Map());
  const [videoStats, setVideoStats] = useState<Record<string, VideoMetrics>>({});
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Update ref when activeId changes (for comparison inside callback)
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Debounced function to update active video - optimized to prevent infinite loops
  const updateActiveVideo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Find the card with highest intersection ratio >= 0.6
      let maxRatio = 0;
      let newActiveId: string | undefined;
      let fallbackMaxRatio = 0;
      let fallbackId: string | undefined;

      intersectionMapRef.current.forEach((ratio, id) => {
        if (ratio >= 0.6 && ratio > maxRatio) {
          maxRatio = ratio;
          newActiveId = id;
        }
        // Track highest ratio as fallback if none meet threshold
        if (ratio > fallbackMaxRatio) {
          fallbackMaxRatio = ratio;
          fallbackId = id;
        }
      });

      // If no card meets 0.6 threshold, use the one with highest intersection
      if (!newActiveId && fallbackId) {
        newActiveId = fallbackId;
      }

      // Only update if changed (use ref to avoid dependency on activeId)
      const currentActiveId = activeIdRef.current;
      if (newActiveId && newActiveId !== currentActiveId) {
        activeIdRef.current = newActiveId;
        setActiveId(newActiveId);
        
        // Update preload map: active ±1 get metadata, others get none
        const newPreloadMap = new Map<string, "none" | "metadata">();
        const activeIndex = items.findIndex(item => item.id === newActiveId);
        
        items.forEach((item, index) => {
          const distance = Math.abs(index - activeIndex);
          if (distance <= 1) {
            newPreloadMap.set(item.id, "metadata");
          } else {
            newPreloadMap.set(item.id, "none");
          }
        });
        
        setPreloadMap(newPreloadMap);
      }
    }, 100); // Optimized: 100ms debounce for better responsiveness
  }, [setActiveId, items]); // Removed activeId from dependencies - using ref instead

  // Set up IntersectionObserver for all video cards
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cardId = entry.target.getAttribute('data-video-id');
          if (cardId) {
            const ratio = entry.intersectionRatio;
            intersectionMapRef.current.set(cardId, ratio);
          }
        });
        
        // Update active video after processing all entries
        updateActiveVideo();
      },
      {
        // Optimized thresholds - fewer checks for better performance (reduced from 11 to 4)
        threshold: [0, 0.3, 0.6, 1.0],
        rootMargin: '0px',
      }
    );

    // Observe all cards
    cardRefs.current.forEach((card) => {
      if (observerRef.current) {
        observerRef.current.observe(card);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [items, updateActiveVideo]);

  // Set initial active video (first visible one) - only once
  useEffect(() => {
    if (items.length > 0 && !activeId) {
      // Set first video as active by default
      const firstId = items[0].id;
      activeIdRef.current = firstId;
      setActiveId(firstId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]); // Only depend on items - run once when items change

  // Register card refs
  const setCardRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      cardRefs.current.set(id, element);
      element.setAttribute('data-video-id', id);
      
      // Observe immediately if observer exists
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  // Initialize preload map
  useEffect(() => {
    const initialPreloadMap = new Map<string, "none" | "metadata">();
    const activeIndex = activeId ? items.findIndex(item => item.id === activeId) : 0;
    
    items.forEach((item, index) => {
      const distance = Math.abs(index - activeIndex);
      if (distance <= 1) {
        initialPreloadMap.set(item.id, "metadata");
      } else {
        initialPreloadMap.set(item.id, "none");
      }
    });
    
    setPreloadMap(initialPreloadMap);
  }, [items, activeId]);

  const getItemById = useCallback(
    (id: string): VideoItem | undefined => items.find((item) => item.id === id),
    [items]
  );

  const resolveCreatorKey = useCallback(
    (item?: VideoItem | null): string | undefined => {
      if (!item) return undefined;
      const videoData = (item.video ?? {}) as VideoData;
      const candidateUser = (videoData.user ??
        (videoData as Record<string, unknown>)['creator'] ??
        (videoData as Record<string, unknown>)['owner']) as
        | string
        | Record<string, unknown>
        | undefined;

      if (typeof candidateUser === 'string' && candidateUser.trim().length > 0) {
        return candidateUser;
      }

      if (candidateUser && typeof candidateUser === 'object') {
        const userRecord = candidateUser as Record<string, unknown>;
        const maybeId =
          userRecord['_id'] ??
          userRecord['id'] ??
          userRecord['username'] ??
          userRecord['handle'];
        if (maybeId) {
          return String(maybeId);
        }
      }

      const derivedUsername =
        item.username ??
        (videoData.user as { username?: string } | undefined)?.username ??
        ((videoData as Record<string, unknown>)['creator'] as { username?: string } | undefined)?.username ??
        ((videoData as Record<string, unknown>)['channel'] as string | undefined);

      if (derivedUsername) {
        return String(derivedUsername);
      }

      return item.id;
    },
    []
  );

  const deriveMetricsFromItem = useCallback((item?: VideoItem | null): VideoMetrics => {
    const videoData = (item?.video ?? {}) as VideoData & Record<string, unknown>;
    return {
      likes:
        typeof item?.likes === 'number'
          ? item.likes
          : ((videoData as Record<string, unknown>)['likes'] as number | undefined) ?? 0,
      comments:
        typeof item?.comments === 'number'
          ? item.comments
          : ((videoData as Record<string, unknown>)['comments'] as number | undefined) ?? 0,
      shares:
        typeof item?.shares === 'number'
          ? item.shares
          : ((videoData as Record<string, unknown>)['shares'] as number | undefined) ?? 0,
      isLiked:
        typeof item?.isLiked === 'boolean'
          ? item.isLiked
          : ((videoData as Record<string, unknown>)['isLiked'] as boolean | undefined) ?? false
    };
  }, []);

  const getCreatorId = useCallback(
    (item?: VideoItem | null): string | undefined => resolveCreatorKey(item),
    [resolveCreatorKey]
  );

  useEffect(() => {
    setVideoStats((prev) => {
      const next: Record<string, VideoMetrics> = {};
      items.forEach((item) => {
        next[item.id] = prev[item.id] ?? deriveMetricsFromItem(item);
      });
      return next;
    });
  }, [items, deriveMetricsFromItem]);

  useEffect(() => {
    setFollowedUsers((prev) => {
      const next = new Set(prev);
      items.forEach((item) => {
        const creatorKey = resolveCreatorKey(item);
        if (!creatorKey) return;
        const videoData = (item.video ?? {}) as VideoData & Record<string, unknown>;
        const userRecord = (videoData.user ?? {}) as Record<string, unknown>;
        const defaultFollow =
          (videoData as Record<string, unknown>)['isFollowing'] ??
          (videoData as Record<string, unknown>)['isFollowed'] ??
          (videoData as Record<string, unknown>)['following'] ??
          userRecord['isFollowing'] ??
          false;
        if (defaultFollow) {
          next.add(creatorKey);
        }
      });
      return next;
    });
  }, [items, resolveCreatorKey]);

  const updateStats = useCallback(
    (videoId: string, updates: Partial<VideoMetrics>) => {
      setVideoStats((prev) => {
        const base = prev[videoId] ?? deriveMetricsFromItem(getItemById(videoId));
        return {
          ...prev,
          [videoId]: {
            ...base,
            ...updates
          }
        };
      });
    },
    [deriveMetricsFromItem, getItemById]
  );

  const handleComment = (id: string) => {
    const video = getItemById(id);
    setCurrentVideoId(id);
    const videoData = (video?.video ?? {}) as VideoData & Record<string, unknown>;
    const videoUser = (videoData.user ?? {}) as Record<string, unknown>;
    setCurrentVideoOwner(
      video?.username || (videoUser['username'] as string | undefined) || null
    );
    setShowComments(true);
  };

  const handleFollow = async (id: string) => {
    const item = getItemById(id);
    if (!item) return;

    const creatorKey = resolveCreatorKey(item) ?? id;
    const isLocalOnly =
      ((item.video as VideoData | undefined)?.__source ?? 'api') === 'sample';

    const wasFollowing = followedUsers.has(creatorKey);
    const toggleLocal = (value: boolean) => {
      setFollowedUsers((prev) => {
        const next = new Set(prev);
        if (value) {
          next.add(creatorKey);
        } else {
          next.delete(creatorKey);
        }
        return next;
      });
    };

    const optimisticNext = !wasFollowing;
    toggleLocal(optimisticNext);

    if (isLocalOnly) {
      return;
    }

    try {
      const response = await toggleFollow(creatorKey);
      const nextIsFollowing =
        response?.isFollowing ??
        response?.following ??
        response?.data?.isFollowing ??
        optimisticNext;
      toggleLocal(nextIsFollowing);
    } catch (error) {
      console.error('Error following user:', error);
      toggleLocal(wasFollowing);
    }
  };

  const handleLikeUpdate = useCallback(
    (videoId: string, payload: { isLiked: boolean; likes: number }) => {
      updateStats(videoId, { isLiked: payload.isLiked, likes: payload.likes });
    },
    [updateStats]
  );

  const handleShareUpdate = useCallback(
    (videoId: string, payload: { shares: number }) => {
      updateStats(videoId, { shares: payload.shares });
    },
    [updateStats]
  );

  const handleCommentCountChange = useCallback(
    (videoId: string | null, total: number) => {
      if (!videoId) return;
      updateStats(videoId, { comments: total });
    },
    [updateStats]
  );

  useEffect(() => {
    if (!activeId || typeof recordWatch !== 'function') {
      return;
    }
    const activeItem = getItemById(activeId);
    if (!activeItem) {
      return;
    }

    const videoData = (activeItem.video ?? {}) as VideoData & Record<string, unknown>;
    const hashtagsRaw =
      (videoData as Record<string, unknown>)['hashtags'] ??
      (videoData as Record<string, unknown>)['tags'] ??
      [];
    const hashtags = Array.isArray(hashtagsRaw) ? hashtagsRaw : [];
    const category =
      ((videoData as Record<string, unknown>)['category'] as string | undefined) ||
      (Array.isArray(hashtags) && hashtags[0]) ||
      ((videoData as Record<string, unknown>)['genre'] as string | undefined) ||
      'general';
    const creator =
      ((videoData.user as Record<string, unknown> | undefined)?.['username'] as string | undefined) ||
      (((videoData as Record<string, unknown>)['creator'] as Record<string, unknown> | undefined)?.['username'] as
        | string
        | undefined) ||
      activeItem.username ||
      ((videoData as Record<string, unknown>)['channel'] as string | undefined) ||
      '';

    try {
      recordWatch(activeId, {
        hashtags,
        category,
        creator,
        description:
          ((videoData as Record<string, unknown>)['description'] as string | undefined) ||
          activeItem.description ||
          '',
      });
    } catch (error) {
      console.warn('Failed to record watch history:', error);
    }
  }, [activeId, getItemById, recordWatch]);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = setTimeout(() => setSaveMessage(null), 2000);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  const handleSave = (id: string, saved: boolean) => {
    setSaveMessage(saved ? 'Added to Watch Later' : 'Removed from Watch Later');
  };

  const handleDuet = (id: string) => {
    const video = getItemById(id);
    if (video) {
      setCurrentVideo(video);
      setShowDuet(true);
    }
  };

  const handleStitch = (id: string) => {
    const video = getItemById(id);
    if (video) {
      setCurrentVideo(video);
      setShowStitch(true);
    }
  };

  const handleReact = (id: string, reaction: any) => {
    setVideoReactions(prev => {
      const newMap = new Map(prev);
      if (reaction) {
        newMap.set(id, reaction);
      } else {
        newMap.delete(id);
      }
      return newMap;
    });
  };

  const handleDuetComplete = (duetData: any) => {
    console.log('Duet created:', duetData);
    // Here you would typically upload the duet to your backend
    alert('Duet created successfully!');
    setShowDuet(false);
    setCurrentVideo(null);
  };

  const handleStitchComplete = (stitchData: any) => {
    console.log('Stitch created:', stitchData);
    // Here you would typically upload the stitch to your backend
    alert('Stitch created successfully!');
    setShowStitch(false);
    setCurrentVideo(null);
  };

  // Handle empty items case
  if (!items || items.length === 0) {
    return (
      <div className="for-you-feed" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        No videos available
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="for-you-feed">
        {saveMessage && (
          <div className="for-you-feed-toast" role="status">
            {saveMessage}
          </div>
        )}
        {items.map((item) => {
          const metrics = videoStats[item.id] ?? deriveMetricsFromItem(item);
          const creatorId = getCreatorId(item);
          const itemVideo = (item.video ?? item) as VideoData & Record<string, unknown>;
          const isFollowing = creatorId ? followedUsers.has(creatorId) : false;
          const interactionMode: 'api' | 'local' =
            ((item.video as VideoData | undefined)?.__source ?? 'api') === 'sample'
              ? 'local'
              : 'api';
          const savesCountValue =
            (itemVideo['saves'] as number | undefined) ??
            (itemVideo['bookmarks'] as number | undefined) ??
            0;

          return (
            <div
              key={item.id}
              ref={(el) => setCardRef(item.id, el)}
              className="for-you-feed-card"
            >
              <VideoCard
                id={item.id}
                src={item.src}
                poster={item.poster}
                preload={preloadMap.get(item.id) || 'none'}
                profileImg={item.profileImg}
                username={item.username}
                description={item.description}
                song={item.song}
                video={itemVideo}
                currentReaction={videoReactions.get(item.id) || null}
                onLike={handleLikeUpdate}
                onComment={handleComment}
                onShare={handleShareUpdate}
                onFollow={handleFollow}
                onSave={handleSave}
                onDuet={handleDuet}
                onStitch={handleStitch}
                onReact={handleReact}
                isLiked={metrics.isLiked}
                isFollowing={isFollowing}
                likesCount={metrics.likes}
                commentsCount={metrics.comments}
                sharesCount={metrics.shares}
                savesCount={savesCountValue}
                interactionMode={interactionMode}
              />
            </div>
          );
        })}
      </div>

      {/* Comments Modal */}
      {showComments && currentVideoId && (
        <CommentsModal
          videoId={currentVideoId}
          videoOwner={currentVideoOwner || undefined}
          onCommentCountChange={(count: number) => handleCommentCountChange(currentVideoId, count)}
          onClose={() => {
            setShowComments(false);
            setCurrentVideoId(null);
            setCurrentVideoOwner(null);
          }}
        />
      )}

      {/* Duet Modal */}
      {showDuet && currentVideo && (
        <DuetComponent
          video={currentVideo}
          onClose={() => {
            setShowDuet(false);
            setCurrentVideo(null);
          }}
          onComplete={handleDuetComplete}
        />
      )}

      {/* Stitch Modal */}
      {showStitch && currentVideo && (
        <StitchComponent
          video={currentVideo}
          onClose={() => {
            setShowStitch(false);
            setCurrentVideo(null);
          }}
          onComplete={handleStitchComplete}
        />
      )}
    </>
  );
};

const MemoizedForYouFeed = memo(ForYouFeed);
MemoizedForYouFeed.displayName = 'ForYouFeed';

export default MemoizedForYouFeed;














