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
  // Subscribe directly to the store for real-time updates
  const playlistsFromStore = useLibraryStore((state) => state.playlists);
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

  // Use store playlists directly instead of local state
  const playlists = playlistsFromStore;

  // Debug: Log video object structure
  useEffect(() => {
    console.log('VideoCollectionsModal opened with video:', video);
    console.log('Video keys:', video ? Object.keys(video) : 'no video');
    if (video) {
      console.log('Video._id:', video._id);
      console.log('Video.id:', video.id);
      console.log('Video.videoId:', video.videoId);
    }
  }, [video]);

  // Sync playlists from backend if authenticated (merge with local)
  useEffect(() => {
    const syncPlaylists = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      try {
        const response = await getMyPlaylists();
        const backendPlaylists = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        
        // Merge: Keep local demo videos
        const currentPlaylists = playlistsFromStore;
        const mergedPlaylists = backendPlaylists.map(bp => {
          const localPlaylist = currentPlaylists.find(lp => lp._id === bp._id);
          if (localPlaylist) {
            const localOnlyVideos = (localPlaylist.videos || []).filter(lv => {
              const lvId = lv.video?._id;
              const isDemoVideo = !/^[0-9a-fA-F]{24}$/.test(lvId);
              const notInBackend = !(bp.videos || []).some(bv => bv.video?._id === lvId);
              return isDemoVideo && notInBackend;
            });
            if (localOnlyVideos.length > 0) {
              return { ...bp, videos: [...(bp.videos || []), ...localOnlyVideos] };
            }
          }
          return bp;
        });
        
        setPlaylists(mergedPlaylists);
      } catch (err) {
        console.error('Failed to sync playlists', err);
        setError('Failed to load playlists');
      } finally {
        setLoading(false);
      }
    };
    
    syncPlaylists();
  }, [isAuthenticated, setPlaylists, playlistsFromStore]);

  const handleCreate = async () => {
    console.log('Create button clicked', { newName });
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
        console.log('Playlist created on backend:', newPlaylist);
        
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
        console.log('Playlist created locally:', newPlaylist);
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
    console.log('Add video by ID clicked:', { videoId, selectedId });
    if (!selectedId) {
      setError('Please select a playlist first');
      return;
    }
    
    if (!videoId || !videoId.trim()) {
      setError('Please enter a valid video ID');
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
        console.log('Adding video by ID to backend:', { playlistId: selectedId, videoId });
        const result = await apiAddVideoToPlaylist(selectedId, videoId);
        console.log('Video added successfully:', result);
        
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
        console.log('Video added locally');
      }
      
      setShowAddModal(false);
      setError('Video added to playlist successfully!');
      
      // Clear success message after delay
      setTimeout(() => {
        setError('');
      }, 3000);
    } catch (err) {
      console.error('apiAddVideoToPlaylist failed', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to add video to playlist';
      setError(errorMsg);
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCurrentVideo = async () => {
    console.log('Add current video clicked', { selectedId, video });
    if (!selectedId) {
      console.error('[VideoCollectionsModal] No playlist selected');
      setError('Please select a playlist first');
      return;
    }
    
    // Try multiple ways to extract video ID - check nested video object too
    let vid = video?._id || video?.id || video?.videoId;
    
    // If video is a wrapper object with nested video data, try that
    if (!vid && video?.video) {
      vid = video.video._id || video.video.id || video.video.videoId;
    }
    
    console.log('Extracted video ID:', vid);
    console.log('Video object structure:', {
      hasDirectId: !!video?._id || !!video?.id,
      hasNestedVideo: !!video?.video,
      nestedVideoId: video?.video?._id || video?.video?.id,
      allKeys: video ? Object.keys(video) : []
    });
    
    if (!vid) {
      setError('No video id available. Check console for debug info.');
      console.error('Failed to extract video ID. Full video object:', video);
      return;
    }

    // Convert to string to check format
    const vidStr = String(vid);
    
    // Check if it's a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(vidStr);
    
    // Check if this is sample/demo data
    const isSourceSample = video?.__source === 'sample' || video?.video?.__source === 'sample';
    
    setLoading(true);
    
    try {
      if (isAuthenticated && isValidObjectId) {
        // Add to backend (only if we have valid ObjectId)
        console.log('Adding video to backend playlist:', { playlistId: selectedId, videoId: vidStr });
        const result = await apiAddVideoToPlaylist(selectedId, vidStr);
        console.log('Video added to backend playlist successfully:', result);
        
        // Sync playlists from backend
        console.log('[VideoCollectionsModal] Syncing playlists from backend');
        const response = await getMyPlaylists();
        const normalized = Array.isArray(response)
          ? response
              .map((playlist, index) => mapBackendPlaylist(playlist, index))
              .filter(Boolean)
          : [];
        setPlaylists(normalized);
        console.log('Playlists synced from backend, new count:', normalized.length);
        
        setError('✓ Video successfully added to your playlist!');
      } else {
        // Add locally (works with any ID format - demo videos or when not authenticated)
        const videoToAdd = makeLibraryVideoFromFeed(vidStr, {
          src: video?.url || video?.videoUrl || video?.video?.url || video?.video?.videoUrl,
          thumbnail: video?.thumbnail || video?.video?.thumbnail,
          description: video?.description || video?.caption || video?.video?.description,
          username: video?.username || video?.user?.username || video?.creator?.username || video?.video?.user?.username,
          avatar: video?.profileAvatar || video?.user?.profile?.avatar || video?.user?.avatar || video?.video?.user?.profile?.avatar
        });
        
        console.log('Adding video to local playlist:', { playlistId: selectedId, videoId: vidStr, videoToAdd });
        addToPlaylistLocal(selectedId, videoToAdd);
        
        // The store will automatically update and trigger re-render
        console.log('Video added to local playlist successfully');
        
        // Verify the video was added
        setTimeout(() => {
          const updatedPlaylists = useLibraryStore.getState().playlists;
          const updatedPlaylist = updatedPlaylists.find(p => p._id === selectedId);
          console.log('✅ Updated playlist:', updatedPlaylist);
          console.log('✅ Video count in playlist:', updatedPlaylist?.videos?.length || 0);
        }, 100);
        
        if (isAuthenticated && !isValidObjectId) {
          setError('✓ Demo video saved to local playlist! (Will not sync online)');
        } else {
          setError('✓ Video successfully added to your playlist!');
        }
      }
      
      // Don't close modal immediately - let user see the video was added
      // Close after 2 seconds to show success message
      setTimeout(() => {
        console.log('[VideoCollectionsModal] Auto-closing modal after success');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('apiAddVideoToPlaylist failed', err);
      console.error('Error response:', err?.response);
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to add video to playlist';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="video-collections-overlay" onClick={(e) => {
      console.log('Overlay clicked');
      onClose();
    }}>
      <div className="video-collections-modal" onClick={(e) => {
        console.log('Modal clicked, stopping propagation');
        e.stopPropagation();
      }}>
        <div className="collections-header">
          <button className="collections-close" onClick={(e) => {
            console.log('Close button clicked');
            e.stopPropagation();
            onClose();
          }}>
            ✕
          </button>
          <h2>Save to Playlist</h2>
        </div>

        <div className="collections-body">
          {error && (
            <div className={`collections-message ${error.includes('✓') || error.includes('success') ? 'success' : 'error'}`}>
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
                onChange={(e) => {
                  console.log('Input changed:', e.target.value);
                  setNewName(e.target.value);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    console.log('Enter key pressed');
                    handleCreate();
                  }
                }}
                disabled={loading}
              />
              <button onClick={(e) => {
                console.log('Create button onClick fired');
                e.preventDefault();
                e.stopPropagation();
                handleCreate();
              }} disabled={loading || !newName.trim()}>
                Create
              </button>
            </div>

            <div className="playlists-list">
              {playlists.length === 0 ? (
                <div className="empty">
                  {loading ? 'Loading playlists...' : 'No playlists yet. Create one above!'}
                </div>
              ) : (
                playlists.map((p) => {
                  // Check if current video is already in this playlist
                  const videoId = video?._id || video?.id || video?.videoId || video?.video?._id || video?.video?.id;
                  const isVideoInPlaylist = p.videos?.some(entry => 
                    entry.video?._id === videoId || entry.video?._id === String(videoId)
                  );
                  
                  return (
                    <div
                      key={p._id}
                      className={`playlist-item${selectedId === p._id ? ' selected' : ''}${isVideoInPlaylist ? ' has-video' : ''}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        console.log('🔥 PLAYLIST CLICKED!', {
                          playlistId: p._id,
                          playlistName: p.name,
                          allPlaylistIds: playlists.map(pl => pl._id)
                        });
                        
                        // Instagram style: Click on playlist = Add video to it
                        if (isVideoInPlaylist) {
                          setError('Video already in this playlist!');
                          return;
                        }
                        
                        setSelectedId(p._id);
                        setLoading(true);
                        
                        // Extract video ID
                        let vid = video?._id || video?.id || video?.videoId;
                        if (!vid && video?.video) {
                          vid = video.video._id || video.video.id || video.video.videoId;
                        }
                        
                        if (!vid) {
                          setError('No video to add');
                          setLoading(false);
                          return;
                        }
                        
                        const vidStr = String(vid);
                        const isValidVideoId = /^[0-9a-fA-F]{24}$/.test(vidStr);
                        const isBackendPlaylist = /^[0-9a-fA-F]{24}$/.test(p._id);
                        
                        console.log('🎬 Adding video to playlist:', {
                          playlistId: p._id,
                          playlistName: p.name,
                          videoId: vidStr,
                          isValidVideoId,
                          isBackendPlaylist,
                          isAuthenticated
                        });
                        
                        try {
                          // Create video object for local storage
                          const videoToAdd = makeLibraryVideoFromFeed(vidStr, {
                            src: video?.url || video?.videoUrl || video?.video?.url || video?.video?.videoUrl,
                            thumbnail: video?.thumbnail || video?.video?.thumbnail,
                            description: video?.description || video?.caption || video?.video?.description,
                            username: video?.username || video?.user?.username || video?.video?.user?.username,
                            avatar: video?.profileAvatar || video?.user?.profile?.avatar || video?.video?.user?.profile?.avatar
                          });
                          
                          if (isAuthenticated && isBackendPlaylist && isValidVideoId) {
                            // Both playlist and video are from backend - use API
                            console.log('🎬 Adding to backend API...');
                            await apiAddVideoToPlaylist(p._id, vidStr);
                            // Sync from backend
                            const response = await getMyPlaylists();
                            const normalized = Array.isArray(response)
                              ? response.map((playlist, index) => mapBackendPlaylist(playlist, index)).filter(Boolean)
                              : [];
                            setPlaylists(normalized);
                          } else {
                            // Demo video or local playlist - add to local store only
                            console.log('🎬 Adding to local store...');
                            console.log('🎬 Video object:', videoToAdd);
                            addToPlaylistLocal(p._id, videoToAdd);
                          }
                          
                          setError('✓ Video saved to "' + p.name + '"!');
                          
                          // Close after 1.5 seconds
                          setTimeout(() => onClose(), 1500);
                        } catch (err) {
                          console.error('Failed to add video:', err);
                          setError(err?.response?.data?.message || 'Failed to add video');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {isVideoInPlaylist && (
                        <div className="playlist-check">
                          <i className="fa-solid fa-check"></i>
                        </div>
                      )}
                      <div className="playlist-thumb-placeholder" style={{width: 60, height: 60, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        {p.videos?.[0]?.video?.thumbnail ? (
                          <img src={p.videos[0].video.thumbnail} alt="thumb" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}} />
                        ) : (
                          <i className="fa-solid fa-photo-film" style={{color: '#666', fontSize: 20}}></i>
                        )}
                      </div>
                      <div className="meta">
                        <div className="name">{p.name}</div>
                        <div className="count">{(p.videos || []).length} video{p.videos?.length === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="actions-column">
            <div className="actions">
              <p style={{color: '#aaa', fontSize: '14px', margin: '0 0 12px 0', textAlign: 'center'}}>
                👆 Click on a playlist above to save video
              </p>
              <button onClick={(e) => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }} className="cancel">
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
                            <div style={{width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                              {entry.video?.thumbnail ? (
                                <img src={entry.video.thumbnail} alt="v" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                              ) : (
                                <i className="fa-solid fa-video" style={{color: '#555', fontSize: 12}}></i>
                              )}
                            </div>
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
