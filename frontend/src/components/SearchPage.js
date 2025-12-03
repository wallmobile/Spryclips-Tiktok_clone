import React, { useState, useRef, useEffect, useCallback } from 'react';
import { searchAll } from '../api/search';
import './SearchPage.css';

const SearchPage = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState({ videos: [], users: [], hashtags: [], music: [] });
  const [hasSearched, setHasSearched] = useState(false);
  const [showVideoFeed, setShowVideoFeed] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [playingStates, setPlayingStates] = useState({});
  const [videoAspectRatios, setVideoAspectRatios] = useState({}); // Store aspect ratios for each video
  const searchInputRef = useRef(null);
  const videoFeedRef = useRef(null);
  const videoRefs = useRef({});
  const containerRefs = useRef({}); // Store container refs for each video

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchError('Please enter a keyword to search.');
      searchInputRef.current?.focus();
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchError('Try a slightly longer search (2+ characters).');
      searchInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const data = await searchAll(trimmedQuery);
      // Backend returns results nested in 'results' object
      const resultsData = data.results || data;
      setSearchResults({
        videos: resultsData.videos || data.videos || [],
        users: resultsData.users || data.users || [],
        hashtags: resultsData.hashtags || data.hashtags || [],
        music: resultsData.music || data.music || []
      });
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Something went wrong. Please try again.');
      setSearchResults({ videos: [], users: [], hashtags: [], music: [] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchError('');
    setSearchResults({ videos: [], users: [], hashtags: [], music: [] });
    setHasSearched(false);
    searchInputRef.current?.focus();
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count?.toString() || '0';
  };

  const handleVideoClick = (video) => {
    // Find index of clicked video
    const index = searchResults.videos.findIndex(v => (v._id || v.id) === (video._id || video.id));
    setCurrentVideoIndex(index >= 0 ? index : 0);
    setShowVideoFeed(true);
    setPlayingStates({ [index >= 0 ? index : 0]: true });
  };

  const closeVideoFeed = () => {
    setShowVideoFeed(false);
    setCurrentVideoIndex(0);
    setPlayingStates({});
    // Pause all videos
    Object.values(videoRefs.current).forEach(ref => {
      if (ref) ref.pause();
    });
  };

  // Calculate and store video aspect ratio for each video
  useEffect(() => {
    if (!showVideoFeed || searchResults.videos.length === 0) return;
    
    const cleanupFunctions = [];

    // Use setTimeout to ensure DOM elements are rendered
    const timeoutId = setTimeout(() => {
      searchResults.videos.forEach((video, index) => {
        const videoElement = videoRefs.current[index];
        const container = containerRefs.current[index];
        if (!videoElement || !container) return;

        const updateAspectRatio = () => {
          if (videoElement.videoWidth && videoElement.videoHeight) {
            const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            
            // Apply aspect ratio to container via CSS custom property
            container.style.setProperty('--video-aspect-ratio', aspectRatio.toString());
            container.style.setProperty('--video-width', `${videoElement.videoWidth}px`);
            container.style.setProperty('--video-height', `${videoElement.videoHeight}px`);
            
            // Store aspect ratio in state
            setVideoAspectRatios(prev => ({
              ...prev,
              [index]: aspectRatio
            }));
          }
        };

        const handleLoadedMetadata = () => {
          updateAspectRatio();
        };

        const handleLoadedData = () => {
          updateAspectRatio();
        };

        // Check if metadata is already loaded
        if (videoElement.readyState >= 1) {
          updateAspectRatio();
        } else {
          videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement.addEventListener('loadeddata', handleLoadedData);
          cleanupFunctions.push(() => {
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('loadeddata', handleLoadedData);
          });
        }

        // Also recalculate on window resize
        const handleResize = () => {
          updateAspectRatio();
        };

        window.addEventListener('resize', handleResize);
        cleanupFunctions.push(() => {
          window.removeEventListener('resize', handleResize);
        });
      });
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [searchResults.videos, showVideoFeed]);

  // Handle scroll to change current video
  const handleScroll = useCallback(() => {
    if (!videoFeedRef.current) return;
    
    const container = videoFeedRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < searchResults.videos.length) {
      setCurrentVideoIndex(newIndex);
      // Update playing states - only current video plays
      setPlayingStates({ [newIndex]: true });
    }
  }, [currentVideoIndex, searchResults.videos.length]);

  // Auto-play current video when index changes
  useEffect(() => {
    if (!showVideoFeed) return;
    
    // Pause all videos first
    Object.entries(videoRefs.current).forEach(([idx, ref]) => {
      if (ref && parseInt(idx) !== currentVideoIndex) {
        ref.pause();
        ref.currentTime = 0;
      }
    });
    
    // Play current video
    const currentRef = videoRefs.current[currentVideoIndex];
    if (currentRef) {
      currentRef.muted = true; // Start muted for autoplay
      currentRef.play().then(() => {
        currentRef.muted = false;
      }).catch(() => {
        // Keep muted if autoplay fails
      });
    }
  }, [currentVideoIndex, showVideoFeed]);

  // Scroll to video on index change
  useEffect(() => {
    if (showVideoFeed && videoFeedRef.current) {
      const itemHeight = videoFeedRef.current.clientHeight;
      videoFeedRef.current.scrollTo({
        top: currentVideoIndex * itemHeight,
        behavior: 'smooth'
      });
    }
  }, [showVideoFeed]);

  const handleUserClick = (user) => {
    window.location.href = `/@${user.username}`;
    if (onClose) onClose();
  };

  const totalResults = searchResults.videos.length + searchResults.users.length + 
                       searchResults.hashtags.length + searchResults.music.length;

  // Focus input when component mounts
  React.useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="search-page-overlay" onClick={onClose}>
      <div className="search-page-container" onClick={(e) => e.stopPropagation()}>
        <div className="search-page-header">
          <button className="search-page-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Search</h2>
          <div className="search-page-header-placeholder"></div>
        </div>

        <div className="search-page-content">
          <div className="search-page-main">
            <form className="search-page-form" onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <span className="search-icon" aria-hidden="true">
                  <i className="fa-solid fa-search"></i>
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-page-input"
                  placeholder="Search accounts, videos, hashtags..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError('');
                  }}
                  aria-label="Search"
                  aria-invalid={Boolean(searchError)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
              {searchError && (
                <div className="search-error-message" role="alert">
                  {searchError}
                </div>
              )}
              <button
                type="submit"
                className="search-submit-btn"
                disabled={!searchQuery.trim() || isSubmitting}
              >
                {isSubmitting ? 'Searching...' : 'Search'}
              </button>
            </form>

            {hasSearched && !isSubmitting && (
              <div className="search-results">
                {totalResults === 0 ? (
                  <div className="search-no-results">
                    <i className="fa-solid fa-search"></i>
                    <p>No results found for "{searchQuery}"</p>
                    <span>Try different keywords</span>
                  </div>
                ) : (
                  <>
                    {/* Videos Section */}
                    {searchResults.videos.length > 0 && (
                      <div className="search-results-section">
                        <h3><i className="fa-solid fa-video"></i> Videos ({searchResults.videos.length})</h3>
                        <div className="search-videos-grid">
                          {searchResults.videos.map((video) => (
                            <div
                              key={video._id || video.id}
                              className="search-video-item"
                              onClick={() => handleVideoClick(video)}
                            >
                              <div className="search-video-thumbnail">
                                {video.thumbnail ? (
                                  <img src={video.thumbnail} alt={video.description} />
                                ) : (
                                  <div className="video-placeholder">
                                    <i className="fa-solid fa-play"></i>
                                  </div>
                                )}
                              </div>
                              <div className="search-video-info">
                                <p className="search-video-description">{video.description || 'No description'}</p>
                                <div className="search-video-stats">
                                  <span><i className="fa-solid fa-heart"></i> {formatCount(video.likes)}</span>
                                  <span><i className="fa-solid fa-eye"></i> {formatCount(video.views)}</span>
                                </div>
                                {video.user && (
                                  <p className="search-video-author">@{video.user.username}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Users Section */}
                    {searchResults.users.length > 0 && (
                      <div className="search-results-section">
                        <h3><i className="fa-solid fa-users"></i> Users ({searchResults.users.length})</h3>
                        <div className="search-users-list">
                          {searchResults.users.map((user) => (
                            <div
                              key={user._id || user.id}
                              className="search-user-item"
                              onClick={() => handleUserClick(user)}
                            >
                              <img
                                src={user.avatar || user.profile?.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=ff0050&color=fff`}
                                alt={user.username}
                                className="search-user-avatar"
                              />
                              <div className="search-user-info">
                                <p className="search-user-name">@{user.username}</p>
                                <p className="search-user-displayname">{user.displayName || user.profile?.displayName || user.username}</p>
                                <p className="search-user-followers">{formatCount(user.followers || user.profile?.followers)} followers</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hashtags Section */}
                    {searchResults.hashtags.length > 0 && (
                      <div className="search-results-section">
                        <h3><i className="fa-solid fa-hashtag"></i> Hashtags ({searchResults.hashtags.length})</h3>
                        <div className="search-hashtags-list">
                          {searchResults.hashtags.map((hashtag, index) => (
                            <div key={hashtag.tag || index} className="search-hashtag-item">
                              <span className="hashtag-name">#{hashtag.tag || hashtag.name || hashtag}</span>
                              <span className="hashtag-count">{formatCount(hashtag.count || hashtag.videoCount)} videos</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Music Section */}
                    {searchResults.music.length > 0 && (
                      <div className="search-results-section">
                        <h3><i className="fa-solid fa-music"></i> Music ({searchResults.music.length})</h3>
                        <div className="search-music-list">
                          {searchResults.music.map((music, index) => (
                            <div key={music._id || index} className="search-music-item">
                              <i className="fa-solid fa-music music-icon"></i>
                              <div className="search-music-info">
                                <p className="music-name">{music.name || music.title}</p>
                                <p className="music-artist">{music.artist || 'Unknown Artist'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!searchQuery && !hasSearched && (
              <div className="search-placeholder">
                <i className="fa-solid fa-search"></i>
                <p>Search for accounts, videos, hashtags, and more</p>
              </div>
            )}
          </div>
        </div>

        {/* TikTok Style Scrollable Video Feed - Card in Center */}
        {showVideoFeed && searchResults.videos.length > 0 && (
          <div className="search-video-feed-modal" onClick={closeVideoFeed}>
            <button className="search-video-feed-close" onClick={closeVideoFeed}>
              <i className="fa-solid fa-times"></i>
            </button>
            
            {/* Video Counter */}
            <div className="search-video-counter">
              {currentVideoIndex + 1} / {searchResults.videos.length}
            </div>
            
            {/* Scrollable Video Feed Card */}
            <div 
              className="search-video-feed-container" 
              ref={videoFeedRef}
              onScroll={handleScroll}
              onClick={(e) => e.stopPropagation()}
            >
              {searchResults.videos.map((video, index) => {
                const videoSrc = video.url || video.videoUrl || video.playbackUrl;
                const isActive = index === currentVideoIndex;
                const aspectRatio = videoAspectRatios[index];
                
                return (
                  <div 
                    key={video._id || video.id || index} 
                    className="search-video-feed-item"
                    ref={el => containerRefs.current[index] = el}
                    style={{
                      aspectRatio: aspectRatio ? aspectRatio.toString() : 'auto'
                    }}
                  >
                    <video
                      ref={el => {
                        if (el) {
                          videoRefs.current[index] = el;
                          // Calculate aspect ratio when video loads
                          const updateAspectRatio = () => {
                            if (el.videoWidth && el.videoHeight) {
                              const aspectRatio = el.videoWidth / el.videoHeight;
                              const container = containerRefs.current[index];
                              if (container) {
                                container.style.setProperty('--video-aspect-ratio', aspectRatio.toString());
                                setVideoAspectRatios(prev => ({
                                  ...prev,
                                  [index]: aspectRatio
                                }));
                              }
                            }
                          };
                          if (el.readyState >= 1) {
                            updateAspectRatio();
                          } else {
                            el.addEventListener('loadedmetadata', updateAspectRatio);
                            el.addEventListener('loadeddata', updateAspectRatio);
                          }
                        }
                      }}
                      src={videoSrc}
                      poster={video.thumbnail}
                      playsInline
                      loop
                      muted={!isActive}
                      className="search-video-feed-player"
                      onLoadedMetadata={(e) => {
                        const videoEl = e.target;
                        if (videoEl.videoWidth && videoEl.videoHeight) {
                          const aspectRatio = videoEl.videoWidth / videoEl.videoHeight;
                          const container = containerRefs.current[index];
                          if (container) {
                            container.style.setProperty('--video-aspect-ratio', aspectRatio.toString());
                            setVideoAspectRatios(prev => ({
                              ...prev,
                              [index]: aspectRatio
                            }));
                          }
                        }
                      }}
                      onClick={(e) => {
                        // Toggle play/pause on click
                        if (e.target.paused) {
                          e.target.play();
                        } else {
                          e.target.pause();
                        }
                      }}
                    />
                    
                    {/* Video Info Overlay */}
                    <div className="search-video-feed-info">
                      <div className="search-video-feed-user">
                        <img 
                          src={video.user?.profile?.avatar || video.user?.avatar || `https://ui-avatars.com/api/?name=${video.user?.username || 'User'}&background=ff0050&color=fff`} 
                          alt={video.user?.username || 'User'} 
                          className="search-video-feed-avatar"
                        />
                        <span className="search-video-feed-username">@{video.user?.username || 'user'}</span>
                      </div>
                      <p className="search-video-feed-description">{video.description}</p>
                      <div className="search-video-feed-stats">
                        <span><i className="fa-solid fa-heart"></i> {formatCount(video.likes || 0)}</span>
                        <span><i className="fa-solid fa-comment"></i> {formatCount(video.comments || 0)}</span>
                        <span><i className="fa-solid fa-share"></i> {formatCount(video.shares || 0)}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons (Right Side) */}
                    <div className="search-video-feed-actions">
                      <button className="search-video-action-btn">
                        <i className="fa-solid fa-heart"></i>
                        <span>{formatCount(video.likes || 0)}</span>
                      </button>
                      <button className="search-video-action-btn">
                        <i className="fa-solid fa-comment"></i>
                        <span>{formatCount(video.comments || 0)}</span>
                      </button>
                      <button className="search-video-action-btn">
                        <i className="fa-solid fa-share"></i>
                        <span>{formatCount(video.shares || 0)}</span>
                      </button>
                    </div>
                    
                    {/* Scroll Hint - Inside each card */}
                    {searchResults.videos.length > 1 && index < searchResults.videos.length - 1 && isActive && (
                      <div className="search-video-scroll-hint">
                        <i className="fa-solid fa-chevron-down"></i>
                        <span>Scroll</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;

