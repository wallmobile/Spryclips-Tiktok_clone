import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Check if there's a cached user in localStorage for instant access
  const hasCachedUser = React.useMemo(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      // User is considered cached if we have both user data and token
      return (!!savedUser && savedUser !== 'null' && savedUser !== 'undefined') || !!token;
    } catch {
      return false;
    }
  }, []);

  // PRIORITY 1: If we have a cached user OR a user from context, render children immediately
  // This ensures page stays on refresh
  if (hasCachedUser || user || isAuthenticated) {
    return children;
  }

  // PRIORITY 2: Still loading - show brief loading spinner
  if (loading) {
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

  // PRIORITY 3: Not authenticated and no cached user - redirect to login
  return <Navigate to={redirectTo} state={{ from: location }} replace />;
};

export default ProtectedRoute;
