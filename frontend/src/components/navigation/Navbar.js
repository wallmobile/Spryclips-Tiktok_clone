import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Login from '../auth/Login';
import Signup from '../auth/Signup';
import Profile from '../profile/Profile';
import UploadPage from '../upload/UploadPage';
import NotificationCenter from '../social/NotificationCenter';
import Balance from '../common/Balance';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [activeOverlay, setActiveOverlay] = useState(null); // login, signup, profile, upload, balance, getApp
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

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







