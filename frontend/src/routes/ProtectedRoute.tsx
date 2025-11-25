import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = '/login' }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: '#2563EB',
          fontWeight: 600
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px', display: 'block' }}></i>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!loading && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

