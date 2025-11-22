import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTrendingSounds, searchSounds, saveSoundToLibrary } from '../api/music';
import './TrendingSoundsPage.css';

const TrendingSoundsPage = ({ onClose, onSelectSound }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewSoundId, setPreviewSoundId] = useState(null);
  const [sounds, setSounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);
  const audioRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All', icon: '🎵' },
    { id: 'trending', label: 'Trending', icon: '🔥' },
    { id: 'hip-hop', label: 'Hip Hop', icon: '🎤' },
    { id: 'pop', label: 'Pop', icon: '🎧' },
    { id: 'electronic', label: 'Electronic', icon: '⚡' },
    { id: 'rock', label: 'Rock', icon: '🎸' },
    { id: 'r&b', label: 'R&B', icon: '🎹' },
    { id: 'country', label: 'Country', icon: '🎻' },
  ];

  useEffect(() => {
    loadSounds();
  }, [activeCategory]);

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 500);
    } else if (searchQuery.length === 0) {
      loadSounds();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadSounds = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTrendingSounds(50, activeCategory);
      if (response.success) {
        setSounds(response.sounds || []);
      }
    } catch (err) {
      console.error('Error loading sounds:', err);
      setError('Failed to load sounds');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const performSearch = async () => {
    if (searchQuery.length < 2) return;
    
    try {
      setSearching(true);
      setError(null);
      const response = await searchSounds(searchQuery, 50, activeCategory);
      if (response.success) {
        setSounds(response.sounds || []);
      }
    } catch (err) {
      console.error('Error searching sounds:', err);
      setError('Failed to search sounds');
    } finally {
      setSearching(false);
    }
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSearchQuery(''); // Clear search when changing category
  };

  const handlePreview = (sound) => {
    if (previewSoundId === sound._id) {
      // Stop preview
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPreviewSoundId(null);
    } else {
      // Stop previous preview
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Start new preview
      setPreviewSoundId(sound._id);
      if (sound.audioUrl) {
        const audio = new Audio(sound.audioUrl);
        audioRef.current = audio;
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          setPreviewSoundId(null);
        });
        
        audio.onended = () => {
          setPreviewSoundId(null);
          audioRef.current = null;
        };
      }
    }
  };

  const handleSaveSound = async (soundId, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please login to save sounds');
      return;
    }

    try {
      const response = await saveSoundToLibrary(soundId);
      if (response.success) {
        // Update the sound in the list to show it's saved
        setSounds(prev => prev.map(s => 
          s._id === soundId ? { ...s, isSaved: true } : s
        ));
      }
    } catch (err) {
      console.error('Error saving sound:', err);
      alert('Failed to save sound');
    }
  };

  const handleSelectSound = (sound) => {
    if (onSelectSound) {
      onSelectSound(sound);
    }
    onClose();
  };

  return (
    <div className="trending-sounds-overlay" onClick={onClose}>
      <div className="trending-sounds-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="trending-sounds-header">
          <button className="trending-sounds-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Trending Sounds</h2>
          <div className="trending-sounds-header-placeholder"></div>
        </div>

        {/* Search Bar */}
        <div className="trending-sounds-search">
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sound-search-input"
            disabled={loading}
          />
          {searching && (
            <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '10px' }}></i>
          )}
        </div>

        {/* Categories */}
        <div className="trending-sounds-categories">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`sound-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
              disabled={loading}
            >
              <span className="category-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Sounds Grid */}
        <div className="trending-sounds-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
              <p>Loading sounds...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '24px' }}></i>
              <p>{error}</p>
              <button onClick={loadSounds} style={{ marginTop: '10px', padding: '8px 16px' }}>
                Retry
              </button>
            </div>
          ) : sounds.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fa-solid fa-music" style={{ fontSize: '24px' }}></i>
              <p>No sounds found</p>
            </div>
          ) : (
            <div className="sounds-grid">
              {sounds.map(sound => (
                <div key={sound._id} className="sound-card">
                  <div className="sound-card-image">
                    <img src={sound.coverImage || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200'} alt={sound.name} />
                    <div className="sound-card-overlay">
                      <button
                        className="preview-btn"
                        onClick={() => handlePreview(sound)}
                      >
                        {previewSoundId === sound._id ? (
                          <i className="fa-solid fa-pause"></i>
                        ) : (
                          <i className="fa-solid fa-play"></i>
                        )}
                      </button>
                    </div>
                    {sound.isOriginal && (
                      <div className="original-badge">
                        <i className="fa-solid fa-music"></i>
                        Original
                      </div>
                    )}
                  </div>
                  <div className="sound-card-info">
                    <h3>{sound.name}</h3>
                    <p className="sound-artist">{sound.artist}</p>
                    <div className="sound-stats">
                      <span>
                        <i className="fa-solid fa-play"></i>
                        {sound.plays || '0'}
                      </span>
                      <span>{sound.formattedDuration || sound.duration || '0:00'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="use-sound-btn"
                        onClick={() => handleSelectSound(sound)}
                        style={{ flex: 1 }}
                      >
                        Use this sound
                      </button>
                      {isAuthenticated && (
                        <button
                          className="save-sound-btn"
                          onClick={(e) => handleSaveSound(sound._id, e)}
                          title="Save to library"
                          style={{ padding: '8px 12px' }}
                        >
                          <i className={`fa-solid ${sound.isSaved ? 'fa-heart' : 'fa-heart'}`}></i>
                        </button>
                      )}
                    </div>
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

export default TrendingSoundsPage;
