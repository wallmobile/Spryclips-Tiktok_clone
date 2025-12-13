import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import SearchPage from '../feed/SearchPage';
import {
  fetchSupportedLanguages,
  fetchExperiencePreferences,
  updateExperiencePreferences
} from '../../api/more';
import './Sidebar.css';

const LOCAL_LANGUAGE_KEY = 'preferredLanguage';
const FALLBACK_LANGUAGES = [
  { id: 'en_us', label: 'English (US)' }
];

const Sidebar = () => {
  const { logout, isAuthenticated, user } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  const navItems = useMemo(
    () => [
      { id: 'home', icon: 'fa-home', label: 'For You', path: '/' },
      { id: 'explore', icon: 'fa-compass', label: 'Explore', path: '/explore' },
      { id: 'following', icon: 'fa-user-plus', label: 'Following', path: '/following', auth: true },
      { id: 'live', icon: 'fa-tv', label: 'LIVE', path: '/live' },
      { id: 'upload', icon: 'fa-square-plus', label: 'Upload', path: '/upload', auth: true },
      { id: 'profile', icon: 'fa-user', label: 'Profile', path: '/profile', auth: true }
    ],
    []
  );

  const moreMenuItems = useMemo(
    () => [
      {
        id: 'watch_later',
        label: 'Watch Later',
        icon: 'fa-bookmark',
        action: 'route',
        path: '/watch-later',
        auth: true
      },
      {
        id: 'playlists',
        label: 'Playlists',
        icon: 'fa-list',
        action: 'route',
        path: '/playlists',
        auth: true
      },
      {
        id: 'spryclips_studio',
        label: 'Spryclips Studio',
        icon: 'fa-tv',
        badge: true,
        action: 'route',
        path: '/more/studio'
      },
      {
        id: 'create_effects',
        label: 'Create Spryclips effects',
        icon: 'fa-wand-magic-sparkles',
        action: 'route',
        path: '/more/effects'
      },
      {
        id: 'growth_tools',
        label: 'Growth tools',
        icon: 'fa-chart-line',
        action: 'submenu',
        submenu: [
          { id: 'analytics', label: 'Creator analytics', path: '/more/growth-tools?section=analytics' },
          { id: 'insights', label: 'Audience insights', path: '/more/growth-tools?section=insights' },
          { id: 'suggestions', label: 'Suggestions & playbooks', path: '/more/growth-tools?section=suggestions' }
        ]
      },
      {
        id: 'language',
        label: 'Language',
        icon: 'fa-globe',
        action: 'language',
        value: selectedLanguage
      },
      {
        id: 'dark_mode',
        label: 'Dark mode',
        icon: darkMode ? 'fa-moon' : 'fa-sun',
        action: 'toggle-theme',
        toggle: darkMode
      },
      {
        id: 'support',
        label: 'Support',
        icon: 'fa-headset',
        action: 'route',
        path: '/more/support'
      }
    ],
    [darkMode, selectedLanguage]
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
    return location.pathname === '/';
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Load languages and preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(LOCAL_LANGUAGE_KEY);
      if (stored) {
        setSelectedLanguage(stored);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadLanguagesAndPrefs = async () => {
      if (!isAuthenticated) return;
      try {
        const [supported, experience] = await Promise.all([
          fetchSupportedLanguages().catch(() => []),
          fetchExperiencePreferences().catch(() => null)
        ]);
        if (!active) return;
        if (Array.isArray(supported) && supported.length > 0) {
          setLanguages(supported);
        }
        if (experience?.language) {
          setSelectedLanguage(experience.language);
        }
        if (experience?.theme) {
          const nextIsDark = experience.theme === 'dark';
          if (nextIsDark !== darkMode) {
            setDarkMode(nextIsDark);
          }
        }
      } catch (error) {
        console.error('Failed to load preferences', error);
      }
    };
    loadLanguagesAndPrefs();
    return () => { active = false; };
  }, [isAuthenticated, darkMode, setDarkMode]);

  const handleLanguageSelect = async (language) => {
    const previous = selectedLanguage;
    setSelectedLanguage(language.label);
    setActiveSubmenu(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_LANGUAGE_KEY, language.label);
    }
    if (!isAuthenticated) return;
    try {
      setLoadingPreferences(true);
      await updateExperiencePreferences({ language: language.label });
    } catch (error) {
      console.error('Failed to update language', error);
      setSelectedLanguage(previous);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCAL_LANGUAGE_KEY, previous);
      }
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleThemeToggle = async () => {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    if (!isAuthenticated) return;
    try {
      setLoadingPreferences(true);
      await updateExperiencePreferences({ theme: nextDarkMode ? 'dark' : 'light' });
    } catch (error) {
      console.error('Failed to update theme', error);
      setDarkMode(!nextDarkMode);
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleMoreMenuItemClick = (item) => {
    if (item.auth && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
      setIsMobileMenuOpen(false);
      return;
    }
    
    switch (item.action) {
      case 'route':
        navigate(item.path);
        setIsMobileMenuOpen(false);
        setActiveSubmenu(null);
        break;
      case 'submenu':
        setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
        break;
      case 'language':
        setActiveSubmenu(activeSubmenu === 'language' ? null : 'language');
        break;
      case 'toggle-theme':
        handleThemeToggle();
        break;
      default:
        break;
    }
  };

  const handleSubmenuClick = (subItem) => {
    navigate(subItem.path);
    setIsMobileMenuOpen(false);
    setActiveSubmenu(null);
  };

  const languageSubmenu = languages.map((lang) => ({
    ...lang,
    icon: selectedLanguage === lang.label ? 'fa-check' : null
  }));

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
                Spryclips
              </div>
            </div>

            <nav className="sidebar-nav">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.auth && !isAuthenticated) {
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

          {/* More Menu Toggle */}
          <div
            className={`nav-item ${showMoreMenu ? 'active' : ''}`}
            onClick={() => {
              setShowMoreMenu(!showMoreMenu);
              setActiveSubmenu(null);
            }}
          >
            <i className="fa-solid fa-ellipsis"></i>
            <span>More</span>
            <i className={`fa-solid fa-chevron-${showMoreMenu ? 'up' : 'down'} sidebar-chevron`}></i>
          </div>

          {/* More Menu Items - Show when expanded */}
          {showMoreMenu && moreMenuItems.map(item => {
            const isActive = activeSubmenu === item.id;
            const isLanguageItem = item.id === 'language';
            
            return (
              <div key={item.id} className="sidebar-more-section">
                <div
                  className={`nav-item ${item.action === 'toggle-theme' && item.toggle ? 'active' : ''}`}
                  onClick={() => handleMoreMenuItemClick(item)}
                >
                  <i className={`fa-solid ${item.icon}`}></i>
                  <span>{item.label}</span>
                  {item.badge && <span className="sidebar-badge"></span>}
                  {item.value && <span className="sidebar-value">{item.value}</span>}
                  {item.toggle !== undefined && (
                    <div className="sidebar-toggle">
                      <div className={`toggle-switch ${item.toggle ? 'on' : 'off'}`}>
                        <div className="toggle-slider"></div>
                      </div>
                    </div>
                  )}
                  {(item.action === 'submenu' || isLanguageItem) && (
                    <i className={`fa-solid fa-chevron-${isActive ? 'up' : 'down'} sidebar-chevron`}></i>
                  )}
                </div>

                {/* Submenu for Growth Tools */}
                {isActive && item.action === 'submenu' && item.submenu && (
                  <div className="sidebar-submenu">
                    {item.submenu.map((subItem) => (
                      <div
                        key={subItem.id}
                        className="sidebar-submenu-item"
                        onClick={() => handleSubmenuClick(subItem)}
                      >
                        <span>{subItem.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submenu for Language */}
                {isActive && isLanguageItem && (
                  <div className="sidebar-submenu">
                    {languageSubmenu.map((lang) => (
                      <div
                        key={lang.id}
                        className="sidebar-submenu-item"
                        onClick={() => handleLanguageSelect(lang)}
                      >
                        {lang.icon && <i className={`fa-solid ${lang.icon}`}></i>}
                        <span>{lang.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <div className="logout-btn" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Log out</span>
            </div>
          ) : (
            <div className="sidebar-auth-buttons">
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
            </div>
          )}
        </div>
      </div>

      {/* Search Modal - Spryclips Style */}
      {showSearchModal && (
        <SearchPage onClose={() => setShowSearchModal(false)} />
      )}
    </>
  );
};

export default Sidebar;














