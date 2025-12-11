import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMySavedSounds, removeSoundFromLibrary } from '../../api/music';
import './MySounds.css';

const MySounds = ({ onClose, onSelectSound }) => {
  const { user, isAuthenticated } = useAuth();
  const [savedSounds, setSavedSounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedSounds();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadSavedSounds = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMySavedSounds();
      if (response.success) {
        setSavedSounds(response.sounds || []);
      }
    } catch (err) {
      console.error('Error loading saved sounds:', err);
      setError('Failed to load saved sounds');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSound = async (soundId) => {
    try {
      const response = await removeSoundFromLibrary(soundId);
      if (response.success) {
        setSavedSounds(prev => prev.filter(s => s._id !== soundId));
      }
    } catch (err) {
      console.error('Error removing sound:', err);
      alert('Failed to remove sound');
    }
  };

  const handleSelectSound = (sound) => {
    if (onSelectSound) {
      onSelectSound(sound);
    }
    onClose();
  };

  return (
    <div className="my-sounds-overlay" onClick={onClose}>
      <div className="my-sounds-modal" onClick={(e) => e.stopPropagation()}>
        <div className="my-sounds-header">
          <button className="my-sounds-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>My Sounds</h2>
          <div className="my-sounds-header-placeholder"></div>
        </div>

        <div className="my-sounds-content">
          {loading ? (
            <div className="empty-sounds">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading sounds...</p>
            </div>
          ) : error ? (
            <div className="empty-sounds">
              <i className="fa-solid fa-exclamation-triangle"></i>
              <p>{error}</p>
              <button onClick={loadSavedSounds} style={{ marginTop: '10px', padding: '8px 16px' }}>
                Retry
              </button>
            </div>
          ) : !isAuthenticated ? (
            <div className="empty-sounds">
              <i className="fa-solid fa-lock"></i>
              <p>Please login to view saved sounds</p>
            </div>
          ) : savedSounds.length === 0 ? (
            <div className="empty-sounds">
              <i className="fa-solid fa-music"></i>
              <p>No saved sounds yet</p>
              <span>Save sounds you like to use them later</span>
            </div>
          ) : (
            <div className="sounds-list">
              {savedSounds.map(sound => (
                <div key={sound._id} className="sound-item">
                  <div className="sound-item-image">
                    <img src={sound.coverImage || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100'} alt={sound.name} />
                  </div>
                  <div className="sound-item-info">
                    <h3>{sound.name}</h3>
                    <p>{sound.artist}</p>
                    <span className="sound-plays">{sound.plays || '0'}</span>
                  </div>
                  <div className="sound-item-actions">
                    <button
                      className="use-sound-item-btn"
                      onClick={() => handleSelectSound(sound)}
                    >
                      Use
                    </button>
                    <button
                      className="remove-sound-btn"
                      onClick={() => handleRemoveSound(sound._id)}
                      title="Remove"
                    >
                      <i className="fa-solid fa-heart-broken"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MySounds;
