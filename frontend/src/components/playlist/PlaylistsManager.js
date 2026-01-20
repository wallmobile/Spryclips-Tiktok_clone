import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OptimizedImage from '../common/OptimizedImage';
import './PlaylistsManager.css';
import { useLibraryStore, toLibraryVideo, makeLibraryVideoFromFeed } from '../../store/libraryStore';
import { useAuth } from '../../context/AuthContext';
import {
  getMyPlaylists,
  createPlaylist as createPlaylistRequest,
  deletePlaylist as deletePlaylistRequest,
  removeVideoFromPlaylist as removeVideoFromPlaylistRequest
} from '../../api/collections';
import { addVideoToPlaylist as addVideoToPlaylistRequest } from '../../api/collections';
import { getVideoById } from '../../api/videos';

const mapBackendPlaylist = (playlist, index = 0) => {
  if (!playlist || typeof playlist !== 'object') {
    return null;
  }

  const fallbackId = playlist._id || `playlist-${index}`;

  const videos = Array.isArray(playlist.videos)
    ? playlist.videos
        .map((entry, videoIndex) => {
          const rawVideo = entry?.video;
          if (!rawVideo || typeof rawVideo !== 'object') {
            return null;
          }
          const fallbackVideoId =
            rawVideo._id ||
            rawVideo.id ||
            `${fallbackId}-video-${videoIndex}`;
          return {
            video: toLibraryVideo(rawVideo, fallbackVideoId),
            addedAt: entry?.addedAt ?? entry?.createdAt ?? playlist.updatedAt ?? new Date().toISOString()
          };
        })
        .filter(Boolean)
    : [];

  return {
    _id: fallbackId,
    name: playlist.name || 'Untitled playlist',
    description: playlist.description || '',
    isPublic: playlist.isPublic !== false,
    createdAt: playlist.createdAt || new Date().toISOString(),
    updatedAt: playlist.updatedAt || playlist.createdAt || new Date().toISOString(),
    videos
  };
};

