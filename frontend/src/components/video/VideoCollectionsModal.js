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

  // Debug: Log video object when modal opens
  useEffect(() => {
    console.log('========================================');
    console.log('[VideoCollectionsModal] Modal opened with video:', video);
    console.log('[VideoCollectionsModal] Video source:', video?.__source || 'unknown');
    console.log('[VideoCollectionsModal] Video ID attempts:', {
      '_id': video?._id,
      'id': video?.id,
      'videoId': video?.videoId,
      'video._id': video?.video?._id,
      'video.id': video?.video?.id,
    });
    console.log('[VideoCollectionsModal] Video keys:', video ? Object.keys(video) : 'no video');
    
    // Check if this is sample data
    if (video && (video.__source === 'sample' || (video._id && !/^[a-f\d]{24}$/i.test(String(video._id))))) {
      console.warn('[VideoCollectionsModal] ⚠️ This appears to be sample/demo video - may not be addable to playlist');
    }
    console.log('========================================');
  }, [video]);

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
    if (!name) {
      setError('Please enter a playlist name');
      return;
    }
    
    if (name.length > 100) {
      setError('Playlist name must be 100 characters or less');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isAuthenticated) {
        // Create on backend
        console.log('[VideoCollectionsModal] Creating playlist on backend:', name);
        const newPlaylist = await apiCreatePlaylist({ 
          name, 
          description: '',
          isPublic: true 
        });
        console.log('[VideoCollectionsModal] Playlist created:', newPlaylist._id);
        
        // Sync playlists from backend
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
        
        setSelectedId(newPlaylist._id);
        setError('Playlist created successfully');
      } else {
        // Create locally
        console.log('[VideoCollectionsModal] Creating playlist locally:', name);
        const newPlaylist = createPlaylistLocal({ name, description: '', isPublic: true });
        setSelectedId(newPlaylist._id);
        setError('Playlist created successfully');
      }
      
      setNewName('');
      
      // Clear success message after delay
      setTimeout(() => setError(''), 2000);
    } catch (err) {
      console.error('Failed to create playlist', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Extract error message from response
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create playlist';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVideo = async (videoId) => {
    if (!selectedId) {
      setError('Please select a playlist first');
      return;
    }
    
    if (!videoId || !videoId.trim()) {
      setError('Please enter a valid video ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isAuthenticated) {
        // Add to backend
        console.log('[VideoCollectionsModal] Adding video by ID to backend:', { playlistId: selectedId, videoId });
        await apiAddVideoToPlaylist(selectedId, videoId.trim());
        
        // Sync playlists from backend
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
        console.log('[VideoCollectionsModal] Video added by ID successfully');
      } else {
        // Add locally
        const videoToAdd = makeLibraryVideoFromFeed(videoId.trim(), {
          description: 'Added by ID',
          username: 'unknown'
        });
        addToPlaylistLocal(selectedId, videoToAdd);
        console.log('[VideoCollectionsModal] Video added locally by ID');
      }
      
      setShowAddModal(false);
      setError('Video added to playlist successfully');
      
      // Clear success message after delay
      setTimeout(() => setError(''), 2000);
    } catch (err) {
      console.error('apiAddVideoToPlaylist failed', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Extract error message from response
      const errorMsg = err.response?.data?.message || err.message || 'Failed to add video to playlist';
      setError(errorMsg);
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
    
    // Try multiple ways to extract video ID
    let vid = video?._id || 
              video?.id || 
              video?.videoId || 
              video?.video?._id ||
              video?.video?.id ||
              null;
    
    // Convert to string if it's an object
    if (vid && typeof vid === 'object' && vid.toString) {
      vid = vid.toString();
    }
    
    console.log('[VideoCollectionsModal] Extracted video ID:', vid, 'from video:', video);
    console.log('[VideoCollectionsModal] Video structure:', {
      _id: video?._id,
      id: video?.id,
      videoId: video?.videoId,
      'video._id': video?.video?._id,
      'video.id': video?.video?.id
    });
    
    if (!vid) {
      console.error('[VideoCollectionsModal] No video ID found in video object');
      setError('No video ID available to add');
      return;
    }
    
    // Ensure vid is a string
    vid = String(vid);
    
    // Validate that vid is a valid MongoDB ObjectId (24 hex characters)
    const isValidObjectId = /^[a-f\d]{24}$/i.test(vid);
    if (!isValidObjectId) {
      console.error('[VideoCollectionsModal] Invalid video ID format:', vid, 'Type:', typeof vid);
      console.error('[VideoCollectionsModal] This video cannot be added to playlist. It may be a sample video.');
      setError(`This video is not available to add to playlists. Please try another video.`);
      
      // Auto-close modal after showing error
      setTimeout(() => {
        onClose();
      }, 2500);
      return;
    }
    
    console.log('[VideoCollectionsModal] Starting add operation with valid ID:', vid);
    setLoading(true);
    setError('');
    
    try {
      if (isAuthenticated) {
        // Add to backend
        console.log('[VideoCollectionsModal] Authenticated - calling backend API with:', { playlistId: selectedId, videoId: vid });
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
        console.log('[VideoCollectionsModal] Playlists synced, count:', normalized.length);
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
      setError('Video added to playlist successfully! 🎉');
      
      // Close modal after showing success message (increased time to allow user to see "View Playlist" button)
      setTimeout(() => {
        console.log('[VideoCollectionsModal] Auto-closing modal after success');
        onClose();
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('videoAddedToPlaylist', { 
          detail: { playlistId: selectedId, videoId: vid } 
        }));
      }, 3000); // Increased from 1500 to 3000ms
    } catch (err) {
      console.error('[VideoCollectionsModal] Failed to add video:', err);
      console.error('[VideoCollectionsModal] Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Extract error message from response
      const errorMsg = err.response?.data?.message || err.message || 'Failed to add video to playlist';
      setError(errorMsg);
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
              {error.includes('success') && selectedId && (
                <button 
                  className="view-playlist-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = '/playlists';
                  }}
                  style={{
                    marginLeft: '10px',
                    padding: '4px 12px',
                    background: '#fff',
                    color: '#fe2c55',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  View Playlist →
                </button>
              )}
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
