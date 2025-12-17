// Runtime API Configuration
// This file sets `window.APP_CONFIG` automatically so you don't have to
// edit it for local vs production every time.
//
// Production detection order (first match wins):
// 1) Server injects `window.__APP_ENV = 'production'` into the page.
// 2) If not injected, hostname check: host === 'spryclips.com' or subdomain of it.
//
// Behavior:
// - Production: API_URL = ''  (assumes same-domain proxy like Nginx),
//   UPLOADS_BASE_URL = 'https://spryclips.com/uploads'
// - Otherwise (local/dev): API_URL = 'http://localhost:5000',
//   UPLOADS_BASE_URL = 'http://localhost:5000/uploads'

(function () {
  var isProd = false;

  try {
    // 1) Server can inject a global marker for exact control
    if (typeof window !== 'undefined' && window.__APP_ENV === 'production') {
      isProd = true;
    }

    // 2) If not explicitly set, check common Node build env (if available)
    if (!isProd && typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV === 'production') {
      isProd = true;
    }

    // 3) Hostname fallback (detect spryclips domain)
    if (!isProd && typeof window !== 'undefined' && window.location && window.location.hostname) {
      var host = window.location.hostname.toLowerCase();
      if (host === 'spryclips.com' || host.endsWith('.spryclips.com')) {
        isProd = true;
      }
    }
  } catch (e) {
    // keep isProd = false on any unexpected error
  }

  window.APP_CONFIG = {
    API_URL: (function () {
      if (isProd) return '';
      try {
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          // If dev server runs on :3000, map to :5000 for API
          return window.location.origin.replace(/:3000$/, ':5000');
        }
      } catch (e) {}
      return '';
    })(),
    // Public uploads base URL - videos/images will be loaded from here
    UPLOADS_BASE_URL: (function () {
      if (isProd) return 'https://spryclips.com/uploads';
      try {
        if (typeof window !== 'undefined' && window.location && window.location.origin) {
          return window.location.origin.replace(/:3000$/, ':5000') + '/uploads';
        }
      } catch (e) {}
      return '/uploads';
    })()
  };
})();

