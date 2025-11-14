import { useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

/**
 * Responsive breakpoints utility
 */
export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px'
};

/**
 * Media query hooks (for use in components)
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (!isBrowser) {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    const media = window.matchMedia(query);
    const listener = (event) => {
      setMatches(event.matches);
    };

    setMatches(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
};

/**
 * Check if device is mobile
 */
export const isMobile = () => {
  if (!isBrowser) return false;
  return window.innerWidth <= 768;
};

/**
 * Check if device is tablet
 */
export const isTablet = () => {
  if (!isBrowser) return false;
  return window.innerWidth > 768 && window.innerWidth <= 1024;
};

/**
 * Check if device is desktop
 */
export const isDesktop = () => {
  if (!isBrowser) return true;
  return window.innerWidth > 1024;
};

