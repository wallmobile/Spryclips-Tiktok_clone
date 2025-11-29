import React, { useState, useEffect, useCallback } from 'react';
import { getEffects, toggleFavoriteEffect, getFavoriteEffects } from '../api/effects';
import './EffectsMarketplace.css';

const EffectsMarketplace = ({ onClose, onSelectEffect }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewEffect, setPreviewEffect] = useState(null);
  const [favoriteEffects, setFavoriteEffects] = useState([]);
  const [effects, setEffects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoPreviewRef = React.useRef(null);
  const [streamPreview, setStreamPreview] = useState(null);

  const categories = [
    { id: 'all', label: 'All', icon: 'fa-solid fa-layer-group' },
    { id: 'face', label: 'Face', icon: 'fa-solid fa-face-smile' },
    { id: 'filter', label: 'Filter', icon: 'fa-solid fa-wand-magic-sparkles' },
    { id: 'ar', label: 'AR', icon: 'fa-solid fa-cube' },
    { id: 'background', label: 'Background', icon: 'fa-solid fa-image' },
    { id: 'sound', label: 'Sound', icon: 'fa-solid fa-music' },
  ];

  // Fetch effects from backend
  useEffect(() => {
    const fetchEffects = async () => {
      setLoading(true);
      try {
        const params = {};
        if (activeCategory !== 'all') {
          params.category = activeCategory;
        }
        if (activeTab === 'trending') {
          params.sort = 'popular';
        }
        
        const response = await getEffects(params);
        if (response.success) {
          setEffects(response.effects.map(effect => ({
            id: effect._id,
            name: effect.name,
            category: effect.category,
            icon: effect.iconUrl || '✨',
            preview: effect.thumbnailUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
            description: effect.description,
            creator: effect.creator?.username ? `@${effect.creator.username}` : '@tiktok',
            uses: formatNumber(effect.usageCount || 0),
            isTrending: effect.isFeatured || effect.usageCount > 50000,
            isAR: effect.category === 'ar',
            favoritesCount: effect.favoritesCount || 0
          })));
        }
      } catch (err) {
        console.error('Failed to fetch effects:', err);
        setError('Failed to load effects');
        // Use fallback data if API fails
        setEffects(fallbackEffects);
      } finally {
        setLoading(false);
      }
    };

    fetchEffects();
  }, [activeCategory, activeTab]);

  // Format number helper
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Fallback effects if API fails
  const fallbackEffects = [
    { id: 1, name: 'Glow Up', category: 'face', icon: '✨', preview: 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=300', description: 'Smooth skin with a natural glow', creator: '@beauty', uses: '125K', isTrending: true, isAR: false },
    { id: 2, name: 'Cat Face', category: 'face', icon: '🐱', preview: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300', description: 'Cute cat ears and whiskers', creator: '@funfilters', uses: '98K', isTrending: true, isAR: true },
    { id: 3, name: 'Golden Hour', category: 'filter', icon: '🌅', preview: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=300', description: 'Warm golden light effect', creator: '@aesthetic', uses: '87K', isTrending: true, isAR: false },
    { id: 4, name: 'Rainbow Trail', category: 'ar', icon: '🌈', preview: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=300', description: 'Colorful rainbow trailing effect', creator: '@armaster', uses: '156K', isTrending: true, isAR: true },
    { id: 5, name: 'Beach Vibes', category: 'background', icon: '🏖️', preview: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300', description: 'Virtual beach background', creator: '@travel', uses: '82K', isTrending: false, isAR: false },
    { id: 6, name: 'Vintage Film', category: 'filter', icon: '📷', preview: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=300', description: 'Classic vintage film look', creator: '@retro', uses: '91K', isTrending: true, isAR: false },
    { id: 7, name: 'Heart Particles', category: 'ar', icon: '💕', preview: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300', description: 'Floating heart particles', creator: '@love', uses: '134K', isTrending: true, isAR: true },
    { id: 8, name: 'Voice Changer', category: 'sound', icon: '🎤', preview: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300', description: 'Change your voice style', creator: '@audio', uses: '78K', isTrending: false, isAR: false },
  ];

  useEffect(() => {
    // Load favorites from localStorage
    const stored = localStorage.getItem('favoriteEffects');
    if (stored) {
      setFavoriteEffects(JSON.parse(stored));
    }
  }, []);

  const startPreview = async (effect) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        setStreamPreview(stream);
        setPreviewEffect(effect);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopPreview = useCallback(() => {
    if (streamPreview) {
      streamPreview.getTracks().forEach(track => track.stop());
      setStreamPreview(null);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    }
    setPreviewEffect(null);
  }, [streamPreview]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  const toggleFavorite = (effectId) => {
    const newFavorites = favoriteEffects.includes(effectId)
      ? favoriteEffects.filter(id => id !== effectId)
      : [...favoriteEffects, effectId];
    
    setFavoriteEffects(newFavorites);
    localStorage.setItem('favoriteEffects', JSON.stringify(newFavorites));
  };

  const filteredEffects = effects.filter(effect => {
    const matchesCategory = activeCategory === 'all' || effect.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      effect.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'trending') {
      return matchesCategory && matchesSearch && effect.isTrending;
    } else if (activeTab === 'favorites') {
      return matchesCategory && matchesSearch && favoriteEffects.includes(effect.id);
    }
    
    return matchesCategory && matchesSearch;
  });

  const handleSelectEffect = (effect) => {
    if (onSelectEffect) {
      onSelectEffect(effect);
    }
    stopPreview();
    onClose();
  };

  return (
    <div className="effects-marketplace-overlay" onClick={onClose}>
      <div className="effects-marketplace-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="effects-marketplace-header">
          <button className="effects-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Effects Marketplace</h2>
          <div className="effects-header-placeholder"></div>
        </div>

        {/* Tabs */}
        <div className="effects-tabs">
          <button
            className={`effects-tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            <i className="fa-solid fa-compass"></i>
            <span>Browse</span>
          </button>
          <button
            className={`effects-tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            <i className="fa-solid fa-fire"></i>
            <span>Trending</span>
            <span className="tab-badge">
              {effects.filter(e => e.isTrending).length}
            </span>
          </button>
          <button
            className={`effects-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <i className="fa-solid fa-heart"></i>
            <span>Favorites</span>
            {favoriteEffects.length > 0 && (
              <span className="tab-badge">{favoriteEffects.length}</span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="effects-search">
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="effects-search-input"
          />
        </div>

        {/* Categories */}
        <div className="effects-categories">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`effect-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <i className={cat.icon}></i>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Effects Grid */}
        <div className="effects-content">
          {filteredEffects.length === 0 ? (
            <div className="effects-empty">
              <i className="fa-solid fa-search"></i>
              <p>No effects found</p>
              <span>Try adjusting your filters</span>
            </div>
          ) : (
            <div className="effects-grid">
              {filteredEffects.map(effect => (
                <div key={effect.id} className="effect-card">
                  <div className="effect-card-image">
                    <img src={effect.preview} alt={effect.name} />
                    {effect.isTrending && (
                      <div className="trending-badge">
                        <i className="fa-solid fa-fire"></i>
                        Trending
                      </div>
                    )}
                    {effect.isAR && (
                      <div className="ar-badge">
                        <i className="fa-solid fa-cube"></i>
                        AR
                      </div>
                    )}
                    <div className="effect-card-overlay">
                      <button
                        className="preview-effect-btn"
                        onClick={() => startPreview(effect)}
                      >
                        <i className="fa-solid fa-play"></i>
                        Preview
                      </button>
                    </div>
                  </div>
                  <div className="effect-card-info">
                    <div className="effect-card-header">
                      <div className="effect-icon">{effect.icon}</div>
                      <button
                        className={`favorite-effect-btn ${favoriteEffects.includes(effect.id) ? 'active' : ''}`}
                        onClick={() => toggleFavorite(effect.id)}
                      >
                        <i className="fa-solid fa-heart"></i>
                      </button>
                    </div>
                    <h3>{effect.name}</h3>
                    <p className="effect-description">{effect.description}</p>
                    <div className="effect-stats">
                      <span>
                        <i className="fa-solid fa-user"></i>
                        {effect.creator}
                      </span>
                      <span>
                        <i className="fa-solid fa-play"></i>
                        {effect.uses}
                      </span>
                    </div>
                    <button
                      className="use-effect-btn"
                      onClick={() => handleSelectEffect(effect)}
                    >
                      <i className="fa-solid fa-check"></i>
                      Use Effect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewEffect && (
          <div className="effect-preview-modal">
            <div className="effect-preview-content">
              <div className="preview-header">
                <h3>{previewEffect.name}</h3>
                <button className="preview-close-btn" onClick={stopPreview}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="preview-video-container">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  className="preview-video"
                />
                <div className="preview-overlay">
                  <div className="preview-info">
                    <span className="preview-effect-name">{previewEffect.name}</span>
                    <span className="preview-hint">Move your face to see the effect</span>
                  </div>
                </div>
              </div>
              <div className="preview-actions">
                <button className="preview-cancel-btn" onClick={stopPreview}>
                  Cancel
                </button>
                <button
                  className="preview-use-btn"
                  onClick={() => handleSelectEffect(previewEffect)}
                >
                  <i className="fa-solid fa-check"></i>
                  Use This Effect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EffectsMarketplace;