const PlaylistsManager = () => {
  const { isAuthenticated } = useAuth();
  const playlists = useLibraryStore((state) => state.playlists);
  const initialized = useLibraryStore((state) => state.initialized);
  const hydrate = useLibraryStore((state) => state.hydrate);
  const setPlaylists = useLibraryStore((state) => state.setPlaylists);
  const createPlaylistLocal = useLibraryStore((state) => state.createPlaylist);
  const removeFromPlaylistLocal = useLibraryStore((state) => state.removeFromPlaylist);
  const removePlaylistLocal = useLibraryStore((state) => state.removePlaylist);
    const addToPlaylistLocal = useLibraryStore((state) => state.addToPlaylist);
  const navigate = useNavigate();

  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createPayload, setCreatePayload] = useState({ name: '', description: '', isPublic: true });
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [activePlayback, setActivePlayback] = useState({ duration: 0, currentTime: 0 });
  const [pendingPlaylistIds, setPendingPlaylistIds] = useState({});
  const [removingVideoIds, setRemovingVideoIds] = useState({});
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

  const resetPlayerState = useCallback(() => {
    setActiveVideoId(null);
    setActivePlayback({ duration: 0, currentTime: 0 });
    setPlayerError('');
  }, []);

  const syncPlaylists = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    setLoadingRemote(true);
    try {
      const response = await getMyPlaylists();
      const normalized = Array.isArray(response)
        ? response
            .map((playlist, index) => mapBackendPlaylist(playlist, index))
            .filter(Boolean)
        : [];
      setPlaylists(normalized);
      setErrorMessage('');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      console.error('Failed to sync playlists', error);
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          'We could not sync your playlists. Showing saved playlists instead.'
      );
      setLastSyncedAt('');
    } finally {
      setLoadingRemote(false);
    }
  }, [isAuthenticated, setPlaylists]);

  useEffect(() => {
    if (isAuthenticated) {
      syncPlaylists();
    }
  }, [isAuthenticated, syncPlaylists]);

  // Listen for video added to playlist event from other pages
  useEffect(() => {
    const handleVideoAddedToPlaylist = (event) => {
      console.log('[PlaylistsManager] Video added to playlist event received:', event.detail);
      if (isAuthenticated) {
        // Refresh playlists to show newly added video
        syncPlaylists();
        setErrorMessage('✅ Video added to playlist! Refreshing...');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    };
    
    window.addEventListener('videoAddedToPlaylist', handleVideoAddedToPlaylist);
    return () => {
      window.removeEventListener('videoAddedToPlaylist', handleVideoAddedToPlaylist);
    };
  }, [isAuthenticated, syncPlaylists]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    if (playlists.length === 0) {
      setSelectedPlaylistId(null);
      resetPlayerState();
      return;
    }
    if (!selectedPlaylistId || !playlists.some((playlist) => playlist._id === selectedPlaylistId)) {
      setSelectedPlaylistId(playlists[0]._id);
      resetPlayerState();
    }
  }, [initialized, playlists, selectedPlaylistId, resetPlayerState]);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist._id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId]
  );

  const playlistsForSidebar = useMemo(
    () =>
      playlists.map((playlist, index) => ({
        ...playlist,
        key: playlist._id || `playlist-${index}`
      })),
    [playlists]
  );

  const playlistVideos = useMemo(() => {
    if (!selectedPlaylist || !Array.isArray(selectedPlaylist.videos)) {
      return [];
    }
    return selectedPlaylist.videos.map((entry, index) => ({
      ...entry,
      key: `${selectedPlaylist._id}-video-${entry.video?._id || index}`
    }));
  }, [selectedPlaylist]);

  const loading = !initialized || loadingRemote;

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

  const handlePlaylistSelect = useCallback((playlistId) => {
    setSelectedPlaylistId(playlistId);
    resetPlayerState();
  }, [resetPlayerState]);

  const handleCreatePlaylist = async (event) => {
    event.preventDefault();
    if (!createPayload.name.trim()) {
      return;
    }
    const payload = {
      name: createPayload.name.trim(),
      description: createPayload.description?.trim(),
      isPublic: createPayload.isPublic
    };

    try {
      let newPlaylistId = null;
      if (isAuthenticated) {
        const remote = await createPlaylistRequest(payload);
        newPlaylistId = remote?._id ?? null;
        await syncPlaylists();
      } else {
        const local = createPlaylistLocal(payload);
        newPlaylistId = local._id;
      }
      if (newPlaylistId) {
        setSelectedPlaylistId(newPlaylistId);
      }
      setCreatePayload({ name: '', description: '', isPublic: true });
      setShowCreateForm(false);
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to create playlist', error);
      setErrorMessage('We could not create the playlist. Please try again.');
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!playlistId) {
      return;
    }
    setPendingPlaylistIds((prev) => ({ ...prev, [playlistId]: true }));
    try {
      if (isAuthenticated) {
        await deletePlaylistRequest(playlistId);
        await syncPlaylists();
      } else {
        removePlaylistLocal(playlistId);
      }
      if (selectedPlaylistId === playlistId) {
        setSelectedPlaylistId(null);
        resetPlayerState();
      }
    } catch (error) {
      console.error('Failed to delete playlist', error);
      setErrorMessage('We could not delete the playlist. Please try again.');
    } finally {
      setPendingPlaylistIds((prev) => {
        const next = { ...prev };
        delete next[playlistId];
        return next;
      });
    }
  };

  const handleRemoveVideo = async (playlistId, entryKey, videoId) => {
    if (!playlistId || !entryKey || !videoId) {
      return;
    }
    setRemovingVideoIds((prev) => ({ ...prev, [entryKey]: true }));
    try {
      if (isAuthenticated) {
        await removeVideoFromPlaylistRequest(playlistId, videoId);
        await syncPlaylists();
        setSelectedPlaylistId(playlistId);
      } else {
        removeFromPlaylistLocal(playlistId, videoId);
      }
      if (activeVideoId === `${playlistId}:${videoId}`) {
        resetPlayerState();
      }
    } catch (error) {
      console.error('Failed to remove video from playlist', error);
      setErrorMessage('We could not remove that video. Please try again.');
    } finally {
      setRemovingVideoIds((prev) => {
        const next = { ...prev };
        delete next[entryKey];
        return next;
      });
    }
  };

  const handleVideoActivate = useCallback(
    (playlistId, entry) => {
      if (!entry?.video) {
        return;
      }
      const video = entry.video;
      const videoId = video._id;
      const playbackUrl = video.url;
      const activeKey = `${playlistId}:${videoId}`;

      if (!playbackUrl) {
        setPlayerError('We cannot play this video right now.');
        return;
      }

      if (activeVideoId === activeKey) {
        resetPlayerState();
        return;
      }

      const rawDuration = parseDuration(video.duration) ?? parseDuration(video.rawDuration);

      setActiveVideoId(activeKey);
      setActivePlayback({
        duration: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0,
        currentTime: 0
      });
      setPlayerError('');
    },
    [activeVideoId, parseDuration, resetPlayerState]
  );

  const handleVideoTimeUpdate = useCallback((event) => {
    const current = event.currentTarget.currentTime;
    if (Number.isFinite(current)) {
      setActivePlayback((prev) => ({
        ...prev,
        currentTime: current
      }));
    }
  }, []);

  const handleVideoLoaded = useCallback((event, baseDuration = 0) => {
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
  }, []);

  const totalPlaylists = playlists.length;
  const totalVideos = playlists.reduce(
    (acc, playlist) => acc + (Array.isArray(playlist.videos) ? playlist.videos.length : 0),
    0
  );

  const handleRefresh = useCallback(() => {
    syncPlaylists();
  }, [syncPlaylists]);

  const handleClose = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const handleShowCreate = useCallback(() => {
    setShowCreateForm((prev) => !prev);
  }, []);

  const formatSaveCount = useCallback((value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return String(value);
  }, []);

  const syncLabel =
    lastSyncedAt && formatRelativeTime(lastSyncedAt) ? `Updated ${formatRelativeTime(lastSyncedAt)}` : '';

  const handleDismissPlayerError = useCallback(() => {
    setPlayerError('');
  }, []);

  const handleExplore = useCallback(() => navigate('/explore'), [navigate]);

  const [addVideoId, setAddVideoId] = useState('');
  const fileInputRef = useRef(null);

  const handleLocalFileAdd = async (file) => {
    if (!file || !selectedPlaylist) return;
    
    // If not authenticated, use blob URL (temporary - will be lost on refresh)
    if (!isAuthenticated) {
      try {
        const blobUrl = URL.createObjectURL(file);
        const vid = `local-file-${Date.now()}`;
        const lib = makeLibraryVideoFromFeed(vid, { src: blobUrl, thumbnail: '', description: file.name, username: 'local' });
        addToPlaylistLocal(selectedPlaylist._id, lib);
        setErrorMessage('Added local file temporarily (login to save permanently).');
      } catch (e) {
        console.error('Failed to add local file', e);
        setErrorMessage('Could not add the local file.');
      }
      return;
    }

    // If authenticated, upload to backend for permanent storage
    try {
      setErrorMessage('Uploading file...');
      
      // Create FormData to upload the video
      const formData = new FormData();
      formData.append('video', file);
      
      // Add minimal metadata
      const metadata = {
        caption: file.name,
        privacy: 'private', // Keep playlist videos private by default
        status: 'ready'
      };
      formData.append('metadata', JSON.stringify(metadata));

      // Upload video to backend
      const apiUrl = window.APP_CONFIG?.API_URL || '';
      const uploadEndpoint = apiUrl ? `${apiUrl}/api/upload` : '/api/upload';
      
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload response:', result); // Debug log
      
      // Backend returns: { success: true, message: '...', video: { id: '...', status: '...', url: '...', thumbnail: '...' } }
      const uploadedVideoId = result.video?.id || result.video?._id || result.id || result._id;

      if (!uploadedVideoId) {
        console.error('No video ID in response:', result);
        throw new Error('No video ID returned from upload');
      }

      console.log('Video uploaded successfully with ID:', uploadedVideoId);

      // Add the uploaded video to the playlist
      await addVideoToPlaylistRequest(selectedPlaylist._id, uploadedVideoId);
      await syncPlaylists();
      setErrorMessage('File uploaded and added to playlist successfully!');
    } catch (e) {
      console.error('Failed to upload and add local file', e);
      setErrorMessage(`Upload failed: ${e.message || 'Unknown error'}. File not added to playlist.`);
    }
  };

  const isUrl = (v) => typeof v === 'string' && /^https?:\/\//i.test(v);

  const isHexObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
  const fetchAndAddLocal = async (id) => {
    if (!id || !selectedPlaylist) return;
    try {
      const remote = await getVideoById(id);
      if (remote) {
        const lib = toLibraryVideo(remote, id);
        addToPlaylistLocal(selectedPlaylist._id, lib);
        setErrorMessage('Added locally (with metadata).');
        return;
      }
    } catch (e) {
      console.warn('Could not fetch video metadata for local add', e?.message || e);
    }
    addToPlaylistLocal(selectedPlaylist._id, { _id: id, description: 'Added by ID (local)', username: 'unknown' });
    setErrorMessage('Added locally.');
  };

  const handleAddVideoById = async (videoIdToAdd) => {
    const vid = String(videoIdToAdd || '').trim();
    if (!vid) return;
    if (!selectedPlaylist) {
      setErrorMessage('Please select a playlist first.');
      return;
    }
    try {
      if (isUrl(vid)) {
        addToPlaylistLocal(selectedPlaylist._id, { _id: vid, url: vid, description: 'Added by URL (local)', username: 'unknown' });
        setErrorMessage('Added locally (URL).');
        return;
      }
      if (isAuthenticated) {
        if (!isHexObjectId(vid)) {
          // server requires ObjectId — add locally instead (try to fetch metadata)
          await fetchAndAddLocal(vid);
          setErrorMessage('Added locally; server requires a valid ObjectId to sync.');
          return;
        }
        await addVideoToPlaylistRequest(selectedPlaylist._id, vid);
        await syncPlaylists();
        setErrorMessage('Added to playlist.');
      } else {
        await fetchAndAddLocal(vid);
      }
    } catch (err) {
      console.error('Failed to add video to playlist', err);
      await fetchAndAddLocal(vid);
      setErrorMessage('Added locally; failed to add to server.');
    }
  };

  return (
    <div className="playlists-page">
      <div className="playlists-container playlists-container--page">
        <header className="playlists-header">
          <h1>
            <i className="fa-solid fa-list-music"></i> Playlists
          </h1>
          <button className="playlists-close" type="button" onClick={handleClose} aria-label="Close Playlists">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="playlists-toolbar">
          <div className="playlists-toolbar__info">
            <span className="playlists-toolbar__count">
              {formatSaveCount(totalPlaylists)} playlist{totalPlaylists === 1 ? '' : 's'}
            </span>
            <span className="playlists-toolbar__detail">
              {formatSaveCount(totalVideos)} total videos
            </span>
            {loading ? (
              <span className="playlists-toolbar__sync playlists-toolbar__sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Syncing...
              </span>
            ) : (
              syncLabel && <span className="playlists-toolbar__sync">{syncLabel}</span>
            )}
          </div>
          <div className="playlists-toolbar__actions">
            <button
              className="playlists-button playlists-button--ghost"
              type="button"
              onClick={handleRefresh}
              disabled={loadingRemote}
            >
              <i className="fa-solid fa-rotate"></i>
              Refresh
            </button>
            <button
              className={`playlists-button ${showCreateForm ? 'playlists-button--secondary' : 'playlists-button--primary'}`}
              type="button"
              onClick={handleShowCreate}
            >
              <i className="fa-solid fa-plus"></i>
              {showCreateForm ? 'Close form' : 'New Playlist'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="playlists-banner" role="status">
            <div className="playlists-banner__content">
              <i className="fa-solid fa-circle-info"></i>
              <span>{errorMessage}</span>
            </div>
            <div className="playlists-banner-actions">
              <button
                className="playlists-button playlists-button--ghost"
                type="button"
                onClick={handleRefresh}
                disabled={loadingRemote}
              >
                <i className="fa-solid fa-rotate"></i>
                Try again
              </button>
            </div>
          </div>
        )}

        {playerError && (
          <div className="playlists-banner playlists-banner--warning" role="alert">
            <div className="playlists-banner__content">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{playerError}</span>
            </div>
            <div className="playlists-banner-actions">
              <button
                className="playlists-button playlists-button--ghost"
                type="button"
                onClick={handleDismissPlayerError}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="playlists-body">
          <aside className="playlists-sidebar">
            {showCreateForm && (
              <form className="playlists-form" onSubmit={handleCreatePlaylist}>
                <div className="playlists-form-group">
                  <label htmlFor="playlist-name">Name</label>
                  <input
                    id="playlist-name"
                    type="text"
                    value={createPayload.name}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="My playlist"
                    required
                  />
                </div>
                <div className="playlists-form-group">
                  <label htmlFor="playlist-description">Description</label>
                  <textarea
                    id="playlist-description"
                    value={createPayload.description}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="What is this playlist about?"
                    rows={3}
                  />
                </div>
                <label className="playlists-toggle">
                  <input
                    type="checkbox"
                    checked={createPayload.isPublic}
                    onChange={(event) =>
                      setCreatePayload((prev) => ({ ...prev, isPublic: event.target.checked }))
                    }
                  />
                  <span>Public playlist</span>
                </label>
                <div className="playlists-form-actions">
                  <button type="button" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                  <button type="submit">
                    {isAuthenticated ? 'Create playlist' : 'Save locally'}
                  </button>
                </div>
              </form>
            )}

            <div className="playlists-sidebar-list">
              {loading ? (
                <div className="playlists-sidebar-status" role="status">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Loading playlists...</span>
                </div>
              ) : playlistsForSidebar.length === 0 ? (
                <div className="playlists-sidebar-empty">
                  <i className="fa-solid fa-layer-group"></i>
                  <p>Create your first playlist to organize videos.</p>
                  <button
                    type="button"
                    className="playlists-button playlists-button--primary"
                    onClick={handleShowCreate}
                  >
                    <i className="fa-solid fa-plus"></i>
                    Start a playlist
                  </button>
                </div>
              ) : (
                playlistsForSidebar.map((playlist) => (
                  <div
                    key={playlist.key}
                    className={`playlists-sidebar-item ${
                      selectedPlaylistId === playlist._id ? 'active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="playlists-sidebar-select"
                      onClick={() => handlePlaylistSelect(playlist._id)}
                    >
                      <div className="playlists-sidebar-meta">
                        <h3>{playlist.name}</h3>
                        <span>{playlist.videos?.length || 0} videos</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="playlists-sidebar-delete"
                      onClick={() => handleDeletePlaylist(playlist._id)}
                      disabled={Boolean(pendingPlaylistIds[playlist._id])}
                      aria-label="Delete playlist"
                    >
                      {pendingPlaylistIds[playlist._id] ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash"></i>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <main className="playlists-main">
            {loading ? (
              <div className="playlists-main-status" role="status">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <p>Preparing your playlists…</p>
              </div>
            ) : !selectedPlaylist ? (
              <div className="playlists-main-empty">
                <i className="fa-solid fa-list"></i>
                <h2>No playlist selected</h2>
                <p>Select a playlist on the left or create a new one.</p>
              </div>
            ) : playlistVideos.length === 0 ? (
              <div className="playlists-main-empty">
                <i className="fa-solid fa-video-slash"></i>
                <h2>No videos yet</h2>
                <p>Add videos to this playlist from the video details page.</p>
                <div className="playlists-empty-actions">
                  <button
                    type="button"
                    className="playlists-button playlists-button--primary"
                    onClick={handleExplore}
                  >
                    <i className="fa-solid fa-compass"></i>
                    Explore videos
                  </button>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div className="playlists-add-by-id-inline" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Enter video ID or URL to add"
                      value={addVideoId}
                      onChange={(e) => setAddVideoId(e.target.value)}
                      style={{ padding: '8px', minWidth: '280px' }}
                    />
                    <button
                      type="button"
                      className="playlists-button playlists-button--primary"
                      onClick={async () => {
                        const vid = addVideoId.trim();
                        if (!vid) return;
                        setAddVideoId('');
                        await handleAddVideoById(vid);
                      }}
                    >
                      <i className="fa-solid fa-plus"></i>
                      Add
                    </button>
                    <button
                      type="button"
                      className="playlists-button playlists-button--ghost"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="fa-solid fa-upload"></i>
                      Add file
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleLocalFileAdd(f);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="playlists-button playlists-button--ghost"
                      onClick={async () => {
                        const vid = addVideoId.trim();
                        if (!vid) return;
                        setAddVideoId('');
                        if (isUrl(vid)) {
                          addToPlaylistLocal(selectedPlaylist._id, { _id: vid, url: vid, description: 'Added by URL (local)', username: 'unknown' });
                        } else {
                          await fetchAndAddLocal(vid);
                        }
                        setErrorMessage('Added locally.');
                      }}
                    >
                      <i className="fa-solid fa-download"></i>
                      Add locally
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="playlists-main-header">
                  <div>
                    <h2>{selectedPlaylist.name}</h2>
                    <p>{selectedPlaylist.description || 'No description provided.'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="playlists-add-by-id-inline" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Enter video ID or URL to add"
                        value={addVideoId}
                        onChange={(e) => setAddVideoId(e.target.value)}
                        style={{ padding: '8px', minWidth: '220px' }}
                      />
                      <button
                        type="button"
                        className="playlists-button playlists-button--primary"
                        onClick={async () => {
                          const vid = addVideoId.trim();
                          if (!vid) return;
                          setAddVideoId('');
                          await handleAddVideoById(vid);
                        }}
                      >
                        <i className="fa-solid fa-plus"></i>
                        Add
                      </button>
                      <button
                        type="button"
                        className="playlists-button playlists-button--ghost"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="fa-solid fa-upload"></i>
                        Add file
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            handleLocalFileAdd(f);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="playlists-button playlists-button--ghost"
                        onClick={async () => {
                          const vid = addVideoId.trim();
                          if (!vid) return;
                          setAddVideoId('');
                          // always add locally
                          if (isUrl(vid)) {
                            addToPlaylistLocal(selectedPlaylist._id, { _id: vid, url: vid, description: 'Added by URL (local)', username: 'unknown' });
                            setErrorMessage('Added locally.');
                          } else {
                            await fetchAndAddLocal(vid);
                          }
                        }}
                      >
                        <i className="fa-solid fa-download"></i>
                        Add locally
                      </button>
                    </div>
                    <div className="playlists-main-stat">
                      {playlistVideos.length} video{playlistVideos.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="playlists-grid">
                  {playlistVideos.map((entry) => {
                    const { video, key, addedAt } = entry;
                    const playlistVideoKey = `${selectedPlaylist._id}:${video._id}`;
                    const isActive = activeVideoId === playlistVideoKey;
                    const playbackUrl = video.url;
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
                        className={`playlists-video-card ${isActive ? 'playlists-video-card--active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleVideoActivate(selectedPlaylist._id, entry)}
                        onKeyPress={(event) => {
                          if (event.key === 'Enter') {
                            handleVideoActivate(selectedPlaylist._id, entry);
                          }
                        }}
                      >
                        <div className="playlists-video-media">
                          {isActive && playbackUrl ? (
                            <video
                              className="playlists-inline-video"
                              src={playbackUrl}
                              controls
                              autoPlay
                              playsInline
                              poster={video.thumbnail || ''}
                              onLoadedMetadata={(event) => handleVideoLoaded(event, baseDuration)}
                              onTimeUpdate={handleVideoTimeUpdate}
                              onEnded={resetPlayerState}
                              onError={() => {
                                setPlayerError('We could not play this video. Please try another one.');
                                resetPlayerState();
                              }}
                            />
                          ) : (
                            <OptimizedImage
                              src={video.thumbnail || '/placeholder-thumbnail.jpg'}
                              alt={video.description || 'Playlist video'}
                              className="playlists-video-thumb"
                            />
                          )}
                          {!isActive && (
                            <div className="playlists-overlay-badge">
                              <i className="fa-solid fa-play"></i>
                            </div>
                          )}
                          <div className="playlists-duration">{resolvedDuration}</div>
                          {isActive && activePlayback.duration > 0 && (
                            <div className="playlists-progress">
                              <div className="playlists-progress__bar" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          )}
                          <button
                            type="button"
                            className="playlists-video-remove"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveVideo(selectedPlaylist._id, key, video._id || key);
                            }}
                            disabled={Boolean(removingVideoIds[key])}
                            aria-label="Remove from playlist"
                          >
                            {removingVideoIds[key] ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-xmark"></i>
                            )}
                          </button>
                        </div>
                        <div className="playlists-video-body">
                          <h3>{video.description || 'Untitled video'}</h3>
                          <div className="playlists-video-meta">
                            <span>@{video.username || 'creator'}</span>
                            {addedAt && <span>{formatRelativeTime(addedAt)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PlaylistsManager;
