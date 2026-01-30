import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSearchSuggestions, getTrendingSearches, getSearchHistory } from '../../api/search';
import Login from '../auth/Login';
import Signup from '../auth/Signup';
import Profile from '../profile/Profile';
import UploadPage from '../upload/UploadPage';
import NotificationCenter from '../social/NotificationCenter';
import Balance from '../common/Balance';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeOverlay, setActiveOverlay] = useState(null); // login, signup, profile, upload, balance, getApp
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const handleLogout = () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setActiveOverlay(null);
    }
  };

  const toggleOverlay = (overlay) => {
    setActiveOverlay((prev) => (prev === overlay ? null : overlay));
  };

  // Load trending searches and history on mount
  useEffect(() => {
    loadTrending();
    if (isAuthenticated) {
      loadSearchHistory();
    }
  }, [isAuthenticated]);

  // Fetch suggestions as user types
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const debounceTimer = setTimeout(() => {
        fetchSuggestions();
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTrending = async () => {
    try {
      const data = await getTrendingSearches(10);
      setTrending(data.trending?.searches?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const data = await getSearchHistory();
      setSearchHistory(data.history?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const data = await getSearchSuggestions(searchQuery);
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSearchFocus = () => {
    // Navigate to search page when clicking/focusing search bar
    if (location.pathname !== '/search') {
      navigate('/search');
    }
    setShowSuggestions(true);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim().length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const query = suggestion.value || suggestion.query || suggestion;
    setSearchQuery(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
  };

  const handleTrendingClick = (trend) => {
    const query = trend.query || trend;
    setSearchQuery(query);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setShowSuggestions(false);
  };

  return (
    <>
      {/* Navbar shows for both authenticated and unauthenticated users */}
      <nav className="navbar">
        <div className="navbar-container">
          {/* Left side - Logo placeholder (if needed) */}
          <div className="nav-left"></div>
          
          {/* Center/Right - Search Bar - INLINE SEARCH ONLY, NO POPUP/MODAL */}
          <div className="nav-center">
            <div className="navbar-search" style={{ cursor: 'text' }}>
              <div className="navbar-search-icon">
                <i className="fa-solid fa-search"></i>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                className="navbar-search-input"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  // Dispatch event to HomeFeed for inline filtering
                  const event = new CustomEvent('searchTermChange', { detail: value });
                  window.dispatchEvent(event);
                  console.log('Search query changed:', value); // Debug log
                }}
                onKeyDown={(e) => {
                  // Handle Enter key - trigger search
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = searchQuery.trim();
                    if (value) {
                      const event = new CustomEvent('searchTermChange', { detail: value });
                      window.dispatchEvent(event);
                      console.log('Search submitted (Enter key):', value);
                    }
                  }
                }}
                // NO onFocus - no popup on focus
                // NO onClick - no popup on click
                // NO readOnly - allow typing inline
                // NO popup/modal should open - this is inline search only
                style={{ cursor: 'text' }}
              />
            </div>
          </div>
          
          {/* Right side - Same content for both authenticated and unauthenticated users */}
          <div className="nav-right">
            <div className="nav-top-bar">
              <button 
                className="nav-top-btn get-coins-btn"
                onClick={() => toggleOverlay('balance')}
                title="Get Coins"
              >
                <i className="fa-solid fa-music"></i>
                <span>Get Coins</span>
              </button>
              <div className="nav-separator"></div>
              <button 
                className="nav-top-btn nav-top-btn--primary signup-btn"
                onClick={() => isAuthenticated ? toggleOverlay('profile') : toggleOverlay('signup')}
              >
                {isAuthenticated ? 'Profile' : 'Sign up'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {activeOverlay === 'login' && (
        <Login 
          onClose={() => setActiveOverlay(null)}
          onSwitchToSignup={() => {
            setActiveOverlay('signup');
          }}
        />
      )}

      {activeOverlay === 'signup' && (
        <Signup 
          onClose={() => setActiveOverlay(null)}
          onSwitchToLogin={() => {
            setActiveOverlay('login');
          }}
        />
      )}

      {activeOverlay === 'profile' && (
        <Profile onClose={() => setActiveOverlay(null)} />
      )}

      {activeOverlay === 'upload' && (
        <UploadPage 
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'notifications' && (
        <NotificationCenter 
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'balance' && (
        <Balance 
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* Search Page Modal */}
      {/* Search popup removed - inline search only */}

    </>
  );
};

export default Navbar;







