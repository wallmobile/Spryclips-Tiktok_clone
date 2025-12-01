import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllVideos, toggleFollow } from '../api/videos';
import { getFollowingFeed } from '../api/recommendations';
import api from '../config/axios';
import { videos as sampleVideos } from '../data/sampleData';
import './Following.css';
import './Profile.css'; // Import for video modal styles

const ABSOLUTE_MEDIA_REGEX = /^(?:https?:|data:|blob:)/i;

const getMediaBase = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  const configBase = window.APP_CONFIG?.API_URL;
  if (configBase) {
    return configBase;
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return window.location?.origin || '';
};

const toAbsoluteMediaUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }
  if (ABSOLUTE_MEDIA_REGEX.test(value)) {
    return value;
  }
  const base = getMediaBase();
  if (!base) {
    return value.startsWith('/') ? value : `/${value}`;
  }
  return `${base.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
};

const resolveVideoUrl = (video) => {
  if (!video || typeof video !== 'object') {
    return '';
  }

  const processedList = Array.isArray(video.processedVideos) ? video.processedVideos : [];
  const candidates = [
    video.playbackUrl,
    video.url,
    video.videoUrl,
    video.src,
    video.mediaUrl,
    video?.video?.url,
    video?.video?.videoUrl,
    processedList.length > 0 ? processedList[0]?.url : undefined
  ];

  for (const candidate of candidates) {
    const absolute = toAbsoluteMediaUrl(candidate);
    if (absolute) {
      return absolute;
    }
  }
  return '';
};

const buildAvatarUrl = (username, fallback) => {
  if (fallback) {
    return toAbsoluteMediaUrl(fallback);
  }
  if (!username) {
    return 'https://ui-avatars.com/api/?name=Creator&background=FF0050&color=fff';
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FF0050&color=fff`;
};

const getCreatorKey = (creator) => {
  if (!creator) {
    return '';
  }
  const raw = creator._id || creator.id || creator.userId || creator.username || creator.handle || '';
  return String(raw).toLowerCase();
};

const getCreatorTargetId = (creator) => {
  // Prioritize ObjectId format (_id or id)
  const id = creator?._id || creator?.id || creator?.userId;
  if (id) {
    let idString = '';
    // Convert to string
    if (typeof id === 'string') {
      idString = id;
    } else if (id && typeof id.toString === 'function') {
      idString = id.toString();
    } else {
      idString = String(id);
    }
    
    // Validate ObjectId format (24 hex characters)
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (objectIdPattern.test(idString)) {
      return idString;
    }
    // If not valid ObjectId, return null
    return null;
  }
  // Don't use username as fallback for follow API - it requires ObjectId
  return null;
};

const normalizeFollowingVideo = (video, index = 0) => {
  if (!video || typeof video !== 'object') {
    return null;
  }

  const playbackUrl = resolveVideoUrl(video);
  const candidateUser =
    video.user ||
    video.owner ||
    video.creator ||
    (video.video && (video.video.user || video.video.owner || video.video.creator)) ||
    {};

  const username =
    candidateUser.username ||
    video.username ||
    video.channel ||
    (candidateUser.profile && candidateUser.profile.displayName) ||
    `creator${index + 1}`;

  const profile = {
    ...(candidateUser.profile || {}),
    avatar: buildAvatarUrl(username, candidateUser.profile?.avatar || video.avatar),
    displayName: candidateUser.profile?.displayName || video.displayName || username
  };

  return {
    ...video,
    _id: video._id ?? video.id ?? `video-${index}`,
    playbackUrl,
    thumbnail: toAbsoluteMediaUrl(video.thumbnail || video.poster || ''),
    url: playbackUrl || video.url || video.videoUrl || '',
    user: {
      ...candidateUser,
      username,
      profile,
      displayName: candidateUser.displayName || profile.displayName || username
    }
  };
};

