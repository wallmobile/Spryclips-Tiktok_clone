import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Check if there's a cached user in localStorage for instant access
  const hasCachedUser = React.useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return !!savedUser && savedUser !== 'null' && savedUser !== 'undefined';
    } catch {
      return false;
    }
  }, []);

  // Timeout after 2 seconds - don't wait forever
  useEffect(() => {
    // If we have cached user, don't even start the timeout
    if (hasCachedUser || user) {
      return;
    }
    
    const timer = setTimeout(() => {
      if (loading && !user && !hasCachedUser) {
        setTimedOut(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading, user, hasCachedUser]);

  // If we have a cached user OR a user from context, render children immediately
  if (hasCachedUser || user) {
    return children;
  }

  // If timed out and still loading with no user, redirect to login
  if (timedOut && loading && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Show brief loading only if no cached user - with very short timeout
  if (loading && !timedOut && !hasCachedUser) {
    // For admin routes, don't show loading - render immediately
    if (location.pathname.startsWith('/admin')) {
      return children; // Render immediately for admin routes
    }
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        color: '#666'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #fe2c55',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Loading...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Not authenticated and no cached user - redirect to login
  if (!isAuthenticated && !user && !hasCachedUser) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
