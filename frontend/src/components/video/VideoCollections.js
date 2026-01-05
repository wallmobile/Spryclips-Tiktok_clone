// Modal component for adding video by ID
const AddVideoModal = ({ open, onClose, onAdd }) => {
  const [videoId, setVideoId] = React.useState('');
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
        <h3>Add Video to Playlist</h3>
        <input
          type="text"
          placeholder="Enter Video ID"
          value={videoId}
          onChange={e => setVideoId(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => { onAdd(videoId); setVideoId(''); }}>Add</button>
        </div>
      </div>
    </div>
  );
};
  const [selectedPlaylistId, setSelectedPlaylistId] = React.useState(null);
  const [showAddVideoModal, setShowAddVideoModal] = React.useState(false);
// Modal component for adding video by ID
const AddVideoModal = ({ open, onClose, onAdd }) => {
  const [videoId, setVideoId] = React.useState('');
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
        <h3>Add Video to Playlist</h3>
        <input
          type="text"
          placeholder="Enter Video ID"
          value={videoId}
          onChange={e => setVideoId(e.target.value)}
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => { onAdd(videoId); setVideoId(''); }}>Add</button>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { addVideoToPlaylist } from '../../api/collections';
import { useAuth } from '../../context/AuthContext';
import './VideoCollections.css';

