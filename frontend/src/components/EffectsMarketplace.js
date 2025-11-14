import React, { useState, useEffect, useCallback } from 'react';
import './EffectsMarketplace.css';

const EffectsMarketplace = ({ onClose, onSelectEffect }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'trending', 'favorites'
  const [searchQuery, setSearchQuery] = useState('');
  const [previewEffect, setPreviewEffect] = useState(null);
  const [favoriteEffects, setFavoriteEffects] = useState([]);
  const videoPreviewRef = React.useRef(null);
  const [streamPreview, setStreamPreview] = useState(null);

  const categories = [
    { id: 'all', label: 'All', icon: 'fa-solid fa-layer-group' },
    { id: 'face', label: 'Face', icon: 'fa-solid fa-face-smile' },
    { id: 'beauty', label: 'Beauty', icon: 'fa-solid fa-sparkles' },
    { id: 'funny', label: 'Funny', icon: 'fa-solid fa-face-laugh' },
    { id: 'animal', label: 'Animal', icon: 'fa-solid fa-paw' },
    { id: 'trending', label: 'Trending', icon: 'fa-solid fa-fire' },
    { id: 'ar', label: 'AR', icon: 'fa-solid fa-cube' },
    { id: 'background', label: 'Background', icon: 'fa-solid fa-image' },
  ];

  const [effects] = useState([
    {
      id: 1,
      name: 'Glowing Beauty',
      category: 'beauty',
      icon: '✨',
      preview: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      description: 'Adds a subtle glow to your skin',
      creator: '@beautycreator',
      uses: '2.5M',
      isTrending: true,
      isAR: true
    },
    {
      id: 2,
      name: 'Cartoon Face',
      category: 'face',
      icon: '🎨',
      preview: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      description: 'Transforms your face into a cartoon',
      creator: '@funcreator',
      uses: '5.8M',
      isTrending: true,
      isAR: true
    },
    {
      id: 3,
      name: 'Cat Ears',
      category: 'animal',
      icon: '🐱',
      preview: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
      description: 'Cute cat ears and whiskers',
      creator: '@petlover',
      uses: '12.3M',
      isTrending: false,
      isAR: true
    },
    {
      id: 4,
      name: 'Vintage Film',
      category: 'background',
      icon: '📷',
      preview: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
      description: 'Classic vintage film look',
      creator: '@vintage',
      uses: '8.9M',
      isTrending: true,
      isAR: false
    },
    {
      id: 5,
      name: 'Rainbow Hair',
      category: 'beauty',
      icon: '🌈',
      preview: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      description: 'Colorful rainbow hair effect',
      creator: '@colorcreator',
      uses: '3.2M',
      isTrending: false,
      isAR: true
    },
    {
      id: 6,
      name: 'Big Eyes',
      category: 'face',
      icon: '👀',
      preview: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      description: 'Makes your eyes bigger',
      creator: '@beautycreator',
      uses: '15.7M',
      isTrending: true,
      isAR: true
    },
    {
      id: 7,
      name: 'Dancing Penguin',
      category: 'funny',
      icon: '🐧',
      preview: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
      description: 'Dancing penguin companion',
      creator: '@funcreator',
      uses: '6.4M',
      isTrending: false,
      isAR: true
    },
    {
      id: 8,
      name: 'Space Background',
      category: 'background',
      icon: '🚀',
      preview: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
      description: 'Starry space background',
      creator: '@space',
      uses: '4.1M',
      isTrending: true,
      isAR: false
    },
    {
      id: 9,
      name: 'Slim Face',
      category: 'beauty',
      icon: '💎',
      preview: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      description: 'Subtle face slimming effect',
      creator: '@beautycreator',
      uses: '9.6M',
      isTrending: false,
      isAR: true
    },
    {
      id: 10,
      name: 'Virtual Glasses',
      category: 'face',
      icon: '🥽',
      preview: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      description: 'Try on virtual glasses',
      creator: '@fashion',
      uses: '7.3M',
      isTrending: true,
      isAR: true
    },
  ]);

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