const RAW_FALLBACK_VIDEOS = sampleVideos.map((video, index) => {
  const username = (video.channel || video.user?.username || `creator${index + 1}`).replace(/^@/, '');
  return {
    _id: video.id ?? index + 1,
    url: video.videoUrl || video.url,
    thumbnail:
      video.thumbnail ||
      `https://images.unsplash.com/photo-1525182008055-f88b95ff7980?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.0.3&ixid=Mnwx` + index,
    user: {
      username,
      profile: {
        displayName: video.user?.profile?.displayName || username,
        avatar:
          video.user?.profile?.avatar ||
          video.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FF0050&color=fff`,
        isVerified: Boolean(video.user?.profile?.isVerified)
      }
    },
    views: video.views ?? 0,
    likes: video.likes ?? 0,
    comments: video.comments ?? 0,
    shares: video.shares ?? 0,
    description: video.description ?? 'Trending video from your favourite creators',
    duration: video.duration ?? Math.max(15, Math.floor(Math.random() * 45) + 15),
    isLive: Boolean(video.isLive),
    createdAt: new Date(),
    __source: 'sample'
  };
});

const FALLBACK_VIDEOS = RAW_FALLBACK_VIDEOS.map((video, index) => normalizeFollowingVideo(video, index)).filter(
  Boolean
);

const FALLBACK_CREATORS = FALLBACK_VIDEOS.reduce((acc, video) => {
  const handle = video.user?.username || 'creator';
  if (acc.has(handle)) {
    const existing = acc.get(handle);
    existing.videos.push({ _id: video._id, thumbnail: video.thumbnail });
    existing.profile.followers = Math.max(existing.profile.followers, video.views ?? 0);
    existing.isFollowing = existing.isFollowing ?? true;
    return acc;
  }
  acc.set(handle, {
    _id: `creator-${handle}`,
    username: handle,
    profile: {
      displayName: video.user?.profile?.displayName || handle,
      avatar: video.user?.profile?.avatar,
      bio: video.description?.slice(0, 80) || 'Content creator on TikTok Clone',
      followers: video.views ?? 0,
      isVerified: video.user?.profile?.isVerified ?? false
    },
    isFollowing: true,
    videos: [{ _id: video._id, thumbnail: video.thumbnail }]
  });
  return acc;
}, new Map());

const sampleCreatorList = Array.from(FALLBACK_CREATORS.values());

const Following = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [selectedTab, setSelectedTab] = useState('videos');
  const [followingVideos, setFollowingVideos] = useState([]);
  const [followingCreators, setFollowingCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activePlayback, setActivePlayback] = useState({ duration: 0, currentTime: 0 });
  const [playerError, setPlayerError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const playableVideosRef = useRef(new Map());
  const [followStates, setFollowStates] = useState({});
  const [pendingFollowIds, setPendingFollowIds] = useState({});

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    // Clear any error messages on mount
    setErrorMessage('');
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

  const syncFollowStates = useCallback((creatorsList) => {
    if (!Array.isArray(creatorsList)) {
      return;
    }
    setFollowStates((prev) => {
      let changed = false;
      const next = { ...prev };
      creatorsList.forEach((creator) => {
        const key = getCreatorKey(creator);
        if (!key) {
          return;
        }
        const isFollowing = creator.isFollowing ?? true;
        if (next[key] !== isFollowing) {
          next[key] = isFollowing;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const userFollowingIds = useMemo(() => {
    if (!user?.followedUsers) return [];
    return user.followedUsers.map((entry) => String(entry));
  }, [user?.followedUsers]);

  // Refresh creators when user context updates (after follow/unfollow)
  useEffect(() => {
    if (user && isAuthenticated) {
      const followedUsersCount = user.followedUsers?.length || 0;
      const profileFollowingCount = user.profile?.following || 0;
      
      console.log('🔄 User context updated in Following page:', {
        followedUsersCount,
        profileFollowingCount,
        hasFollowedUsers: !!user.followedUsers
      });
      
      const refreshCreators = async () => {
        try {
          console.log('🔄 Fetching following users from API...');
          const response = await api.get('/api/users/following');
          console.log('✅ Following API response:', response.data);
          
          if (response.data.success) {
            const following = response.data.following || [];
            console.log('📊 Following users count:', following.length);
            
            if (following.length > 0) {
              const followingUsers = following
                .filter(user => {
                  const userId = user._id || user.id;
                  if (!userId) return false;
                  const idString = typeof userId === 'string' ? userId : (userId.toString ? userId.toString() : String(userId));
                  return /^[0-9a-fA-F]{24}$/.test(idString);
                })
                .map(user => {
                  const userId = user._id || user.id;
                  return {
                    _id: userId,
                    id: userId,
                    username: user.username,
                    displayName: user.profile?.displayName || user.username,
                    avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=FF0050&color=fff`,
                    followers: user.profile?.followers || 0,
                    isFollowing: true,
                    profile: {
                      ...user.profile,
                      displayName: user.profile?.displayName || user.username,
                      avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=FF0050&color=fff`,
                      followers: user.profile?.followers || 0
                    }
                  };
                });
              
              console.log('✅ Setting following creators:', followingUsers.length);
              setFollowingCreators(followingUsers);
              syncFollowStates(followingUsers);
            } else {
              console.log('📭 No following users found');
              setFollowingCreators([]);
              syncFollowStates([]);
            }
          }
        } catch (error) {
          console.error('❌ Failed to refresh following users:', error);
        }
      };
      
      // Add small delay to ensure backend has updated
      const timeoutId = setTimeout(() => {
        refreshCreators();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user?.followedUsers?.length, user?.profile?.following, isAuthenticated]); // Watch both followedUsers count and profile.following

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        
        // Always try to fetch following videos from backend
        try {
          const response = await getFollowingFeed({ limit: 50 });
          if (response.success) {
            const videos = response.videos || [];
            if (videos.length > 0) {
              const normalizedVideos = videos
                .map((video, index) => normalizeFollowingVideo(video, index))
                .filter(Boolean);
              
              playableVideosRef.current.clear();
              setFollowingVideos(normalizedVideos);
              setLoading(false);
              return;
            } else {
              // No following videos - show empty state
              playableVideosRef.current.clear();
              setFollowingVideos([]);
              setLoading(false);
              return;
            }
          }
        } catch (feedError) {
          console.warn('Failed to fetch following feed:', feedError);
          // If user has following IDs but API failed, try fallback filtering
          if (userFollowingIds.length > 0) {
            try {
              const videos = await getAllVideos();
              if (Array.isArray(videos) && videos.length > 0) {
                const filtered = videos.filter((video) => {
                  const creatorId =
                    video.user?._id ||
                    video.user?.id ||
                    video.user?.username ||
                    video.user ||
                    video.channel;
                  return creatorId ? userFollowingIds.includes(String(creatorId)) : false;
                });
                
                if (filtered.length > 0) {
                  const normalizedVideos = filtered
                    .map((video, index) => normalizeFollowingVideo(video, index))
                    .filter(Boolean);
                  playableVideosRef.current.clear();
                  setFollowingVideos(normalizedVideos);
                  setLoading(false);
                  return;
                }
              }
            } catch (fallbackError) {
              console.warn('Fallback filtering also failed:', fallbackError);
            }
          }
          
          // No following users or all filters failed - show empty
          playableVideosRef.current.clear();
          setFollowingVideos([]);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.warn('Error loading following videos:', error);
        // Show empty state instead of fallback videos
        playableVideosRef.current.clear();
        setFollowingVideos([]);
        setLoading(false);
      }
    };

    const hydrateCreators = async () => {
      try {
        // Always fetch following users from backend (even if empty)
        const response = await api.get('/api/users/following');
        if (response.data.success) {
          const following = response.data.following || [];
          if (following.length > 0) {
            const followingUsers = following
              .filter(user => {
                // Only include users with valid ObjectIds
                const userId = user._id || user.id;
                if (!userId) return false;
                const idString = typeof userId === 'string' ? userId : (userId.toString ? userId.toString() : String(userId));
                return /^[0-9a-fA-F]{24}$/.test(idString);
              })
              .map(user => {
                const userId = user._id || user.id;
                return {
                  _id: userId,
                  id: userId,
                  username: user.username,
                  displayName: user.profile?.displayName || user.username,
                  avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=FF0050&color=fff`,
                  followers: user.profile?.followers || 0,
                  isFollowing: true,
                  profile: {
                    ...user.profile,
                    displayName: user.profile?.displayName || user.username,
                    avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=FF0050&color=fff`,
                    followers: user.profile?.followers || 0
                  }
                };
              });
            setFollowingCreators(followingUsers);
            syncFollowStates(followingUsers);
            return;
          } else {
            // No following users - show empty list
            setFollowingCreators([]);
            syncFollowStates([]);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch following users:', error);
        // If error, check if user has followedUsers in local state
        if (userFollowingIds.length > 0 && Array.isArray(user?.followingProfiles)) {
          setFollowingCreators(user.followingProfiles);
          syncFollowStates(user.followingProfiles);
          return;
        }
      }
      
      // Only show empty list if no following users
      setFollowingCreators([]);
      syncFollowStates([]);
    };

    bootstrap();
    hydrateCreators();
    
    // Listen for follow refresh events
    const handleFollowRefresh = async () => {
      console.log('🔄 Following page: Received follow:refresh event, refreshing creators...');
      
      // Add delay to ensure backend has saved
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing Following page after follow event...');
          const response = await api.get('/api/users/following');
          if (response.data.success) {
            const following = response.data.following || [];
            console.log('✅ Refreshed following users:', following.length);
            
            if (following.length > 0) {
              const followingUsers = following
                .filter(user => {
                  const userId = user._id || user.id;
                  if (!userId) return false;
                  const idString = typeof userId === 'string' ? userId : (userId.toString ? userId.toString() : String(userId));
                  return /^[0-9a-fA-F]{24}$/.test(idString);
                })
                .map(user => {
                  const userId = user._id || user.id;
                  return {
                    _id: userId,
                    id: userId,
                    username: user.username,
                    displayName: user.profile?.displayName || user.username,
                    avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=FF0050&color=fff`,
                    followers: user.profile?.followers || 0,
                    isFollowing: true,
                    profile: {
                      ...user.profile,
                      displayName: user.profile?.displayName || user.username,
                      avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=FF0050&color=fff`,
                      followers: user.profile?.followers || 0
                    }
                  };
                });
              setFollowingCreators(followingUsers);
              syncFollowStates(followingUsers);
            } else {
              setFollowingCreators([]);
              syncFollowStates([]);
            }
          }
        } catch (error) {
          console.error('❌ Error refreshing following after event:', error);
        }
      }, 800);
    };
    
    window.addEventListener('follow:refresh', handleFollowRefresh);
    
    return () => {
      window.removeEventListener('follow:refresh', handleFollowRefresh);
    };
  }, [userFollowingIds, user?.followingProfiles, syncFollowStates]);

  const parseDuration = (value) => {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value >= 0 ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d+:\d{2}$/.test(trimmed)) {
        const [mm, ss] = trimmed.split(':').map((part) => Number.parseInt(part, 10));
        if (Number.isFinite(mm) && Number.isFinite(ss)) {
          return mm * 60 + ss;
        }
      }
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric) && numeric >= 0) {
        return numeric;
      }
    }
    return null;
  };

  const formatDuration = (seconds = 0) => {
    const total = Math.max(0, Math.round(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (count = 0) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const resetPlayerState = useCallback(() => {
    setActiveVideoId(null);
    setActivePlayback({ duration: 0, currentTime: 0 });
    setPlayerError(null);
  }, []);

  const handleVideoClick = useCallback(
    (video, index = 0) => {
      if (!video) {
        return;
      }
      const normalized = normalizeFollowingVideo(video, index);
      // Open video in modal instead of playing inline
      setSelectedVideo(normalized);
    },
    []
  );

  const handleFollowButtonClick = useCallback(
    async (event, creator) => {
      event.stopPropagation();
      const key = getCreatorKey(creator);
      if (!key) {
        return;
      }

      if (!isAuthenticated) {
        setErrorMessage('Log in to follow creators to customise your feed.');
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      if (pendingFollowIds[key]) {
        return;
      }

      const targetId = getCreatorTargetId(creator);
      const isCurrentlyFollowing = followStates[key] ?? true;

      // Validate that we have a valid ObjectId before making API call
      if (!targetId) {
        console.warn('Cannot follow/unfollow: Creator does not have a valid ObjectId', creator);
        // Don't show error for invalid IDs - just silently ignore
        // This prevents error messages for sample data or invalid creators
        return;
      }

      // Double-check ObjectId format
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      if (!objectIdPattern.test(String(targetId))) {
        console.warn('Cannot follow/unfollow: Creator ID is not a valid ObjectId', { targetId, creator });
        // Don't show error - just silently ignore
        return;
      }

      setPendingFollowIds((prev) => ({ ...prev, [key]: true }));
      setErrorMessage(''); // Clear any previous errors

      try {
        await toggleFollow(targetId);

        setFollowStates((prev) => ({
          ...prev,
          [key]: !isCurrentlyFollowing
        }));

        setFollowingCreators((prev) =>
          prev.map((item) => {
            if (getCreatorKey(item) !== key) {
              return item;
            }
            const nextFollowers = Math.max(
              0,
              (item.profile?.followers ?? 0) + (isCurrentlyFollowing ? -1 : 1)
            );
            return {
              ...item,
              isFollowing: !isCurrentlyFollowing,
              profile: {
                ...item.profile,
                followers: nextFollowers
              }
            };
          })
        );
      } catch (error) {
        console.error('Failed to toggle follow state:', error);
        // Extract error message from response
        const errorMessage = error?.response?.data?.message || 
                            error?.response?.data?.userMessage ||
                            error?.message || 
                            'Unable to update follow status. Please try again.';
        
        // Suppress "Invalid user ID" errors completely - we already validated
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('invalid user id') || 
            lowerMessage.includes('invalid user') ||
            error?.response?.status === 400) {
          // For invalid user ID errors, just log and don't show to user
          console.warn('Invalid user ID error suppressed (already validated):', errorMessage);
          // Don't set error message at all
          return;
        }
        
        // Only show other errors
        setErrorMessage(errorMessage);
        setTimeout(() => setErrorMessage(''), 5000);
      } finally {
        setPendingFollowIds((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [followStates, isAuthenticated, pendingFollowIds]
  );

  const handleCreatorClick = (creator) => {
    const handle = creator.username || creator;
    window.location.href = `/@${handle.replace(/^@/, '')}`;
  };

  const header = (
    <div className="following-header">
      <h1>
        <i className="fa-solid fa-user-plus"></i> Following
      </h1>
      <div className="following-header-actions">
        <span className="following-header-count">
          {selectedTab === 'videos'
            ? `${formatCount(followingVideos.length)} videos`
            : `${formatCount(followingCreators.length)} creators`}
        </span>
        <button
          className="following-close"
          type="button"
          onClick={() => navigate('/', { replace: true })}
          aria-label="Close Following"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  );

  const tabs = (
    <div className="following-tabs">
      <button
        className={`following-tab-btn ${selectedTab === 'videos' ? 'active' : ''}`}
        onClick={() => setSelectedTab('videos')}
        type="button"
      >
        <i className="fa-solid fa-video"></i> Videos
      </button>
      <button
        className={`following-tab-btn ${selectedTab === 'creators' ? 'active' : ''}`}
        onClick={() => setSelectedTab('creators')}
        type="button"
      >
        <i className="fa-solid fa-users"></i> Creators
      </button>
    </div>
  );

  const content = (
    <div className="following-container following-container--page">
      {header}

      {!isAuthenticated && (
        <div className="following-empty-state">
          <i className="fa-solid fa-user-lock"></i>
          <h3>Log in to sync your feed</h3>
          <p>We will remember your favourite creators as soon as you sign in.</p>
        </div>
      )}

      {errorMessage && (
        <div className="following-banner" role="status">
          <i className="fa-solid fa-circle-info"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      {playerError && (
        <div className="following-banner following-banner--warning" role="alert">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{playerError}</span>
        </div>
      )}

      {tabs}

      <div className="following-content">
        {loading ? (
          <div className="following-loading" role="status">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Loading personalised picks…</p>
          </div>
        ) : selectedTab === 'videos' ? (
          followingVideos.length > 0 ? (
            <div className="following-videos-grid">
              {followingVideos.map((video, idx) => (
                <div
                  key={video._id || idx}
                  className="following-video-card"
                  onClick={() => handleVideoClick(video, idx)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter') handleVideoClick(video, idx);
                  }}
                >
                  {(() => {
                    const videoId = video._id || video.id;
                    const cached = playableVideosRef.current.get(videoId) || video;
                    const playbackUrl = cached.playbackUrl || cached.url || '';
                    const isActive = activeVideoId === videoId;
                    const baseDuration =
                      parseDuration(cached.rawDuration) ??
                      parseDuration(cached.duration) ??
                      parseDuration(video.duration) ??
                      0;
                    const resolvedDuration =
                      isActive && activePlayback.duration > 0
                        ? formatDuration(Math.max(activePlayback.duration - activePlayback.currentTime, 0))
                        : formatDuration(baseDuration);
                    const progressPercent =
                      isActive && activePlayback.duration > 0
                        ? Math.min(100, (activePlayback.currentTime / activePlayback.duration) * 100)
                        : 0;

                    return (
                      <div className={`following-thumbnail-wrapper ${isActive ? 'following-thumbnail-wrapper--active' : ''}`}>
                        {isActive && playbackUrl ? (
                          <video
                            className="following-inline-video"
                            src={playbackUrl}
                            controls
                            autoPlay
                            playsInline
                            poster={video.thumbnail || ''}
                            onLoadedMetadata={(event) => {
                              const metaDuration = event.currentTarget.duration;
                              if (Number.isFinite(metaDuration) && metaDuration > 0) {
                                setActivePlayback((prev) => ({
                                  ...prev,
                                  duration: metaDuration
                                }));
                              } else if (baseDuration > 0) {
                                setActivePlayback((prev) => ({
                                  ...prev,
                                  duration: baseDuration
                                }));
                              }
                            }}
                            onTimeUpdate={(event) => {
                              const current = event.currentTarget.currentTime;
                              if (Number.isFinite(current)) {
                                setActivePlayback((prev) => ({
                                  ...prev,
                                  currentTime: current
                                }));
                              }
                            }}
                            onEnded={resetPlayerState}
                            onError={() => {
                              setPlayerError('We could not play this video. Please try another one.');
                              resetPlayerState();
                            }}
                          />
                        ) : (
                          <img
                            src={video.thumbnail || video.url}
                            alt={video.description || `Video by ${video.user?.username || 'creator'}`}
                            className="following-thumbnail"
                            loading="lazy"
                          />
                        )}
                        {video.isLive && <div className="following-live-badge">LIVE</div>}
                        {!isActive && (
                          <div className="following-overlay-badge">
                            <i className="fa-solid fa-play"></i>
                          </div>
                        )}
                        <div className="following-video-duration">{resolvedDuration}</div>
                        {isActive && activePlayback.duration > 0 && (
                          <div className="following-progress">
                            <div className="following-progress__bar" style={{ width: `${progressPercent}%` }}></div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="following-video-details">
                    <div className="following-user-info">
                      <div className="following-avatar">
                        <img
                          src={video.user?.profile?.avatar}
                          alt={video.user?.username || 'creator avatar'}
                          loading="lazy"
                        />
                      </div>
                      <div className="following-user-text">
                        <div className="following-username-row">
                          <h4>@{video.user?.username || 'creator'}</h4>
                          {video.user?.profile?.isVerified && (
                            <i className="fa-solid fa-check-circle following-verified-badge"></i>
                          )}
                        </div>
                        <p className="following-caption">{video.description}</p>
                      </div>
                    </div>
                    <div className="following-stats" aria-label="Video stats">
                      <span>
                        <i className="fa-solid fa-eye"></i>
                        {formatCount(video.views)}
                      </span>
                      <span>
                        <i className="fa-solid fa-heart"></i>
                        {formatCount(video.likes)}
                      </span>
                      <span>
                        <i className="fa-solid fa-comment"></i>
                        {formatCount(video.comments)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="following-empty-state">
              <i className="fa-solid fa-video-slash"></i>
              <h3>No videos yet</h3>
              <p>Follow creators to populate this feed with fresh content.</p>
            </div>
          )
        ) : followingCreators.length > 0 ? (
          <div className="following-creators-list">
            {followingCreators.map((creator, idx) => {
              const creatorKey = getCreatorKey(creator) || String(idx);
              const isFollowing = followStates[creatorKey] ?? true;
              const isPending = Boolean(pendingFollowIds[creatorKey]);
              const hasValidId = Boolean(getCreatorTargetId(creator));

              return (
                <div
                  key={creator._id || idx}
                  className="following-creator-card"
                  onClick={() => handleCreatorClick(creator)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter') handleCreatorClick(creator);
                  }}
                >
                  <div className="following-creator-avatar">
                    <img
                      src={
                        creator.profile?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          creator.username || 'creator'
                        )}&background=FF0050&color=fff`
                      }
                      alt={creator.username || 'creator avatar'}
                      loading="lazy"
                    />
                  </div>
                  <div className="following-creator-info">
                    <div className="following-creator-name-row">
                      <h3>@{creator.username || 'creator'}</h3>
                      {creator.profile?.isVerified && (
                        <i className="fa-solid fa-check-circle following-verified-badge"></i>
                      )}
                    </div>
                    <p>{creator.profile?.bio || 'Content creator on TikTok Clone'}</p>
                    <div className="following-creator-stats">
                      <span>{formatCount(creator.profile?.followers || 0)} followers</span>
                      <span>•</span>
                      <span>{creator.videos?.length || 0} videos</span>
                    </div>
                  </div>
                  <button
                    className={`following-follow-btn ${
                      isFollowing ? 'following-follow-btn--active' : 'following-follow-btn--cta'
                    } ${!hasValidId ? 'following-follow-btn--disabled' : ''}`}
                    type="button"
                    onClick={(event) => handleFollowButtonClick(event, creator)}
                    disabled={isPending || !hasValidId}
                    aria-pressed={isFollowing}
                    title={!hasValidId ? 'This creator cannot be followed' : ''}
                  >
                    {isPending ? 'Updating...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="following-empty-state">
            <i className="fa-solid fa-user-plus"></i>
            <h3>No creators followed yet</h3>
            <p>Start following creators to see their stories here.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="following-page">
      {content}
      
      {/* Video Viewer Modal */}
      {selectedVideo && (
        <div className="video-viewer-modal" onClick={() => setSelectedVideo(null)}>
          <div className="video-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-viewer-close" onClick={() => setSelectedVideo(null)}>
              <i className="fa-solid fa-times"></i>
            </button>
            <div className="video-viewer-container">
              {(() => {
                // Get the best available video URL (never use thumbnail for video playback)
                let videoSrc = null;
                
                // Priority 1: Check processedVideos array
                if (selectedVideo.processedVideos && Array.isArray(selectedVideo.processedVideos) && selectedVideo.processedVideos.length > 0) {
                  const processedVideo = selectedVideo.processedVideos.find(pv => pv.url && !pv.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i));
                  if (processedVideo && processedVideo.url) {
                    videoSrc = processedVideo.url;
                  }
                }
                
                // Priority 2: Check playbackUrl field
                if (!videoSrc && selectedVideo.playbackUrl) {
                  videoSrc = selectedVideo.playbackUrl;
                }
                
                // Priority 3: Check url field
                if (!videoSrc && selectedVideo.url) {
                  videoSrc = selectedVideo.url;
                }
                
                // Priority 4: Check videoUrl field
                if (!videoSrc && selectedVideo.videoUrl) {
                  videoSrc = selectedVideo.videoUrl;
                }
                
                // Ensure absolute URL and verify it's a video file
                let finalVideoSrc = null;
                if (videoSrc) {
                  const resolved = toAbsoluteMediaUrl(videoSrc);
                  // Only use if it's not an image file
                  if (resolved && !resolved.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
                    finalVideoSrc = resolved;
                  }
                }
                
                if (!finalVideoSrc || finalVideoSrc.trim() === '') {
                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%', 
                      color: '#fff',
                      padding: '20px',
                      textAlign: 'center'
                    }}>
                      <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '16px', color: '#FF0050' }}></i>
                      <h3>Video Not Available</h3>
                      <p>This video cannot be loaded.</p>
                    </div>
                  );
                }
                
                return (
                  <video 
                    src={finalVideoSrc}
                    controls
                    autoPlay
                    playsInline
                    className="video-viewer-player"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      background: '#000000',
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.error('Video playback error:', e.target.error);
                      console.error('Video URL attempted:', finalVideoSrc);
                    }}
                    onLoadedData={() => {
                      console.log('Video loaded successfully:', finalVideoSrc);
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Following;














