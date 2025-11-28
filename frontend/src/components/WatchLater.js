import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from './OptimizedImage';
import './WatchLater.css';
import { useLibraryStore, toLibraryVideo } from '../store/libraryStore';
import { useAuth } from '../context/AuthContext';
import {
  getWatchLater as fetchWatchLater,
  removeFromWatchLater as removeFromWatchLaterApi,
  clearWatchLater as clearWatchLaterApi
} from '../api/collections';

const WatchLater = () => {
  const { isAuthenticated } = useAuth();
  const watchLater = useLibraryStore((state) => state.watchLater);
  const initialized = useLibraryStore((state) => state.initialized);
  const hydrate = useLibraryStore((state) => state.hydrate);
  const setWatchLater = useLibraryStore((state) => state.setWatchLater);
  const removeFromWatchLater = useLibraryStore((state) => state.removeFromWatchLater);
  const navigate = useNavigate();
  const videoRefs = useRef({});

  const [loadingRemote, setLoadingRemote] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activePlayback, setActivePlayback] = useState({ duration: 0, currentTime: 0 });
  const [removingIds, setRemovingIds] = useState({});
  const [isClearing, setIsClearing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

  const loadWatchLater = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoadingRemote(true);
    try {
      const response = await fetchWatchLater();
      const entries = Array.isArray(response)
        ? response
        : Array.isArray(response?.watchLater)
        ? response.watchLater
        : [];

      const normalized = entries
        .map((entry, index) => {
          const rawVideo = entry?.video;
          if (!rawVideo || typeof rawVideo !== 'object') {
            return null;
          }
          const fallbackId =
            rawVideo._id ||
            rawVideo.id ||
            (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `watch-${index}`);

          const addedAt = entry?.addedAt ?? entry?.createdAt ?? new Date().toISOString();

          return {
            video: toLibraryVideo(rawVideo, fallbackId),
            addedAt
          };
        })
        .filter(Boolean);

      // Merge API data with store data (prioritize API data, but keep store entries that aren't in API)
      const currentStore = useLibraryStore.getState().watchLater || [];
      const apiVideoIds = new Set(normalized.map(entry => entry.video._id));
      const storeOnlyEntries = currentStore.filter(entry => !apiVideoIds.has(entry.video._id));
      
      // Combine API data with store-only entries (API data first, then store-only)
      const merged = [...normalized, ...storeOnlyEntries];
      
      setWatchLater(merged);
      setErrorMessage('');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync watch later list', error);
      const fallbackMessage =
        error?.response?.data?.message ||
        error?.message ||
        'We could not sync your Watch Later list right now.';
      setErrorMessage(fallbackMessage);
      setLastSyncedAt('');
    } finally {
      setLoadingRemote(false);
    }
  }, [isAuthenticated, setWatchLater]);

  useEffect(() => {
    loadWatchLater();
  }, [loadWatchLater]);

  // Listen to store changes and refresh when videos are added/removed (only if page is visible)
  useEffect(() => {
    if (initialized && isAuthenticated && document.visibilityState === 'visible') {
      // Reload from API when store changes (but debounce to avoid too many calls)
      const timeoutId = setTimeout(() => {
        loadWatchLater();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [watchLater.length, initialized, isAuthenticated, loadWatchLater]);

  const loading = !initialized || loadingRemote;

  const resetPlayerState = useCallback(() => {
    setActiveVideoId(null);
    setActivePlayback({ duration: 0, currentTime: 0 });
    setPlayerError('');
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

  const parseDuration = useCallback((value) => {
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
  }, []);

  const formatDuration = useCallback((seconds = 0) => {
    const total = Math.max(0, Math.round(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatRelativeTime = useCallback((timestamp) => {
    if (!timestamp) {
      return '';
    }
    const value = new Date(timestamp).getTime();
    if (Number.isNaN(value)) {
      return '';
    }
    const diff = Date.now() - value;
    const divisions = [
      { amount: 60, unit: 'second' },
      { amount: 60, unit: 'minute' },
      { amount: 24, unit: 'hour' },
      { amount: 7, unit: 'day' },
      { amount: 4.34524, unit: 'week' },
      { amount: 12, unit: 'month' },
      { amount: Number.POSITIVE_INFINITY, unit: 'year' }
    ];
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    let duration = diff / 1000;

    for (const division of divisions) {
      if (Math.abs(duration) < division.amount) {
        return rtf.format(Math.round(duration * -1), division.unit);
      }
      duration /= division.amount;
    }
    return '';
  }, []);

  const handleVideoClick = useCallback(
    (entry) => {
      if (!entry?.video) {
        return;
      }
      const video = entry.video;
      const videoId = video._id;
      const rawPlaybackUrl = video.url || video.videoUrl || video.playbackUrl || '';
      const playbackUrl = ensureAbsoluteUrl(rawPlaybackUrl);

      if (!playbackUrl) {
        setPlayerError('We cannot play this video right now.');
        return;
      }

      if (activeVideoId === videoId) {
        resetPlayerState();
        return;
      }

      const rawDuration = parseDuration(video.duration) ?? parseDuration(video.rawDuration);

      setActiveVideoId(videoId);
      setActivePlayback({
        duration: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0,
        currentTime: 0
      });
      setPlayerError('');
      
      // Try to play video after a short delay to ensure it's mounted
      setTimeout(() => {
        const videoEl = videoRefs.current[videoId];
        if (videoEl) {
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('Video autoplay failed on click:', error);
              // Autoplay failed, user can click play button
            });
          }
        }
      }, 100);
    },
    [activeVideoId, parseDuration, resetPlayerState, ensureAbsoluteUrl]
  );

  const handleRemove = useCallback(
    async (event, videoId) => {
      event.stopPropagation();
      if (!videoId) {
        return;
      }

      setRemovingIds((prev) => ({ ...prev, [videoId]: true }));

      try {
        if (isAuthenticated) {
          await removeFromWatchLaterApi(videoId);
        }
        removeFromWatchLater(videoId);
        if (activeVideoId === videoId) {
          resetPlayerState();
        }
      } catch (error) {
        console.error('Failed to remove video from watch later', error);
        setErrorMessage('We could not remove that video. Please try again.');
      } finally {
        setRemovingIds((prev) => {
          const next = { ...prev };
          delete next[videoId];
          return next;
        });
      }
    },
    [activeVideoId, isAuthenticated, removeFromWatchLater, resetPlayerState]
  );

  const watchLaterEntries = useMemo(
    () =>
      watchLater
        .filter((entry) => entry?.video)
        .map((entry, index) => ({
          ...entry,
          key: entry.video._id || `watch-${index}`
        })),
    [watchLater]
  );

  const watchLaterCount = watchLaterEntries.length;
  const hasSavedVideos = watchLaterCount > 0;
  const isBusy = loading || isClearing;

  const handleRetry = useCallback(() => {
    loadWatchLater();
  }, [loadWatchLater]);

  const handleExplore = useCallback(() => {
    navigate('/explore');
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleClearAll = useCallback(async () => {
    if (!hasSavedVideos || isBusy) {
      return;
    }

    const confirmed = window.confirm('Remove all videos from your Watch Later list? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    try {
      if (isAuthenticated) {
        await clearWatchLaterApi();
      }
      setWatchLater([]);
      resetPlayerState();
      setErrorMessage('');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to clear Watch Later list', error);
      const fallbackMessage =
        error?.response?.data?.message ||
        error?.message ||
        'We could not clear your Watch Later list. Please try again.';
      setErrorMessage(fallbackMessage);
    } finally {
      setIsClearing(false);
    }
  }, [hasSavedVideos, isBusy, isAuthenticated, setWatchLater, resetPlayerState]);

  const formatSaveCount = useCallback((value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  }, []);

  const syncLabel =
    lastSyncedAt && formatRelativeTime(lastSyncedAt) ? `Updated ${formatRelativeTime(lastSyncedAt)}` : '';

  const content = (
    <div className="watchlater-container watchlater-container--page">
      <div className="watchlater-header">
        <h1>
          <i className="fa-regular fa-bookmark"></i> Watch Later
        </h1>
        <button
          className="watchlater-close"
          onClick={handleGoHome}
          type="button"
          aria-label="Close Watch Later"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="watchlater-toolbar">
        <div className="watchlater-toolbar__info">
          <span className="watchlater-toolbar__count">
            {formatSaveCount(watchLaterCount)} {watchLaterCount === 1 ? 'video saved' : 'videos saved'}
          </span>
          {loading ? (
            <span className="watchlater-toolbar__sync watchlater-toolbar__sync--live">
              <i className="fa-solid fa-spinner fa-spin"></i> Syncing...
            </span>
          ) : (
            syncLabel && <span className="watchlater-toolbar__sync">{syncLabel}</span>
          )}
        </div>
        <div className="watchlater-toolbar__actions">
          <button
            className="watchlater-button watchlater-button--ghost"
            onClick={handleRetry}
            type="button"
            disabled={loadingRemote}
          >
            <i className="fa-solid fa-rotate"></i>
            Refresh
          </button>
          {hasSavedVideos && (
            <button
              className="watchlater-button watchlater-button--danger"
              onClick={handleClearAll}
              type="button"
              disabled={isBusy}
            >
              {isClearing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-trash"></i>}
              Clear All
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="watchlater-banner" role="status">
          <div className="watchlater-banner__content">
            <i className="fa-solid fa-circle-info"></i>
            <span>{errorMessage}</span>
          </div>
          <div className="watchlater-banner-actions">
            <button
              type="button"
              className="watchlater-button watchlater-button--ghost"
              onClick={handleRetry}
              disabled={loadingRemote}
            >
              <i className="fa-solid fa-rotate"></i>
              Try again
            </button>
          </div>
        </div>
      )}

      {playerError && (
        <div className="watchlater-banner watchlater-banner--warning" role="alert">
          <div className="watchlater-banner__content">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{playerError}</span>
          </div>
          <div className="watchlater-banner-actions">
            <button
              type="button"
              className="watchlater-button watchlater-button--ghost"
              onClick={resetPlayerState}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="watchlater-content">
        {!isAuthenticated ? (
          <div className="watchlater-empty">
            <i className="fa-solid fa-user-lock"></i>
            <p>Please sign in to view your Watch Later list.</p>
            <span>Sign in to save videos and watch them later.</span>
            <div className="watchlater-empty-actions">
              <button
                type="button"
                className="watchlater-button watchlater-button--primary"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="watchlater-button watchlater-button--ghost"
                onClick={handleGoHome}
              >
                Back to For You
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="watchlater-status" role="status">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Loading your Watch Later list...</p>
          </div>
        ) : watchLaterEntries.length === 0 ? (
          <div className="watchlater-empty">
            <i className="fa-solid fa-clock"></i>
            <p>No videos saved yet. Tap the bookmark icon on a video to add it here.</p>
            <span>Save videos whenever you want to queue them up for later.</span>
            <div className="watchlater-empty-actions">
              <button
                type="button"
                className="watchlater-button watchlater-button--primary"
                onClick={handleExplore}
              >
                Explore videos
              </button>
              <button
                type="button"
                className="watchlater-button watchlater-button--ghost"
                onClick={handleGoHome}
              >
                Back to For You
              </button>
            </div>
          </div>
        ) : (
          <div className="watchlater-grid">
            {watchLaterEntries.map((entry) => {
              const { video, key, addedAt } = entry;
              const videoId = video._id;
              const isActive = activeVideoId === videoId;
              const rawPlaybackUrl = video.url || video.videoUrl || video.playbackUrl || '';
              const playbackUrl = ensureAbsoluteUrl(rawPlaybackUrl);
              const baseDuration = parseDuration(video.duration) ?? 0;
              const resolvedDuration =
                isActive && activePlayback.duration > 0
                  ? formatDuration(Math.max(activePlayback.duration - activePlayback.currentTime, 0))
                  : formatDuration(baseDuration);
              const progressPercent =
                isActive && activePlayback.duration > 0
                  ? Math.min(100, (activePlayback.currentTime / activePlayback.duration) * 100)
                  : 0;

              return (
                <div
                  key={key}
                  className="watchlater-card"
                  onClick={() => handleVideoClick(entry)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(event) => {
                    if (event.key === 'Enter') handleVideoClick(entry);
                  }}
                >
                  <div className={`watchlater-thumbnail-wrapper ${isActive ? 'watchlater-thumbnail-wrapper--active' : ''}`}>
                    {isActive && playbackUrl ? (
                      <video
                        className="watchlater-inline-video"
                        src={playbackUrl}
                        controls
                        autoPlay
                        muted={false}
                        playsInline
                        preload="metadata"
                        poster={ensureAbsoluteUrl(video.thumbnail || '')}
                        ref={(el) => {
                          if (el) {
                            videoRefs.current[videoId] = el;
                          }
                        }}
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
                          // Try to play video after metadata is loaded
                          const video = event.currentTarget;
                          const playPromise = video.play();
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
                        onEnded={resetPlayerState}
                        onError={() => {
                          setPlayerError('We could not play this video. Please try another one.');
                          resetPlayerState();
                        }}
                      />
                    ) : (
                      <OptimizedImage
                        src={video.thumbnail || '/placeholder-thumbnail.jpg'}
                        alt={video.description || 'Watch later video'}
                        className="watchlater-thumbnail"
                      />
                    )}
                    <button
                      className="watchlater-remove-btn"
                      onClick={(event) => handleRemove(event, videoId)}
                      type="button"
                      aria-label="Remove from watch later"
                      disabled={Boolean(removingIds[videoId])}
                    >
                      {removingIds[videoId] ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-xmark"></i>}
                    </button>
                    {!isActive && (
                      <div className="watchlater-overlay-badge">
                        <i className="fa-solid fa-play"></i>
                      </div>
                    )}
                    <div className="watchlater-duration">{resolvedDuration}</div>
                    {isActive && activePlayback.duration > 0 && (
                      <div className="watchlater-progress">
                        <div className="watchlater-progress__bar" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    )}
                  </div>
                  <div className="watchlater-card-body">
                    <h3>{video.description || 'Untitled video'}</h3>
                    <div className="watchlater-meta">
                      <span>@{video.username || 'creator'}</span>
                      {addedAt && <span>{formatRelativeTime(addedAt)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return <div className="watchlater-page">{content}</div>;
};

export default WatchLater;
