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

  // Timeout after 3 seconds - don't wait forever
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setTimedOut(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [loading]);

  // If timed out and still loading, redirect to login
  if (timedOut && loading) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Show brief loading (max 3 sec)
  if (loading && !timedOut) {
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

  // Not authenticated - redirect to login
  if (!isAuthenticated && !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

