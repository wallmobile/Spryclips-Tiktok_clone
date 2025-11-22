import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Login from './Login';
import Signup from './Signup';
import Profile from './Profile';
import UploadPage from './UploadPage';
import NotificationCenter from './NotificationCenter';
import Balance from './Balance';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount } = useNotification();
  const [activeOverlay, setActiveOverlay] = useState(null); // login, signup, profile, upload, notifications, balance, getApp

  const handleLogout = () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setActiveOverlay(null);
    }
  };

  const toggleOverlay = (overlay) => {
    setActiveOverlay((prev) => (prev === overlay ? null : overlay));
  };

  return (
    <>
      {/* Navbar only shows when NOT authenticated */}
      {!isAuthenticated && (
        <nav className="navbar">
          <div className="nav-right">
            {/* Horizontal top bar - Get Coins, Get App, Login */}
            <div className="nav-top-bar">
              <button 
                className="nav-top-btn get-coins-btn"
                onClick={() => toggleOverlay('balance')}
                title="Get Coins"
              >
                <i className="fa-solid fa-music"></i>
                <span>Get Coins</span>
              </button>
              <div className="nav-separator"></div>
              <button 
                className="nav-top-btn nav-top-btn--primary login-btn"
                onClick={() => toggleOverlay('login')}
              >
                Log in
              </button>
            </div>
          </div>
        </nav>
      )}

      {activeOverlay === 'login' && (
        <Login 
          onClose={() => setActiveOverlay(null)}
          onSwitchToSignup={() => {
            setActiveOverlay('signup');
          }}
        />
      )}

      {activeOverlay === 'signup' && (
        <Signup 
          onClose={() => setActiveOverlay(null)}
          onSwitchToLogin={() => {
            setActiveOverlay('login');
          }}
        />
      )}

      {activeOverlay === 'profile' && (
        <Profile onClose={() => setActiveOverlay(null)} />
      )}

      {activeOverlay === 'upload' && (
        <UploadPage 
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'notifications' && (
        <NotificationCenter 
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {activeOverlay === 'balance' && (
        <Balance 
          onClose={() => setActiveOverlay(null)}
        />
      )}

    </>
  );
};

export default Navbar;







