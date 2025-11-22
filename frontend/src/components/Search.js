import React, { useState, useEffect, useRef } from 'react';
import { 
  searchAll, 
  searchVideos, 
  searchUsers, 
  searchHashtags, 
  searchMusic,
  getSearchSuggestions,
  getTrendingSearches,
  getSearchHistory,
  clearSearchHistory
} from '../api/search';
import './Search.css';

const Search = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, videos, users, hashtags, music
  const [results, setResults] = useState({
    videos: [],
    users: [],
    hashtags: [],
    music: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Load trending searches and history
    loadTrending();
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (query.trim()) {
      const debounceTimer = setTimeout(() => {
        fetchSuggestions();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSuggestions([]);
      setShowSuggestions(true);
    }
  }, [query]);

  const loadTrending = async () => {
    try {
      const data = await getTrendingSearches();
      setTrending(data.trending || []);
    } catch (error) {
      console.error('Error loading trending searches:', error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const data = await getSearchHistory();
      setSearchHistory(data.history || []);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await getSearchSuggestions(query);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      if (activeTab === 'all') {
        const data = await searchAll(searchQuery);
        setResults({
          videos: data.videos || [],
          users: data.users || [],
          hashtags: data.hashtags || [],
          music: data.music || []
        });
      } else if (activeTab === 'videos') {
        const data = await searchVideos(searchQuery);
        setResults({ ...results, videos: data.videos || [] });
      } else if (activeTab === 'users') {
        const data = await searchUsers(searchQuery);
        setResults({ ...results, users: data.users || [] });
      } else if (activeTab === 'hashtags') {
        const data = await searchHashtags(searchQuery);
        setResults({ ...results, hashtags: data.hashtags || [] });
      } else if (activeTab === 'music') {
        const data = await searchMusic(searchQuery);
        setResults({ ...results, music: data.music || [] });
      }
    } catch (error) {
      console.error('Error searching:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to search. Please try again.';
      setError(errorMessage);
      // Clear results on error
      setResults({
        videos: [],
        users: [],
        hashtags: [],
        music: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const handleTrendingClick = (trend) => {
    setQuery(trend);
    handleSearch(trend);
  };

  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query || historyItem);
    handleSearch(historyItem.query || historyItem);
  };

  const handleClearHistory = async () => {
    try {
      await clearSearchHistory();
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const handleVideoClick = (video) => {
    window.location.href = `/video/${video._id || video.id}`;
    if (onClose) onClose();
  };

  const handleUserClick = (user) => {
    window.location.href = `/@${user.username}`;
    if (onClose) onClose();
  };

  const handleHashtagClick = (hashtag) => {
    window.location.href = `/tag/${hashtag.name || hashtag}`;
    if (onClose) onClose();
  };

  const handleMusicClick = (music) => {
    window.location.href = `/music/${music._id || music.id}`;
    if (onClose) onClose();
  };

  const formatCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-container" onClick={(e) => e.stopPropagation()}>
        {/* Search Header */}
        <div className="search-header">
          <div className="search-input-wrapper">
            <i className="fa-solid fa-search"></i>
            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="search-input"
              />
            </form>
            {query && (
              <button 
                className="search-clear-btn"
                onClick={() => {
                  setQuery('');
                  setResults({ videos: [], users: [], hashtags: [], music: [] });
                  setShowSuggestions(true);
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </div>
          <button className="search-close-btn" onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* Suggestions/Trending/History */}
        {showSuggestions && !query.trim() && (
          <div className="search-suggestions">
            {searchHistory.length > 0 && (
              <div className="search-section">
                <div className="search-section-header">
                  <span>Recent</span>
                  <button onClick={handleClearHistory} className="clear-history-btn">
                    Clear
                  </button>
                </div>
                <div className="search-history-list">
                  {searchHistory.slice(0, 10).map((item, index) => (
                    <div
                      key={index}
                      className="search-history-item"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <i className="fa-solid fa-clock-rotate-left"></i>
                      <span>{item.query || item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trending.length > 0 && (
              <div className="search-section">
                <div className="search-section-header">
                  <span>Trending</span>
                </div>
                <div className="search-trending-list">
                  {trending.map((trend, index) => (
                    <div
                      key={index}
                      className="search-trending-item"
                      onClick={() => handleTrendingClick(trend)}
                    >
                      <span className="trending-number">{index + 1}</span>
                      <span>{trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Suggestions */}
        {showSuggestions && query.trim() && suggestions.length > 0 && (
          <div className="search-suggestions">
            <div className="search-section">
              <div className="search-section-header">
                <span>Suggestions</span>
              </div>
              <div className="search-suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="search-suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <i className="fa-solid fa-search"></i>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {query.trim() && !showSuggestions && (
          <div className="search-results">
            {/* Tabs */}
            <div className="search-tabs">
              <button
                className={activeTab === 'all' ? 'active' : ''}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={activeTab === 'videos' ? 'active' : ''}
                onClick={() => setActiveTab('videos')}
              >
                Videos
              </button>
              <button
                className={activeTab === 'users' ? 'active' : ''}
                onClick={() => setActiveTab('users')}
              >
                Users
              </button>
              <button
                className={activeTab === 'hashtags' ? 'active' : ''}
                onClick={() => setActiveTab('hashtags')}
              >
                Hashtags
              </button>
              <button
                className={activeTab === 'music' ? 'active' : ''}
                onClick={() => setActiveTab('music')}
              >
                Music
              </button>
            </div>

            {/* Results */}
            {loading ? (
              <div className="search-loading">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Searching...</span>
              </div>
            ) : error ? (
              <div className="search-no-results">
                <i className="fa-solid fa-exclamation-triangle"></i>
                <p>{error}</p>
                <button 
                  className="search-close-btn"
                  onClick={() => {
                    setError(null);
                    handleSearch();
                  }}
                  style={{ marginTop: '1rem' }}
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="search-results-content">
                {/* Videos */}
                {(activeTab === 'all' || activeTab === 'videos') && results.videos.length > 0 && (
                  <div className="search-results-section">
                    <h3>Videos</h3>
                    <div className="search-videos-grid">
                      {results.videos.map((video) => (
                        <div
                          key={video._id || video.id}
                          className="search-video-item"
                          onClick={() => handleVideoClick(video)}
                        >
                          <div className="search-video-thumbnail">
                            <img
                              src={video.thumbnail || video.poster}
                              alt={video.description}
                            />
                            <div className="search-video-duration">
                              {video.duration || '0:00'}
                            </div>
                          </div>
                          <div className="search-video-info">
                            <p className="search-video-description">{video.description}</p>
                            <div className="search-video-stats">
                              <span>
                                <i className="fa-solid fa-heart"></i> {formatCount(video.likes || 0)}
                              </span>
                              <span>
                                <i className="fa-solid fa-comment"></i> {formatCount(video.comments || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                  <div className="search-results-section">
                    <h3>Users</h3>
                    <div className="search-users-list">
                      {results.users.map((user) => (
                        <div
                          key={user._id || user.id}
                          className="search-user-item"
                          onClick={() => handleUserClick(user)}
                        >
                          <img
                            src={user.profile?.avatar || user.avatar}
                            alt={user.username}
                            className="search-user-avatar"
                          />
                          <div className="search-user-info">
                            <p className="search-user-name">{user.username}</p>
                            <p className="search-user-followers">
                              {formatCount(user.followers || 0)} followers
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {(activeTab === 'all' || activeTab === 'hashtags') && results.hashtags.length > 0 && (
                  <div className="search-results-section">
                    <h3>Hashtags</h3>
                    <div className="search-hashtags-list">
                      {results.hashtags.map((hashtag) => (
                        <div
                          key={hashtag._id || hashtag.name}
                          className="search-hashtag-item"
                          onClick={() => handleHashtagClick(hashtag)}
                        >
                          <span className="search-hashtag-name">#{hashtag.name || hashtag}</span>
                          <span className="search-hashtag-count">
                            {formatCount(hashtag.videoCount || 0)} videos
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Music */}
                {(activeTab === 'all' || activeTab === 'music') && results.music.length > 0 && (
                  <div className="search-results-section">
                    <h3>Music</h3>
                    <div className="search-music-list">
                      {results.music.map((music) => (
                        <div
                          key={music._id || music.id}
                          className="search-music-item"
                          onClick={() => handleMusicClick(music)}
                        >
                          <div className="search-music-info">
                            <p className="search-music-title">{music.title || music.name}</p>
                            <p className="search-music-artist">{music.artist || 'Unknown Artist'}</p>
                          </div>
                          <div className="search-music-stats">
                            <span>{formatCount(music.videoCount || 0)} videos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!loading &&
                  activeTab === 'all' &&
                  results.videos.length === 0 &&
                  results.users.length === 0 &&
                  results.hashtags.length === 0 &&
                  results.music.length === 0 && (
                    <div className="search-no-results">
                      <i className="fa-solid fa-search"></i>
                      <p>No results found for "{query}"</p>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;

