import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Handles Google and Facebook OAuth flows on the client.
 * Requires the following environment variables in the frontend build:
 * - REACT_APP_GOOGLE_CLIENT_ID
 * - REACT_APP_FACEBOOK_APP_ID
 */
const GOOGLE_SDK_SRC = 'https://accounts.google.com/gsi/client';
const FACEBOOK_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

const resolveEnvValue = (keys) => {
  for (const key of keys) {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG[key]) {
      return window.APP_CONFIG[key];
    }
  }
  return undefined;
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });

const useSocialAuth = ({ onSuccess, onError } = {}) => {
  const { socialLogin } = useAuth();
  const googleClientId = resolveEnvValue(['REACT_APP_GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_ID']);
  const facebookAppId = resolveEnvValue(['REACT_APP_FACEBOOK_APP_ID', 'FACEBOOK_APP_ID']);

  const googleTokenClientRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initGoogle = async () => {
      if (!googleClientId) {
        return;
      }
      try {
        await loadScript(GOOGLE_SDK_SRC);
        if (!isMounted || !window.google?.accounts?.oauth2) {
          throw new Error('Google OAuth client unavailable');
        }
        googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          callback: () => {},
          error_callback: (err) => {
            if (onError) {
              onError(err?.type === 'popup_closed_by_user' ? 'Google sign-in cancelled.' : 'Google sign-in failed.');
            }
          }
        });
        if (isMounted) {
          setGoogleReady(true);
        }
      } catch (error) {
        if (isMounted && onError) {
          onError('Google services could not be loaded. Please try again later.');
        }
      }
    };

    initGoogle();

    return () => {
      isMounted = false;
    };
  }, [googleClientId, onError]);

  useEffect(() => {
    let isMounted = true;

    const initFacebook = async () => {
      if (!facebookAppId) {
        return;
      }
      try {
        await loadScript(FACEBOOK_SDK_SRC);
        if (!isMounted || !window.FB) {
          throw new Error('Facebook SDK unavailable');
        }
        window.FB.init({
          appId: facebookAppId,
          cookie: true,
          xfbml: false,
          version: 'v17.0'
        });
        if (isMounted) {
          setFacebookReady(true);
        }
      } catch (error) {
        if (isMounted && onError) {
          onError('Facebook services could not be loaded. Please try again later.');
        }
      }
    };

    initFacebook();

    return () => {
      isMounted = false;
    };
  }, [facebookAppId, onError]);

  const startGoogleLogin = useCallback(() => {
    if (!googleClientId) {
      onError?.('Google login is not configured. Please add REACT_APP_GOOGLE_CLIENT_ID to environment variables.');
      return Promise.resolve();
    }

    // Use redirect flow to open Google login page directly
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'openid email profile';
    const responseType = 'token';
    const state = Math.random().toString(36).substring(7); // Random state for security
    
    // Store state in sessionStorage for verification
    sessionStorage.setItem('google_oauth_state', state);
    
    // Build Google OAuth URL
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=${responseType}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=select_account`;
    
    // Open Google login page in same window
    window.location.href = googleAuthUrl;
    
    return Promise.resolve();
  }, [googleClientId, onError]);

  const startFacebookLogin = useCallback(() => {
    if (!facebookAppId) {
      onError?.('Facebook login is not configured. Please add REACT_APP_FACEBOOK_APP_ID to environment variables.');
      return Promise.resolve();
    }

    if (!window.FB) {
      // Try to initialize if not ready
      if (typeof window.FB === 'undefined') {
        onError?.('Facebook services are loading. Please wait a moment and try again.');
        return Promise.resolve();
      }
    }

    return new Promise((resolve) => {
      window.FB.login(
        async (response) => {
          if (!response?.authResponse?.accessToken) {
            if (response.status === 'not_authorized' || response.status === 'unknown') {
              onError?.('Facebook sign-in was cancelled or not authorized.');
            } else {
              onError?.('Facebook sign-in was cancelled.');
            }
            resolve();
            return;
          }
          const result = await socialLogin('facebook', { accessToken: response.authResponse.accessToken });
          if (result.success) {
            onSuccess?.('facebook');
          } else {
            onError?.(result.message);
          }
          resolve();
        },
        { scope: 'email,public_profile' }
      );
    });
  }, [facebookAppId, onError, onSuccess, socialLogin]);

  return {
    googleClientId,
    facebookAppId,
    googleReady,
    facebookReady,
    startGoogleLogin,
    startFacebookLogin
  };
};

export default useSocialAuth;

