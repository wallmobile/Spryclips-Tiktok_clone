import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { socialLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract access token from URL hash (response_type=token)
        const hash = location.hash.substring(1); // Remove #
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const errorParam = params.get('error');
        const state = params.get('state');

        // Verify state
        const storedState = sessionStorage.getItem('google_oauth_state');
        if (state && storedState && state !== storedState) {
          throw new Error('Invalid state parameter. Please try again.');
        }

        // Clear stored state
        sessionStorage.removeItem('google_oauth_state');

        if (errorParam) {
          throw new Error(errorParam === 'access_denied' 
            ? 'Google sign-in was cancelled.' 
            : `Google sign-in error: ${errorParam}`);
        }

        if (!accessToken) {
          throw new Error('No access token received from Google.');
        }

        // Call backend to verify token and login
        const result = await socialLogin('google', { accessToken });
        
        if (result.success) {
          // Redirect to home page
          navigate('/', { replace: true });
        } else {
          throw new Error(result.message || 'Google login failed.');
        }
      } catch (err) {
        console.error('Google OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Google login failed. Please try again.');
        setLoading(false);
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [location, navigate, socialLogin]);

  return (
    <div className="tiktok-signup-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="signup-right" style={{ maxWidth: '400px', textAlign: 'center' }}>
        {loading && (
          <>
            <div 
              style={{ 
                width: '50px',
                height: '50px',
                border: '4px solid rgba(37, 99, 235, 0.1)',
                borderTop: '4px solid #2563EB',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '2rem auto'
              }}
            ></div>
            <h2 style={{ marginTop: '1rem', color: '#2563EB' }}>Signing in...</h2>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Please wait while we complete your Google sign-in.</p>
            <style>
              {`@keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }`}
            </style>
          </>
        )}
        {error && (
          <>
            <div style={{ color: '#ef4444', marginTop: '2rem' }}>
              <i className="fa-solid fa-exclamation-circle" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
              <h2>Sign-in Failed</h2>
              <p>{error}</p>
              <p style={{ fontSize: '0.875rem', marginTop: '1rem', opacity: 0.8 }}>
                Redirecting to login page...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;

