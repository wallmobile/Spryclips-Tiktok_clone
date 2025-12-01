import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrendingHashtags } from '../api/hashtags';
import { getTrendingVideos } from '../api/recommendations';
import { videos as sampleVideos } from '../data/sampleData';
import useOverlayPage from '../hooks/useOverlayPage';
import SearchPage from './SearchPage';
import './Explore.css';
import './Profile.css'; // Import for video modal styles

const DEFAULT_FILTERS = [
  { id: 'all', label: 'All', icon: 'fa-fire', contentType: 'all' },
  { id: 'trending', label: 'Trending', icon: 'fa-chart-line', contentType: 'video' },
  { id: 'music', label: 'Music', icon: 'fa-music', contentType: 'video' },
  { id: 'dance', label: 'Dance', icon: 'fa-person-running', contentType: 'video' },
  { id: 'comedy', label: 'Comedy', icon: 'fa-face-laugh', contentType: 'video' },
  { id: 'sports', label: 'Sports', icon: 'fa-medal', contentType: 'video' },
  { id: 'fashion', label: 'Fashion', icon: 'fa-shirt', contentType: 'video' },
  { id: 'food', label: 'Food', icon: 'fa-utensils', contentType: 'video' }
];

const formatSampleDuration = (seconds) => {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const toSeconds = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
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
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  }
  return null;
};

const formatCategoryLabel = (value, suffix = '') => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return suffix ? `Explore ${suffix}` : 'Explore';
  }
  const base = value
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return suffix ? `${base} ${suffix}` : base;
};

const SAMPLE_EXPLORE_VIDEOS = sampleVideos.map((video, index) => {
  const hashtags = Array.isArray(video.hashtags) ? video.hashtags : [];
  const firstHashtag = hashtags[0] || video.channel || 'trending';
  const rawDuration = Math.max(15, Math.floor(Math.random() * 45) + 15);
  const playbackUrl = video.videoUrl || video.url || '';
  const category =
    typeof video.category === 'string' && video.category.length > 0
      ? video.category.toLowerCase()
      : typeof firstHashtag === 'string'
      ? firstHashtag.replace(/^#/, '').toLowerCase()
      : 'general';
  const channel =
    typeof video.channel === 'string'
      ? video.channel
      : video.username
      ? `@${String(video.username).replace(/^@/, '')}`
      : '@creator';

  return {
    id: video.id ?? `sample-${index}`,
    thumbnail:
      video.thumbnail ||
      `https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600&auto=format&fit=crop&q=80&ixid=Mnwx${index}`,
    views: video.views ?? Math.round(Math.random() * 100_000) + 10_000,
    duration: formatSampleDuration(rawDuration),
    rawDuration,
    playbackUrl,
    url: playbackUrl,
    avatar:
      video.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.replace(/^@/, ''))}&background=2563EB&color=fff`,
    channel,
    description: video.description || '',
    likes: video.likes ?? Math.round(Math.random() * 50_000),
    comments: video.comments ?? Math.round(Math.random() * 5_000),
    shares: video.shares ?? Math.round(Math.random() * 2_000),
    hashtag: `#${String(firstHashtag).replace(/^#/, '')}`,
    category,
    __source: 'sample'
  };
});

