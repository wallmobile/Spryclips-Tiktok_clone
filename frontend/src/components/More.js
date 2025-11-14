import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import useOverlayPage from '../hooks/useOverlayPage';
import {
  fetchSupportedLanguages,
  fetchExperiencePreferences,
  updateExperiencePreferences
} from '../api/more';
import './More.css';

const LOCAL_LANGUAGE_KEY = 'preferredLanguage';
const FALLBACK_LANGUAGES = [
  { id: 'en_us', label: 'English (US)' },
  { id: 'en_uk', label: 'English (UK)' },
  { id: 'es_es', label: 'Español' },
  { id: 'hi_in', label: 'हिन्दी' },
  { id: 'ur_pk', label: 'اردو' }
];

const More = ({ onClose = () => {}, mode = 'overlay' }) => {
  const isOverlay = mode === 'overlay';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] = useState('English (US)');
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [preferenceFeedback, setPreferenceFeedback] = useState(null);

  useOverlayPage(onClose, { bodyClass: 'more-page-open', enabled: isOverlay });

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

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
      if (!isAuthenticated) {
        return;
      }
      try {
        setLoadingPreferences(true);
        const [supported, experience] = await Promise.all([
          fetchSupportedLanguages(),
          fetchExperiencePreferences()
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
        console.error('Failed to load experience preferences', error);
      } finally {
        if (active) {
          setLoadingPreferences(false);
        }
      }
    };

    loadLanguagesAndPrefs();
    return () => {
      active = false;
    };
  }, [isAuthenticated, darkMode, setDarkMode]);

  useEffect(() => {
    if (!preferenceFeedback) {
      return;
    }
    const timeout = setTimeout(() => setPreferenceFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [preferenceFeedback]);

  const handleLanguageSelect = async (language) => {
    const previous = selectedLanguage;
    setSelectedLanguage(language.label);
    setActiveSubmenu(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_LANGUAGE_KEY, language.label);
    }

    if (!isAuthenticated) {
      setPreferenceFeedback({ type: 'info', message: 'Language saved locally.' });
      return;
    }

    try {
      setLoadingPreferences(true);
      await updateExperiencePreferences({ language: language.label });
      setPreferenceFeedback({ type: 'success', message: 'Language preference synced.' });
    } catch (error) {
      console.error('Failed to update language preference', error);
      setSelectedLanguage(previous);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LOCAL_LANGUAGE_KEY, previous);
      }
      setPreferenceFeedback({ type: 'error', message: 'Could not sync language preference.' });
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handleThemeToggle = async () => {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);

    if (!isAuthenticated) {
      setPreferenceFeedback({ type: 'info', message: 'Theme saved on this device.' });
      return;
    }

    try {
      setLoadingPreferences(true);
      await updateExperiencePreferences({ theme: nextDarkMode ? 'dark' : 'light' });
      setPreferenceFeedback({ type: 'success', message: 'Theme preference synced.' });
    } catch (error) {
      console.error('Failed to update theme preference', error);
      setDarkMode(!nextDarkMode);
      setPreferenceFeedback({ type: 'error', message: 'Could not sync theme preference.' });
    } finally {
      setLoadingPreferences(false);
    }
  };

  const menuItems = useMemo(() => (
    [
      {
        id: 'tiktok_studio',
        label: 'TikTok Studio',
        icon: 'fa-tv',
        badge: true,
        action: 'route',
        path: '/more/studio'
      },
      {
        id: 'create_effects',
        label: 'Create TikTok effects',
        icon: 'fa-wand-magic-sparkles',
        action: 'route',
        path: '/more/effects'
      },
      {
        id: 'sell_shop',
        label: 'Sell on TikTok Shop',
        icon: 'fa-store',
        action: 'route',
        path: '/more/shop'
      },
      {
        id: 'growth_tools',
        label: 'Growth tools',
        icon: 'fa-chart-line',
        action: 'submenu-route',
        basePath: '/more/growth-tools',
        submenu: [
          { id: 'analytics', label: 'Creator analytics' },
          { id: 'insights', label: 'Audience insights' },
          { id: 'suggestions', label: 'Suggestions & playbooks' }
        ]
      },
      {
        id: 'language',
        label: 'Language',
        icon: 'fa-globe',
        action: 'language'
      },
      {
        id: 'dark_mode',
        label: 'Dark mode',
        icon: darkMode ? 'fa-moon' : 'fa-sun',
        action: 'toggle-theme'
      },
      {
        id: 'support',
        label: 'Support',
        icon: 'fa-headset',
        action: 'route',
        path: '/more/support'
      }
    ]), [darkMode]);

  const handleMenuItemClick = (item) => {
    switch (item.action) {
      case 'route':
        navigate(item.path);
        break;
      case 'submenu-route':
        setActiveSubmenu((prev) => (prev === item.id ? null : item.id));
        break;
      case 'language':
        setActiveSubmenu((prev) => (prev === 'language' ? null : 'language'));
        break;
      case 'toggle-theme':
        handleThemeToggle();
        break;
      default:
        break;
    }
  };

  const handleSubmenuClick = (parentItem, subItem) => {
    if (parentItem.action === 'submenu-route') {
      navigate(`${parentItem.basePath}?section=${subItem.id}`);
      setActiveSubmenu(null);
      return;
    }

    if (parentItem.id === 'language') {
      handleLanguageSelect(subItem);
    }
  };

  const languageSubmenu = languages.map((lang) => ({
    ...lang,
    icon: selectedLanguage === lang.label ? 'fa-check' : null
  }));

  const content = (
    <div
      className={`more-container ${!isOverlay ? 'more-container--page' : ''}`}
      onClick={(e) => {
        if (isOverlay) {
          e.stopPropagation();
        }
      }}
    >
      <div className="more-header">
        <button
          className="more-close-btn"
          onClick={() => onClose()}
          type="button"
          aria-label="Close"
        >
          <i className="fa-solid fa-times"></i>
        </button>
        <h1>More</h1>
        <div className="more-header-placeholder" aria-hidden="true"></div>
      </div>

      {preferenceFeedback && (
        <div
          className={`more-feedback ${preferenceFeedback.type === 'error' ? 'more-feedback--error' : ''}`}
        >
          <i className="fa-solid fa-info-circle"></i>
          <span>{preferenceFeedback.message}</span>
        </div>
      )}

      {loadingPreferences && (
        <div className="more-feedback">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Syncing your preferences…</span>
        </div>
      )}

      <div className="more-content">
        {menuItems.map((item) => {
          const isLanguageItem = item.id === 'language';
          const isThemeItem = item.id === 'dark_mode';
          const secondaryLabel = isLanguageItem
            ? selectedLanguage
            : isThemeItem
            ? darkMode ? 'ON' : 'OFF'
            : null;

          return (
            <div key={item.id}>
              <button className="more-menu-item" onClick={() => handleMenuItemClick(item)} type="button">
                <div className="more-menu-left">
                  <i className={`fa-solid ${item.icon}`}></i>
                  <span>{item.label}</span>
                </div>
                <div className="more-menu-right">
                  {item.badge && <span className="more-badge"></span>}
                  {secondaryLabel && <span className="more-menu-secondary">{secondaryLabel}</span>}
                  {(item.action === 'submenu-route' || item.action === 'language') && (
                    <i className="fa-solid fa-chevron-right"></i>
                  )}
                  {item.action === 'toggle-theme' && (
                    <span className="more-toggle-indicator">{darkMode ? 'ON' : 'OFF'}</span>
                  )}
                </div>
              </button>

              {activeSubmenu === item.id && item.action === 'submenu-route' && item.submenu && (
                <div className="more-submenu">
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.id}
                      className="more-submenu-item"
                      onClick={() => handleSubmenuClick(item, subItem)}
                      type="button"
                    >
                      <div className="more-menu-left">
                        <span>{subItem.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeSubmenu === 'language' && isLanguageItem && (
                <div className="more-submenu">
                  {languageSubmenu.map((lang) => (
                    <button
                      key={lang.id}
                      className="more-submenu-item"
                      onClick={() => handleLanguageSelect(lang)}
                      type="button"
                    >
                      <div className="more-menu-left">
                        {lang.icon && <i className={`fa-solid ${lang.icon}`}></i>}
                        <span>{lang.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="more-overlay" onClick={onClose} role="dialog" aria-modal="true">
        {content}
      </div>
    );
  }

  return <div className="more-page">{content}</div>;
};

export default More;














