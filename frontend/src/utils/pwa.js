/**
 * PWA utilities
 */

let deferredPrompt = null;

const SW_PATH = '/service-worker.js';

const clearAllCaches = async () => {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys.map((key) =>
        caches.delete(key).catch((error) => {
          console.warn(`Failed to delete cache ${key}:`, error);
        })
      )
    );
  } catch (error) {
    console.warn('Error clearing caches:', error);
  }
};

const shouldRegisterSW = () => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  return true;
};

const unregisterStaleWorkers = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrations.forEach((registration) => {
      if (!shouldRegisterSW() || registration.active?.scriptURL?.endsWith(SW_PATH)) {
        registration.unregister().catch((error) => {
          console.warn('Failed to unregister service worker:', error);
        });
      }
    });
  } catch (error) {
    console.warn('Error checking service worker registrations:', error);
  }
};

export const registerServiceWorker = () => {
  if (!shouldRegisterSW()) {
    // Ensure no stale service workers or caches remain during development
    unregisterStaleWorkers();
    clearAllCaches();
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(SW_PATH)
      .then((registration) => {
        console.log('Service Worker registered:', registration);

        // Force controller change for updates
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
};

export const setupInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
};

export const showInstallPrompt = async () => {
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  return outcome === 'accepted';
};

export const isInstallable = () => {
  return deferredPrompt !== null;
};

export const isInstalled = () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const hasNavigatorStandalone =
    typeof window.navigator !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(window.navigator, 'standalone') &&
    window.navigator.standalone;
  const cameFromAndroidApp = document.referrer.includes('android-app://');

  return Boolean(isStandalone || hasNavigatorStandalone || cameFromAndroidApp);
};

