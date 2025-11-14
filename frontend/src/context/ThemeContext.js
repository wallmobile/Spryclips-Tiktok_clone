import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Load dark mode from localStorage or default to false
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const saved = window.localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Apply dark mode class to body element
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Save to localStorage whenever dark mode changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const value = {
    darkMode,
    toggleDarkMode,
    setDarkMode
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

















