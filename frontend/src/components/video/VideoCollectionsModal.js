import React, { useState, useEffect } from 'react';
import { 
  addVideoToPlaylist as apiAddVideoToPlaylist,
  createPlaylist as apiCreatePlaylist,
  getMyPlaylists
} from '../../api/collections';
import { useLibraryStore, toLibraryVideo, makeLibraryVideoFromFeed } from '../../store/libraryStore';
import { useAuth } from '../../context/AuthContext';
import './VideoCollections.css';

const AddVideoModal = ({ open, onClose, onAdd }) => {
  const [videoId, setVideoId] = useState('');
  if (!open) return null;
  return (
    <div className="vc-modal-backdrop">
      <div className="vc-modal">
        <h3>Add Video by ID</h3>
        <input
          type="text"
          placeholder="Enter video ID"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
        />
        <div className="vc-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() => {
              if (videoId.trim()) {
                onAdd(videoId.trim());
                setVideoId('');
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

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

const VideoCollectionsModal = ({ onClose, video }) => {
  const { isAuthenticated } = useAuth();
  const playlists = useLibraryStore((state) => state.playlists);
  const setPlaylists = useLibraryStore((state) => state.setPlaylists);
  const createPlaylistLocal = useLibraryStore((state) => state.createPlaylist);
  const addToPlaylistLocal = useLibraryStore((state) => state.addToPlaylist);
  const hydrate = useLibraryStore((state) => state.hydrate);
  const initialized = useLibraryStore((state) => state.initialized);

  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ensure local store is initialized (hydrates from localStorage)
  useEffect(() => {
    try {
      if (!initialized && typeof hydrate === 'function') {
        hydrate();
      }
    } catch (err) {
      console.warn('[VideoCollectionsModal] hydrate failed', err);
    }
  }, [hydrate, initialized]);

  // Auto-select first playlist when playlists load to enable actions
  useEffect(() => {
    if (!selectedId && Array.isArray(playlists) && playlists.length > 0) {
      setSelectedId(playlists[0]._id);
      console.log('[VideoCollectionsModal] Auto-selected first playlist', playlists[0]._id);
    }
  }, [playlists, selectedId]);

  // Sync playlists from backend if authenticated
  useEffect(() => {
    const syncPlaylists = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      try {
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
      } catch (err) {
        console.error('Failed to sync playlists', err);
        setError('Failed to load playlists');
      } finally {
        setLoading(false);
      }
    };
    
    syncPlaylists();
  }, [isAuthenticated, setPlaylists]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (isAuthenticated) {
        // Create on backend
        const newPlaylist = await apiCreatePlaylist({ 
          name, 
          description: '',
          isPublic: true 
        });
        
        // Sync playlists from backend
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
        
        setSelectedId(newPlaylist._id);
      } else {
        // Create locally
        const newPlaylist = createPlaylistLocal({ name, description: '', isPublic: true });
        setSelectedId(newPlaylist._id);
      }
      
      setNewName('');
    } catch (err) {
      console.error('Failed to create playlist', err);
      setError('Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (videoId) => {
    if (!selectedId) {
      setError('Please select a playlist first');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isAuthenticated) {
        // Add to backend
        await apiAddVideoToPlaylist(selectedId, videoId);
        
        // Sync playlists from backend
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
      } else {
        // Add locally
        const videoToAdd = makeLibraryVideoFromFeed(videoId, {
          description: 'Added by ID',
          username: 'unknown'
        });
        addToPlaylistLocal(selectedId, videoToAdd);
      }
      
      setShowAddModal(false);
      setError('Video added to playlist successfully');
    } catch (err) {
      console.error('apiAddVideoToPlaylist failed', err);
      setError('Failed to add video to playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrentVideo = async () => {
    console.log('[VideoCollectionsModal] handleAddCurrentVideo called', { selectedId, video, isAuthenticated });
    
    if (!selectedId) {
      console.error('[VideoCollectionsModal] No playlist selected');
      setError('Please select a playlist first');
      return;
    }
    
    const vid = video?._id || video?.id || video?.videoId || null;
    console.log('[VideoCollectionsModal] Extracted video ID:', vid, 'from video:', video);
    
    if (!vid) {
      console.error('[VideoCollectionsModal] No video ID found');
      setError('No video id available to add');
      return;
    }
    
    console.log('[VideoCollectionsModal] Starting add operation...');
    setLoading(true);
    setError('');
    
    try {
      if (isAuthenticated) {
        // Add to backend
        console.log('[VideoCollectionsModal] Authenticated - calling backend API');
        const addResult = await apiAddVideoToPlaylist(selectedId, vid);
        console.log('[VideoCollectionsModal] API add result:', addResult);
        
        // Sync playlists from backend
        console.log('[VideoCollectionsModal] Syncing playlists from backend');
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
      } else {
        // Add locally
        console.log('[VideoCollectionsModal] Not authenticated - adding locally');
        const videoToAdd = makeLibraryVideoFromFeed(vid, {
          src: video?.url || video?.videoUrl,
          thumbnail: video?.thumbnail,
          description: video?.description,
          username: video?.username || video?.user?.username,
          avatar: video?.profileAvatar || video?.user?.profile?.avatar
        });
        console.log('[VideoCollectionsModal] Video to add:', videoToAdd);
        addToPlaylistLocal(selectedId, videoToAdd);
        console.log('[VideoCollectionsModal] Added to local playlist');
      }
      
      console.log('[VideoCollectionsModal] Video added successfully!');
      setError('Video added to playlist successfully');
      
      // Close modal after short delay to show success message
      setTimeout(() => {
        console.log('[VideoCollectionsModal] Closing modal after success');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[VideoCollectionsModal] Failed to add video:', err);
      setError('Failed to add video to playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="video-collections-overlay" onClick={onClose}>
      <div className="video-collections-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collections-header">
          <button 
            className="collections-close" 
            onClick={(e) => {
              console.log('[VideoCollectionsModal] Close button clicked');
              e.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
          <h2>Save to Playlist</h2>
        </div>

        <div className="collections-body">
          {error && (
            <div className={`collections-message ${error.includes('success') ? 'success' : 'error'}`}>
              {error}
            </div>
          )}
          
          {loading && (
            <div className="collections-loading">
              <i className="fa-solid fa-spinner fa-spin"></i> Loading...
            </div>
          )}
          
          <div className="playlists-column">
            <div className="create-row">
              <input
                placeholder="New playlist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
                disabled={loading}
              />
              <button onClick={handleCreate} disabled={loading || !newName.trim()}>
                Create
              </button>
            </div>

            <div className="playlists-list">
              {playlists.length === 0 ? (
                <div className="empty">
                  {loading ? 'Loading playlists...' : 'No playlists yet. Create one above!'}
                </div>
              ) : (
                playlists.map((p) => (
                  <div
                    key={p._id}
                    className={`playlist-item${selectedId === p._id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(p._id)}
                  >
                    <img 
                      src={p.videos?.[0]?.video?.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='68'><rect width='100%25' height='100%25' fill='%232D2D3A'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236B6B7F' font-size='12'>Empty</text></svg>"} 
                      alt="thumb" 
                      onError={(e) => {
                        const t = e.target;
                        if (!t.dataset.fallbackApplied) {
                          t.dataset.fallbackApplied = '1';
                          t.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='68'><rect width='100%25' height='100%25' fill='%232D2D3A'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236B6B7F' font-size='12'>No Thumbnail</text></svg>";
                        }
                      }}
                    />
                    <div className="meta">
                      <div className="name">{p.name}</div>
                      <div className="count">{(p.videos || []).length} video{p.videos?.length === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="actions-column">
            <div className="actions">
              <button 
                onClick={(e) => {
                  console.log('[VideoCollectionsModal] Add current video clicked', {
                    selectedId,
                    hasVideo: !!video,
                    videoId: video?._id || video?.id || video?.videoId,
                    loading,
                    disabled: !selectedId || !video || loading
                  });
                  e.stopPropagation();
                  handleAddCurrentVideo();
                }} 
                disabled={!selectedId || !video || loading}
              >
                <i className="fa-solid fa-plus"></i> Add current video
              </button>
              <button onClick={() => setShowAddModal(true)} disabled={!selectedId || loading}>
                <i className="fa-solid fa-hashtag"></i> Add by video ID
              </button>
              <button 
                onClick={(e) => {
                  console.log('[VideoCollectionsModal] Close action button clicked');
                  e.stopPropagation();
                  onClose();
                }} 
                className="cancel"
              >
                <i className="fa-solid fa-xmark"></i> Close
              </button>
            </div>

            <div className="preview">
              <h4>Selected playlist</h4>
              {selectedId ? (
                (() => {
                  const p = playlists.find((x) => x._id === selectedId);
                  return p ? (
                    <div className="playlist-preview">
                      <div className="preview-name">{p.name}</div>
                      <div className="preview-count">{(p.videos || []).length} video{p.videos?.length === 1 ? '' : 's'}</div>
                      <div className="preview-videos">
                        {(p.videos || []).slice(0, 6).map((entry, idx) => (
                          <div key={entry.video?._id || idx} className="preview-video">
                            <img 
                              src={entry.video?.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='68'><rect width='100%25' height='100%25' fill='%231E1E2E'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236B6B7F' font-size='12'>No Thumb</text></svg>"} 
                              alt="v" 
                              onError={(e) => {
                                const t = e.target;
                                if (!t.dataset.fallbackApplied) {
                                  t.dataset.fallbackApplied = '1';
                                  t.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='68'><rect width='100%25' height='100%25' fill='%231E1E2E'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236B6B7F' font-size='12'>Error</text></svg>";
                                }
                              }}
                            />
                          </div>
                        ))}
                        {(p.videos || []).length > 6 && (
                          <div className="preview-video preview-more">
                            +{p.videos.length - 6}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="empty">
                  <i className="fa-solid fa-hand-pointer"></i>
                  <p>Select a playlist from the list</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AddVideoModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddVideo} />
    </div>
  );
};

export default VideoCollectionsModal;