const SAMPLE_HASHTAGS = SAMPLE_EXPLORE_VIDEOS.slice(0, 12).map((video) => ({
  name: video.hashtag.replace(/^#/, ''),
  viewCount: video.views
}));

const Explore = ({ onClose = () => {}, mode = 'overlay' }) => {
  const navigate = useNavigate();
  const isOverlay = mode === 'overlay';
  const [activeFilter, setActiveFilter] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [videos, setVideos] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [error, setError] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activePlayback, setActivePlayback] = useState({ duration: 0, currentTime: 0 });
  const [playerError, setPlayerError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRefs = useRef({});

  const resetPlayerState = useCallback(() => {
    setActiveVideoId(null);
    setActivePlayback({ duration: 0, currentTime: 0 });
    setPlayerError(null);
  }, []);

  const ensureAbsoluteUrl = useCallback((input) => {
    if (!input) {
      return '';
    }
    const trimmed = input.trim();
    if (/^(https?:)?\/\//i.test(trimmed)) {
      if (/^\/\//.test(trimmed)) {
        const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
        return `${protocol}${trimmed}`;
      }
      return trimmed;
    }
    if (/^(data:|blob:)/i.test(trimmed)) {
      return trimmed;
    }
    const base =
      process.env.REACT_APP_API_URL ||
      (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = trimmed.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }, []);

  useOverlayPage(onClose, { bodyClass: 'explore-page-open', enabled: isOverlay });

  const formatDuration = useCallback((duration) => {
    if (!duration && duration !== 0) return '0:00';

    if (typeof duration === 'string') {
      const normalized = duration.trim();
      if (/^\d{1,2}:\d{2}$/.test(normalized)) {
        const [mm, ss] = normalized.split(':').map((value) => Number.parseInt(value, 10));
        if (Number.isFinite(mm) && Number.isFinite(ss)) {
          return `${mm}:${ss.toString().padStart(2, '0')}`;
        }
      }
    }

    const totalSeconds = Math.round(Number(duration));
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      return '0:00';
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const normalizeVideo = useCallback(
    (video) => {
      if (!video) return null;
      const stats = video.stats || {};
      const hashtags = video.hashtags || video.tags || [];
      const firstHashtag = hashtags.length ? hashtags[0] : video.primaryHashtag;
      const durationCandidates = [
        video.duration,
        video.lengthInSeconds,
        stats.duration,
        video?.transcoded?.duration,
        video?.metadata?.duration,
        typeof video?.cropSettings?.endTime === 'number' && typeof video?.cropSettings?.startTime === 'number'
          ? Number(video.cropSettings.endTime) - Number(video.cropSettings.startTime)
          : null
      ];

      const rawDuration =
        durationCandidates.reduce((acc, candidate) => {
          if (acc !== null) {
            return acc;
          }
          const seconds = toSeconds(candidate);
          if (seconds !== null && seconds > 0) {
            return seconds;
          }
          return acc;
        }, null) ?? null;
      const playbackUrl =
        video.playbackUrl ||
        video.videoUrl ||
        video.url ||
        video?.transcoded?.playbackUrl ||
        video?.assets?.playbackUrl ||
        '';
      const userInfo = video.user || video.owner || {};
      const username =
        typeof video.channel === 'string'
          ? video.channel
          : userInfo.username
          ? `@${String(userInfo.username).replace(/^@/, '')}`
          : '@creator';

      const avatar =
        video.avatar ||
        userInfo.profile?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username.replace(/^@/, ''))}&background=FF0050&color=fff`;

      const normalizedCategory =
        typeof video.category === 'string' && video.category.trim().length > 0
          ? video.category.trim().toLowerCase()
          : firstHashtag
          ? String(firstHashtag).replace(/^#/, '').toLowerCase()
          : 'general';

      return {
        id: video._id || video.id,
        thumbnail:
          video.thumbnail ||
          video.coverImage ||
          video.previewUrl ||
          video?.transcoded?.thumbnailUrl ||
          video?.assets?.thumbnail ||
          '',
        views: stats.views ?? video.views ?? 0,
        duration: formatDuration(rawDuration),
        rawDuration,
        playbackUrl,
        url: playbackUrl,
        avatar,
        channel: username,
        description: video.description || video.caption || '',
        likes: stats.likes ?? video.likes ?? 0,
        comments: stats.comments ?? video.comments ?? 0,
        shares: stats.shares ?? video.shares ?? 0,
        hashtag: firstHashtag ? `#${String(firstHashtag).replace(/^#/, '')}` : '',
        category: normalizedCategory,
        __source: 'api'
      };
    },
    [formatDuration]
  );

  const updateFiltersFromVideos = useCallback((videoList) => {
    if (!Array.isArray(videoList) || videoList.length === 0) {
      return;
    }

    setFilters((prev) => {
      const existingIds = new Set(prev.map((filter) => filter.id));
      const additions = [];

      videoList.forEach((video) => {
        if (!video?.category) {
          return;
        }
        const categoryId = String(video.category).toLowerCase();
        if (
          categoryId === 'all' ||
          categoryId === 'trending' ||
          categoryId === 'general' ||
          existingIds.has(categoryId)
        ) {
          return;
        }
        existingIds.add(categoryId);
        additions.push({
          id: categoryId,
          label: formatCategoryLabel(categoryId),
          icon: 'fa-hashtag',
          contentType: 'video'
        });
      });

      if (additions.length === 0) {
        return prev;
      }

      return [...prev, ...additions];
    });
  }, []);

  useEffect(() => {
    const loadHashtags = async () => {
      setLoadingHashtags(true);
      try {
        const response = await getTrendingHashtags(12);
        const list = Array.isArray(response?.hashtags)
          ? response.hashtags
          : Array.isArray(response)
          ? response
          : [];
        
        if (list && list.length > 0) {
          // Map backend hashtag format to frontend format
          const formattedHashtags = list.map(tag => ({
            id: tag.hashtag || tag._id || tag.id || tag.name,
            name: tag.hashtag || tag.name || tag.tag || '',
            count: tag.count || tag.videoCount || 0,
            views: tag.totalViews || 0,
            engagement: tag.engagement || 0
          })).filter(tag => tag.name && tag.name.trim().length > 0);
          
          if (formattedHashtags.length > 0) {
            setHashtags(formattedHashtags);
          } else {
            // No hashtags found - show empty
            setHashtags([]);
          }
        } else {
          // No hashtags found - show empty
          setHashtags([]);
        }
      } catch (err) {
        console.error('Error loading trending hashtags:', err);
        // On error, show empty instead of sample
        setHashtags([]);
      } finally {
        setLoadingHashtags(false);
      }
    };

    loadHashtags();
  }, []);

  const selectedFilter = useMemo(
    () => filters.find((filter) => filter.id === activeFilter),
    [filters, activeFilter]
  );

  useEffect(() => {
    const loadVideos = async () => {
      setLoadingVideos(true);
      setError(null);
      resetPlayerState();
      try {
        const params = { limit: 24 };
        if (selectedFilter?.contentType === 'video' || selectedFilter?.contentType === 'all') {
          params.contentType = selectedFilter?.contentType;
        }
        if (activeFilter !== 'all') {
          if (activeFilter === 'trending') {
            params.sort = 'trending';
          } else {
            params.category = activeFilter;
          }
        }
        const response = await getTrendingVideos(params);
        const list = Array.isArray(response?.videos)
          ? response.videos
          : Array.isArray(response)
          ? response
          : response?.data || [];
        
        if (list && list.length > 0) {
          const normalized = list.map(normalizeVideo).filter(Boolean);
          if (normalized.length > 0) {
            setVideos(normalized);
            updateFiltersFromVideos(normalized);
            return;
          }
        }
        
        // No videos found - show empty state
        console.log('No videos found from backend');
        setVideos([]);
        resetPlayerState();
        updateFiltersFromVideos([]);
      } catch (err) {
        console.error('Error loading explore videos:', err);
        // On error, show empty state instead of sample videos
        setVideos([]);
        resetPlayerState();
        updateFiltersFromVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    };

    loadVideos();
  }, [activeFilter, normalizeVideo, resetPlayerState, selectedFilter, updateFiltersFromVideos]);

  const formatCount = (count) => {
    if (typeof count !== 'number') return count || '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const sectionInfo = useMemo(() => {
    switch (activeFilter) {
      case 'music':
        return { icon: 'fa-music', title: 'Music Videos' };
      case 'dance':
        return { icon: 'fa-person-running', title: 'Dance Floor' };
      case 'comedy':
        return { icon: 'fa-face-laugh', title: 'Laugh Out Loud' };
      case 'sports':
        return { icon: 'fa-medal', title: 'Game Highlights' };
      case 'fashion':
        return { icon: 'fa-shirt', title: 'Fashion Trends' };
      case 'food':
        return { icon: 'fa-utensils', title: 'Food & Recipes' };
      case 'trending':
        return { icon: 'fa-chart-line', title: 'Trending Now' };
      case 'all':
        return { icon: 'fa-fire', title: 'For You' };
      default:
        return { icon: 'fa-hashtag', title: formatCategoryLabel(activeFilter, 'Spotlight') };
    }
  }, [activeFilter]);

  const handleVideoActivate = useCallback((video) => {
    if (!video) {
      return;
    }
    // Open video in modal instead of playing inline
    setSelectedVideo(video);
  }, []);

  const content = (
    <div
      className={`explore-container ${!isOverlay ? 'explore-container--page' : ''}`}
      onClick={(e) => {
        if (isOverlay) {
          e.stopPropagation();
        }
      }}
    >
      <div className="explore-header">
        {isOverlay && (
          <button className="explore-close-btn" onClick={onClose} aria-label="Close explore overlay">
            <i className="fa-solid fa-times"></i>
          </button>
        )}
        <h1>
          <i className="fa-solid fa-compass"></i> Explore
        </h1>
        <button 
          className="explore-search-btn" 
          type="button" 
          aria-label="Search"
          onClick={() => setShowSearch(true)}
        >
          <i className="fa-solid fa-search"></i>
        </button>
      </div>

      {error && (
        <div className="explore-banner" role="status">
          <i className="fa-solid fa-circle-info"></i>
          <span>{error}</span>
        </div>
      )}

      {playerError && (
        <div className="explore-banner explore-banner--warning" role="alert">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{playerError}</span>
        </div>
      )}

      <div className="explore-filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`explore-filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
            type="button"
          >
            <i className={`fa-solid ${filter.icon}`}></i>
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      <div className="explore-content">
        <div className="explore-section">
          <div className="section-header">
            <h2>
              <i className={`fa-solid ${sectionInfo.icon}`}></i> {sectionInfo.title}
            </h2>
          </div>
          <div className="explore-grid">
            {loadingVideos ? (
              <div className="explore-loading" role="status">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <p>Loading videos...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="explore-empty">
                <i className="fa-solid fa-video-slash"></i>
                <p>No videos available for this filter.</p>
              </div>
            ) : (
              videos.map((video) => {
                const isActive = activeVideoId === video.id;
                const rawVideoSrc = video.playbackUrl || video.url;
                const videoSrc = ensureAbsoluteUrl(rawVideoSrc);
                const resolvedDuration =
                  isActive && activePlayback.duration > 0
                    ? formatDuration(Math.max(activePlayback.duration - activePlayback.currentTime, 0))
                    : video.duration;
                const progressPercent =
                  isActive && activePlayback.duration > 0
                    ? Math.min(100, (activePlayback.currentTime / activePlayback.duration) * 100)
                    : 0;

                return (
                  <div
                    key={video.id}
                    className={`explore-video-card ${isActive ? 'explore-video-card--active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!isActive) {
                        handleVideoActivate(video);
                      }
                    }}
                    onKeyDown={(event) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !isActive) {
                        event.preventDefault();
                        handleVideoActivate(video);
                      }
                    }}
                  >
                    <div className="explore-thumbnail-wrapper">
                      {isActive && videoSrc ? (
                        <video
                          className="explore-inline-video"
                          src={videoSrc}
                          controls
                          autoPlay
                          muted={false}
                          playsInline
                          preload="metadata"
                          poster={ensureAbsoluteUrl(video.thumbnail || '')}
                          ref={(el) => {
                            if (el) {
                              videoRefs.current[video.id] = el;
                            }
                          }}
                          onLoadedMetadata={(event) => {
                            const metaDuration = event.currentTarget.duration;
                            if (Number.isFinite(metaDuration) && metaDuration > 0) {
                              setActivePlayback((prev) => ({
                                ...prev,
                                duration: metaDuration
                              }));
                            } else if (video.rawDuration > 0) {
                              setActivePlayback((prev) => ({
                                ...prev,
                                duration: video.rawDuration
                              }));
                            }
                            // Try to play video after metadata is loaded
                            const videoEl = event.currentTarget;
                            const playPromise = videoEl.play();
                            if (playPromise !== undefined) {
                              playPromise.catch((error) => {
                                console.warn('Video autoplay failed:', error);
                                // Autoplay failed, user can click play button
                              });
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
                          onPause={(event) => {
                            if (event.target.currentTime === 0 || event.target.currentTime === event.target.duration) {
                              return;
                            }
                          }}
                          onError={() => {
                            setPlayerError('We could not play this video. Please try another one.');
                            setActivePlayback({ duration: 0, currentTime: 0 });
                            setActiveVideoId(null);
                          }}
                          onEnded={() => {
                            setActivePlayback({ duration: 0, currentTime: 0 });
                            setActiveVideoId(null);
                          }}
                        />
                      ) : video.thumbnail ? (
                        <img
                          src={ensureAbsoluteUrl(video.thumbnail)}
                          alt={video.hashtag ? `${video.hashtag} video` : 'Explore video'}
                          className="explore-thumbnail"
                          loading="lazy"
                        />
                      ) : (
                        <div className="explore-thumbnail placeholder">
                          <i className="fa-solid fa-video"></i>
                        </div>
                      )}
                      {!isActive && (
                        <div className="explore-overlay-badge">
                          <i className="fa-solid fa-play"></i>
                        </div>
                      )}
                      <div className="explore-duration-badge">{resolvedDuration}</div>
                      {isActive && (
                        <div className="explore-progress">
                          <div className="explore-progress__bar" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      )}
                    </div>
                    <div className="explore-video-info">
                      <span className="explore-views">
                        <i className="fa-solid fa-eye"></i> {formatCount(video.views)}
                      </span>
                      <span className="explore-hashtag">{video.hashtag}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {activeFilter === 'all' && (
          <div className="explore-section">
            <div className="section-header">
              <h2>
                <i className="fa-solid fa-hashtag"></i> Trending Hashtags
              </h2>
            </div>
            <div className="hashtags-list">
              {loadingHashtags ? (
                <div className="explore-loading" role="status">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading hashtags...</p>
                </div>
              ) : hashtags.length === 0 ? (
                <div className="explore-empty">
                  <i className="fa-solid fa-hashtag"></i>
                  <p>No trending hashtags available right now.</p>
                </div>
              ) : (
                hashtags.map((tag, idx) => {
                  const tagName = tag?.name || tag?.tag || tag?.hashtag || tag;
                  const count = tag?.viewCount ?? tag?.views ?? tag?.videoCount ?? 0;
                  const label = String(tagName || '').replace(/^#/, '');
                  return (
                    <button key={`${label}-${idx}`} className="hashtag-chip" type="button">
                      #{label}
                      <span className="hashtag-count">{formatCount(count)}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Video Modal Component (same as Profile.js)
  const renderVideoModal = () => {
    if (!selectedVideo) return null;
    
    // Get the best available video URL (never use thumbnail for video playback)
    let videoSrc = null;
    
    // Priority 1: Check processedVideos array
    if (selectedVideo.processedVideos && Array.isArray(selectedVideo.processedVideos) && selectedVideo.processedVideos.length > 0) {
      const processedVideo = selectedVideo.processedVideos.find(pv => pv.url && !pv.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i));
      if (processedVideo && processedVideo.url) {
        videoSrc = processedVideo.url;
      }
    }
    
    // Priority 2: Check url field
    if (!videoSrc && selectedVideo.url) {
      videoSrc = selectedVideo.url;
    }
    
    // Priority 3: Check videoUrl or playbackUrl field
    if (!videoSrc && (selectedVideo.videoUrl || selectedVideo.playbackUrl)) {
      videoSrc = selectedVideo.videoUrl || selectedVideo.playbackUrl;
    }
    
    // Ensure absolute URL and verify it's a video file
    let finalVideoSrc = null;
    if (videoSrc) {
      const resolved = ensureAbsoluteUrl(videoSrc);
      // Only use if it's not an image file
      if (resolved && !resolved.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
        finalVideoSrc = resolved;
      }
    }
    
    return (
      <div className="video-viewer-modal" onClick={() => setSelectedVideo(null)}>
        <div className="video-viewer-content" onClick={(e) => e.stopPropagation()}>
          <button className="video-viewer-close" onClick={() => setSelectedVideo(null)}>
            <i className="fa-solid fa-times"></i>
          </button>
          <div className="video-viewer-container">
            {!finalVideoSrc || finalVideoSrc.trim() === '' ? (
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
            ) : (
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
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isOverlay) {
    return (
      <div className="explore-overlay" onClick={onClose} role="dialog" aria-modal="true">
        {content}
        {renderVideoModal()}
        {showSearch && (
          <SearchPage onClose={() => setShowSearch(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="explore-page">
      {content}
      {renderVideoModal()}
      {showSearch && (
        <SearchPage onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
};

export default Explore;