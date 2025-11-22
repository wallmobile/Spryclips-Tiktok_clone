import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchPage from './SearchPage';
import './Sidebar.css';

const Sidebar = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchPageOpen, setIsSearchPageOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { id: 'home', icon: 'fa-home', label: 'For You', path: '/' },
      { id: 'explore', icon: 'fa-compass', label: 'Explore', path: '/explore' },
      { id: 'following', icon: 'fa-user-plus', label: 'Following', path: '/following', auth: true },
      { id: 'live', icon: 'fa-tv', label: 'LIVE', path: '/live' },
      { id: 'search', icon: 'fa-search', label: 'Search', action: 'search' },
      { id: 'upload', icon: 'fa-square-plus', label: 'Upload', path: '/upload', auth: true },
      { id: 'profile', icon: 'fa-user', label: 'Profile', path: '/profile', auth: true },
      { id: 'more', icon: 'fa-ellipsis', label: 'More', path: '/more' }
    ],
    []
  );

  const activeNav = useMemo(() => {
    const currentPath = location.pathname;

    if (currentPath === '/') {
      return 'home';
    }

    const match = navItems.find((item) => {
      if (!item.path) return false; // Skip items without path (like search)
      if (item.path === '/') return currentPath === '/';
      return currentPath.startsWith(item.path);
    });

    return match ? match.id : 'home';
  }, [location.pathname, navItems]);

  // Check if we're on the For You page (home page only)
  // Show hamburger only on For You page (/), hide on all other pages
  const isForYouPage = useMemo(() => {
    return location.pathname === '/' && !isSearchPageOpen;
  }, [location.pathname, isSearchPageOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Add/remove body class when page opens/closes
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('sidebar-menu-open');
    } else {
      document.body.classList.remove('sidebar-menu-open');
    }

    return () => {
      document.body.classList.remove('sidebar-menu-open');
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.sidebar') && !event.target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleSidebarCloseEvent = () => {
      setIsMobileMenuOpen(false);
    };

    window.addEventListener('sidebar:close', handleSidebarCloseEvent);
    return () => {
      window.removeEventListener('sidebar:close', handleSidebarCloseEvent);
    };
  }, []);

  return (
    <>
      {/* Show hamburger button only on For You page */}
      {isForYouPage && (
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <i className={`fa-solid ${isMobileMenuOpen ? 'fa-x' : 'fa-bars'}`}></i>
        </button>
      )}

      {isMobileMenuOpen && (
        <div 
          className={`mobile-menu-overlay ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            TikTok
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.action === 'search') {
                  setIsSearchPageOpen(true);
                  setIsMobileMenuOpen(false);
                } else if (item.auth && !isAuthenticated) {
                  navigate('/login', { state: { from: location } });
                } else if (item.path) {
                  navigate(item.path);
                }
                setIsMobileMenuOpen(false);
              }}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <div className="logout-btn" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Log out</span>
            </div>
          ) : (
            <>
              <button
                className="login-btn-sidebar"
                onClick={() => {
                  navigate('/login', { state: { from: location } });
                  setIsMobileMenuOpen(false);
                }}
              >
                Log in
              </button>
              <button
                className="signup-btn-sidebar"
                onClick={() => {
                  navigate('/signup', { state: { from: location } });
                  setIsMobileMenuOpen(false);
                }}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Page Modal */}
      {isSearchPageOpen && (
        <SearchPage onClose={() => setIsSearchPageOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;