const VideoCollections = ({ onClose, video }) => {
  const { user } = useAuth();
  useEffect(() => {
    console.log('VideoCollections mounted', { video });
    return () => console.log('VideoCollections unmounted');
  }, [video]);
  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists', 'series', 'collections', 'watchlater'
  const [playlists, setPlaylists] = useState([]);
  const [series, setSeries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [watchLater, setWatchLater] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  useEffect(() => {
    // Load saved data from localStorage
    const savedPlaylists = localStorage.getItem('userPlaylists');
    const savedSeries = localStorage.getItem('userSeries');
    const savedCollections = localStorage.getItem('userCollections');
    const savedWatchLater = localStorage.getItem('watchLater');

    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
    if (savedSeries) setSeries(JSON.parse(savedSeries));
    if (savedCollections) setCollections(JSON.parse(savedCollections));
    if (savedWatchLater) setWatchLater(JSON.parse(savedWatchLater));
  }, []);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = {
        id: Date.now(),
        name: newPlaylistName.trim(),
        videos: video ? [video] : [],
        createdAt: new Date().toISOString(),
        thumbnail: video?.thumbnail || video?.url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200'
      };
      const updated = [...playlists, newPlaylist];
      setPlaylists(updated);
      localStorage.setItem('userPlaylists', JSON.stringify(updated));
          {activeTab === 'playlists' && (
            <div className="collections-tab-content">
              <div className="create-new-section">
                {!showCreatePlaylist ? (
                  <button
                    className="create-new-btn"
                    onClick={() => setShowCreatePlaylist(true)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Create New Playlist</span>
                  </button>
                ) : (
                  <div className="create-form">
                    <input
                      type="text"
                      placeholder="Enter playlist name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="create-input"
                      autoFocus
                    />
                    <div className="create-actions">
                      <button
                        className="cancel-create-btn"
                        onClick={() => {
                          setShowCreatePlaylist(false);
                          setNewPlaylistName('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="confirm-create-btn"
                        onClick={handleCreatePlaylist}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="collections-list">
                {playlists.length === 0 ? (
                  <div className="empty-collections">
                    <i className="fa-solid fa-list"></i>
                    <p>No playlists yet</p>
                    <span>Create your first playlist to organize videos</span>
                  </div>
                ) : (
                  playlists.map(playlist => (
                    <div key={playlist._id || playlist.id} className={`collection-item${selectedPlaylistId === (playlist._id || playlist.id) ? ' selected' : ''}`} onClick={() => setSelectedPlaylistId(playlist._id || playlist.id)}>
                      <div className="collection-thumbnail">
                        <img src={playlist.thumbnail} alt={playlist.name} />
                        <div className="video-count">{playlist.videos.length}</div>
                      </div>
                      <div className="collection-info">
                        <h3>{playlist.name}</h3>
                        <p>{playlist.videos.length} {playlist.videos.length === 1 ? 'video' : 'videos'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Playlist details pane: show Add Video button always when a playlist is selected */}
              {selectedPlaylistId && (
                <div style={{ marginTop: 32, textAlign: 'center' }}>
                  <button
                    style={{ padding: '10px 24px', fontSize: 16, borderRadius: 6, background: '#ff2d55', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 16 }}
                    onClick={() => setShowAddVideoModal(true)}
                  >
                    + Add Video
                  </button>
                  <AddVideoModal
                    open={showAddVideoModal}
                    onClose={() => setShowAddVideoModal(false)}
                    onAdd={async (videoId) => {
                      try {
                        await addVideoToPlaylist(selectedPlaylistId, videoId);
                        alert('Video added to playlist!');
                        setShowAddVideoModal(false);
                      } catch (err) {
                        alert('Failed to add video to playlist!');
                      }
                    }}
                  />
                  {/* Show 'No videos yet' message below the button if playlist is empty */}
                  {(() => {
                    const playlist = playlists.find(p => (p._id || p.id) === selectedPlaylistId);
                    if (playlist && (!playlist.videos || playlist.videos.length === 0)) {
                      return (
                        <div style={{ marginTop: 24, color: '#fff', opacity: 0.7 }}>
                          <i className="fa-solid fa-video-slash" style={{ fontSize: 48, marginBottom: 8 }}></i>
                          <div>No videos yet</div>
                          <div style={{ fontSize: 14, marginTop: 4 }}>Add videos to this playlist using the button above.</div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          )}
          ? { ...c, videos: [...c.videos, video] }
          : c
      );
      setCollections(updated);
      localStorage.setItem('userCollections', JSON.stringify(updated));
      alert('Video added to collection!');
    }
  };

  const handleAddToWatchLater = () => {
    if (video) {
      const exists = watchLater.find(v => v.id === video.id);
      if (!exists) {
        const updated = [...watchLater, { ...video, addedAt: new Date().toISOString() }];
        setWatchLater(updated);
        localStorage.setItem('watchLater', JSON.stringify(updated));
        alert('Added to Watch Later!');
      } else {
        alert('Video already in Watch Later!');
      }
    }
  };

  const handleRemoveFromWatchLater = (videoId) => {
    const updated = watchLater.filter(v => v.id !== videoId);
    setWatchLater(updated);
    localStorage.setItem('watchLater', JSON.stringify(updated));
  };

  return (
    <div className="video-collections-overlay" onClick={onClose}>
      <div className="video-collections-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="collections-header">
          <button className="collections-close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Save to Collection</h2>
          <div className="collections-header-placeholder"></div>
        </div>

        {/* Tabs */}
        <div className="collections-tabs">
          <button
            className={`collection-tab ${activeTab === 'playlists' ? 'active' : ''}`}
            onClick={() => setActiveTab('playlists')}
          >
            <i className="fa-solid fa-list"></i>
            <span>Playlists</span>
            {playlists.length > 0 && <span className="tab-count">{playlists.length}</span>}
          </button>
          <button
            className={`collection-tab ${activeTab === 'series' ? 'active' : ''}`}
            onClick={() => setActiveTab('series')}
          >
            <i className="fa-solid fa-tv"></i>
            <span>Series</span>
            {series.length > 0 && <span className="tab-count">{series.length}</span>}
          </button>
          <button
            className={`collection-tab ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            <i className="fa-solid fa-folder"></i>
            <span>Collections</span>
            {collections.length > 0 && <span className="tab-count">{collections.length}</span>}
          </button>
          <button
            className={`collection-tab ${activeTab === 'watchlater' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlater')}
          >
            <i className="fa-solid fa-clock"></i>
            <span>Watch Later</span>
            {watchLater.length > 0 && <span className="tab-count">{watchLater.length}</span>}
          </button>
        </div>

        {/* Content */}
        <div className="collections-content">
          {/* Playlists Tab */}
          {activeTab === 'playlists' && (
            <div className="collections-tab-content">
              <div className="create-new-section">
                {!showCreatePlaylist ? (
                  <button
                    className="create-new-btn"
                    onClick={() => setShowCreatePlaylist(true)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Create New Playlist</span>
                  </button>
                ) : (
                  <div className="create-form">
                    <input
                      type="text"
                      placeholder="Enter playlist name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="create-input"
                      autoFocus
                    />
                    <div className="create-actions">
                      <button
                        className="cancel-create-btn"
                        onClick={() => {
                          setShowCreatePlaylist(false);
                          setNewPlaylistName('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="confirm-create-btn"
                        onClick={handleCreatePlaylist}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="collections-list">
                {playlists.length === 0 ? (
                  <div className="empty-collections">
                    <i className="fa-solid fa-list"></i>
                    <p>No playlists yet</p>
                    <span>Create your first playlist to organize videos</span>
                  </div>
                ) : (
                  playlists.map(playlist => (
                    <div key={playlist._id || playlist.id} className="collection-item">
                      <div className="collection-thumbnail">
                        <img src={playlist.thumbnail} alt={playlist.name} />
                        <div className="video-count">{playlist.videos.length}</div>
                      </div>
                      <div className="collection-info">
                        <h3>{playlist.name}</h3>
                        <p>{playlist.videos.length} {playlist.videos.length === 1 ? 'video' : 'videos'}</p>
                      </div>
                      <button
                        className="add-to-collection-btn"
                        onClick={() => setSelectedPlaylistId(playlist._id || playlist.id)}
                      >
                        <i className="fa-solid fa-plus"></i>
                        Add Video
                      </button>
                    </div>
                  ))
                )}
                {/* Single AddVideoModal for selected playlist */}
                <AddVideoModal
                  open={!!selectedPlaylistId}
                  onClose={() => setSelectedPlaylistId(null)}
                  onAdd={async (videoId) => {
                    try {
                      await addVideoToPlaylist(selectedPlaylistId, videoId);
                      alert('Video added to playlist!');
                      setSelectedPlaylistId(null);
                    } catch (err) {
                      alert('Failed to add video to playlist!');
                    }
                  }}
                />
              </div>
            // Playlist details with Add Video button/modal
            function PlaylistDetailsWithAddVideo({ playlist }) {
              const [showAddVideoModal, setShowAddVideoModal] = React.useState(false);
              const handleAddVideo = async (videoId) => {
                try {
                  await addVideoToPlaylist(playlist._id || playlist.id, videoId);
                  alert('Video added to playlist!');
                  setShowAddVideoModal(false);
                } catch (err) {
                  alert('Failed to add video to playlist!');
                }
              };
              return (
                <div className="collection-item">
                  <div className="collection-thumbnail">
                    <img src={playlist.thumbnail} alt={playlist.name} />
                    <div className="video-count">{playlist.videos.length}</div>
                  </div>
                  <div className="collection-info">
                    <h3>{playlist.name}</h3>
                    <p>{playlist.videos.length} {playlist.videos.length === 1 ? 'video' : 'videos'}</p>
                  </div>
                  <button
                    className="add-to-collection-btn"
                    onClick={() => setShowAddVideoModal(true)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    Add Video
                  </button>
                  {showAddVideoModal && (
                    <AddVideoModal
                      open={showAddVideoModal}
                      onClose={() => setShowAddVideoModal(false)}
                      onAdd={handleAddVideo}
                    />
                  )}
                </div>
              );
            }
            </div>
          )}

          {/* Series Tab */}
          {activeTab === 'series' && (
            <div className="collections-tab-content">
              <div className="create-new-section">
                {!showCreateSeries ? (
                  <button
                    className="create-new-btn"
                    onClick={() => setShowCreateSeries(true)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Create New Series</span>
                  </button>
                ) : (
                  <div className="create-form">
                    <input
                      type="text"
                      placeholder="Enter series name"
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      className="create-input"
                      autoFocus
                    />
                    <div className="create-actions">
                      <button
                        className="cancel-create-btn"
                        onClick={() => {
                          setShowCreateSeries(false);
                          setNewSeriesName('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="confirm-create-btn"
                        onClick={handleCreateSeries}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="collections-list">
                {series.length === 0 ? (
                  <div className="empty-collections">
                    <i className="fa-solid fa-tv"></i>
                    <p>No series yet</p>
                    <span>Create a series to group related videos</span>
                  </div>
                ) : (
                  series.map(serie => (
                    <div key={serie.id} className="collection-item">
                      <div className="collection-thumbnail">
                        <img src={serie.thumbnail} alt={serie.name} />
                        <div className="video-count">{serie.episodeNumber}</div>
                      </div>
                      <div className="collection-info">
                        <h3>{serie.name}</h3>
                        <p>Episode {serie.episodeNumber}</p>
                      </div>
                      <button
                        className="add-to-collection-btn"
                        onClick={() => handleAddToSeries(serie.id)}
                      >
                        <i className="fa-solid fa-plus"></i>
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="collections-tab-content">
              <div className="create-new-section">
                {!showCreateCollection ? (
                  <button
                    className="create-new-btn"
                    onClick={() => setShowCreateCollection(true)}
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Create New Collection</span>
                  </button>
                ) : (
                  <div className="create-form">
                    <input
                      type="text"
                      placeholder="Enter collection name"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="create-input"
                      autoFocus
                    />
                    <div className="create-actions">
                      <button
                        className="cancel-create-btn"
                        onClick={() => {
                          setShowCreateCollection(false);
                          setNewCollectionName('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="confirm-create-btn"
                        onClick={handleCreateCollection}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="collections-list">
                {collections.length === 0 ? (
                  <div className="empty-collections">
                    <i className="fa-solid fa-folder"></i>
                    <p>No collections yet</p>
                    <span>Create collections to organize your favorite videos</span>
                  </div>
                ) : (
                  collections.map(collection => (
                    <div key={collection.id} className="collection-item">
                      <div className="collection-thumbnail">
                        <img src={collection.thumbnail} alt={collection.name} />
                        <div className="video-count">{collection.videos.length}</div>
                      </div>
                      <div className="collection-info">
                        <h3>{collection.name}</h3>
                        <p>{collection.videos.length} {collection.videos.length === 1 ? 'video' : 'videos'}</p>
                      </div>
                      <button
                        className="add-to-collection-btn"
                        onClick={() => handleAddToCollection(collection.id)}
                      >
                        <i className="fa-solid fa-plus"></i>
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Watch Later Tab */}
          {activeTab === 'watchlater' && (
            <div className="collections-tab-content">
              <div className="watch-later-actions">
                {video && (
                  <button
                    className="add-watch-later-btn"
                    onClick={handleAddToWatchLater}
                  >
                    <i className="fa-solid fa-clock"></i>
                    <span>Add to Watch Later</span>
                  </button>
                )}
              </div>

              <div className="collections-list">
                {watchLater.length === 0 ? (
                  <div className="empty-collections">
                    <i className="fa-solid fa-clock"></i>
                    <p>Watch Later is empty</p>
                    <span>Save videos to watch them later</span>
                  </div>
                ) : (
                  watchLater.map(v => (
                    <div key={v.id} className="collection-item">
                      <div className="collection-thumbnail">
                        <img src={v.thumbnail || v.url} alt={v.description} />
                      </div>
                      <div className="collection-info">
                        <h3>{v.description || 'Video'}</h3>
                        <p>Added {new Date(v.addedAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveFromWatchLater(v.id)}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCollections;
