import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Login from './Login';
import Signup from './Signup';
import Profile from './Profile';
import UploadPage from './UploadPage';
import NotificationCenter from './NotificationCenter';
import Balance from './Balance';
import GetApp from './GetApp';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount } = useNotification();
  const [activeOverlay, setActiveOverlay] = useState(null); // login, signup, profile, upload, notifications, balance, getApp
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setSearchError('');
  };

  const handleSearchSubmit = (e) => {
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

    try {
      // Handle search - you can navigate to search results page or trigger search
      console.log('Searching for:', trimmedQuery);
      // TODO: Implement search functionality
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <form className="navbar-search" onSubmit={handleSearchSubmit}>
            <span className="navbar-search-icon" aria-hidden="true">
              <i className="fa-solid fa-search"></i>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="navbar-search-input"
              placeholder="Search accounts, videos, hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search"
              aria-invalid={Boolean(searchError)}
            />
            {searchQuery && (
              <button
                type="button"
                className="navbar-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                  setSearchError('');
                }}
                aria-label="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
            <button
              type="submit"
              className="navbar-search-submit"
              disabled={!searchQuery.trim() || isSubmitting}
            >
              {isSubmitting ? 'Searching...' : 'Search'}
            </button>
          </form>
          {searchError && (
            <div className="navbar-search-error" role="alert">
              {searchError}
            </div>
          )}
        </div>
        <div className="nav-right">
          {isAuthenticated ? (
            <>
              <div className="nav-actions-group">
                <button 
                  className="nav-btn nav-btn--primary upload-btn"
                  onClick={() => toggleOverlay('upload')}
                >
                  <i className="fa-solid fa-plus"></i>
                  <span className="nav-btn__label">Upload</span>
                </button>
                <button 
                  className="nav-icon-btn notification-btn"
                  onClick={() => toggleOverlay('notifications')}
                  title="Notifications"
                  aria-label="Open notifications"
                >
                  <i className="fa-solid fa-bell"></i>
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                <button 
                  className="nav-icon-btn nav-icon-btn--ghost" 
                  onClick={() => toggleOverlay('getApp')}
                  title="Quick actions"
                  aria-label="Open quick actions"
                >
                  <i className="fa-solid fa-ellipsis"></i>
                </button>
              </div>
              <div className="nav-avatar-group">
                <button 
                  className="nav-avatar-btn"
                  onClick={() => toggleOverlay('profile')}
                  aria-label="Open profile"
                >
                  <img 
                    src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=ff0050&color=fff`} 
                    alt={user?.username} 
                    className="user-avatar"
                  />
                </button>
                <button 
                  className="nav-icon-btn nav-icon-btn--ghost" 
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              </div>
            </>
          ) : (
            <button 
              className="nav-btn nav-btn--primary signup-btn"
              onClick={() => toggleOverlay('signup')}
            >
              Sign up
            </button>
          )}
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

      {activeOverlay === 'getApp' && (
        <GetApp 
          onClose={() => setActiveOverlay(null)}
        />
      )}
    </>
  );
};

export default Navbar;







