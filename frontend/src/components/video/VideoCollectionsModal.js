import React, { useState, useEffect } from 'react';
import { addVideoToPlaylist as apiAddVideoToPlaylist } from '../../api/collections';
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

const VideoCollectionsModal = ({ onClose, video }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('userPlaylists');
    if (raw) {
      try {
        setPlaylists(JSON.parse(raw));
      } catch (e) {
        setPlaylists([]);
      }
    }
  }, []);

  const persist = (next) => {
    setPlaylists(next);
    localStorage.setItem('userPlaylists', JSON.stringify(next));
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const p = {
      id: Date.now().toString(),
      name,
      videos: video ? [video] : [],
      createdAt: new Date().toISOString(),
      thumbnail: video?.thumbnail || video?.url || ''
    };
    const next = [...playlists, p];
    persist(next);
    setNewName('');
    setSelectedId(p.id);
  };

  const handleAddVideo = async (videoId) => {
    if (!selectedId) {
      alert('Please select a playlist first');
      return;
    }
    const next = playlists.map((p) => {
      if (p.id === selectedId) {
        const exists = (p.videos || []).some((v) => v._id === videoId || v.id === videoId);
        if (!exists) {
          const newEntry = { id: videoId };
          return { ...p, videos: [...(p.videos || []), newEntry] };
        }
      }
      return p;
    });
    persist(next);
    setShowAddModal(false);
    try {
      await apiAddVideoToPlaylist(selectedId, videoId);
    } catch (err) {
      console.warn('apiAddVideoToPlaylist failed', err);
    }
    alert('Video added to playlist');
  };

  const handleAddCurrentVideo = async () => {
    if (!selectedId) {
      alert('Please select a playlist first');
      return;
    }
    const vid = video?._id || video?.id || video?.videoId || null;
    if (!vid) {
      alert('No video id available to add');
      return;
    }
    const next = playlists.map((p) => (p.id === selectedId ? { ...p, videos: [...(p.videos || []), video] } : p));
    persist(next);
    try {
      await apiAddVideoToPlaylist(selectedId, vid);
    } catch (err) {
      console.warn('apiAddVideoToPlaylist failed', err);
    }
    alert('Current video added to playlist');
  };

  return (
    <div className="video-collections-overlay" onClick={onClose}>
      <div className="video-collections-modal" onClick={(e) => e.stopPropagation()}>
        <div className="collections-header">
          <button className="collections-close" onClick={onClose}>
            ✕
          </button>
          <h2>Save to Playlist</h2>
        </div>

        <div className="collections-body">
          <div className="playlists-column">
            <div className="create-row">
              <input
                placeholder="New playlist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button onClick={handleCreate}>Create</button>
            </div>

            <div className="playlists-list">
              {playlists.length === 0 ? (
                <div className="empty">No playlists yet</div>
              ) : (
                playlists.map((p) => (
                  <div
                    key={p.id}
                    className={`playlist-item${selectedId === p.id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <img src={p.thumbnail || 'https://via.placeholder.com/120x68'} alt="thumb" />
                    <div className="meta">
                      <div className="name">{p.name}</div>
                      <div className="count">{(p.videos || []).length} videos</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="actions-column">
            <div className="actions">
              <button onClick={handleAddCurrentVideo} disabled={!selectedId || !video}>
                Add current video
              </button>
              <button onClick={() => setShowAddModal(true)} disabled={!selectedId}>
                Add by video ID
              </button>
              <button onClick={onClose} className="cancel">
                Close
              </button>
            </div>

            <div className="preview">
              <h4>Selected playlist</h4>
              {selectedId ? (
                (() => {
                  const p = playlists.find((x) => x.id === selectedId);
                  return p ? (
                    <div className="playlist-preview">
                      <div className="preview-name">{p.name}</div>
                      <div className="preview-videos">
                        {(p.videos || []).slice(0, 6).map((v, idx) => (
                          <div key={v._id || v.id || idx} className="preview-video">
                            <img src={v.thumbnail || 'https://via.placeholder.com/120x68'} alt="v" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()
              ) : (
                <div className="empty">No playlist selected</div>
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
