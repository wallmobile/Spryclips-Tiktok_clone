import React, { useState } from 'react';
import './GetApp.css';

const GetApp = ({ onClose }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('ios'); // Default to iOS like TikTok
  const [installMessage, setInstallMessage] = useState('');

  const platforms = [
    {
      id: 'ios',
      name: 'iOS',
      icon: 'fa-brands fa-apple',
      color: '#000000',
      heading: 'Download the latest official TikTok app for iOS',
      description: 'Download for iPhone and iPad',
      downloadUrl: window.location.origin,
      storeUrl: '#'
    },
    {
      id: 'android',
      name: 'Android',
      icon: 'fa-brands fa-android',
      color: '#3DDC84',
      heading: 'Download the latest official TikTok app for Android',
      description: 'Download for Android devices',
      downloadUrl: window.location.origin,
      storeUrl: '#'
    }
  ];

  const currentPlatform = platforms.find(p => p.id === selectedPlatform) || platforms[0];

  const handlePlatformSelect = (platformId) => {
    setSelectedPlatform(platformId);
  };

  const handleDownload = async () => {
    if (currentPlatform) {
      setInstallMessage('');

      // Try to register service worker first
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('Service Worker registered:', registration);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }

      // Check if install prompt is available (Chrome/Edge)
      if (window.deferredPrompt) {
        // Trigger the install prompt
        window.deferredPrompt.prompt();
        
        // Wait for user's response
        const { outcome } = await window.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setInstallMessage('App is installing...');
          console.log('User accepted the install prompt');
        } else {
          setInstallMessage('Installation cancelled');
          setTimeout(() => setInstallMessage(''), 2000);
        }
        
        // Clear the deferred prompt
        window.deferredPrompt = null;
      } else {
        // No install prompt available - check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
          setInstallMessage('App is already installed!');
          setTimeout(() => setInstallMessage(''), 2000);
        } else {
          // Show message that install icon should appear in address bar
          setInstallMessage('Look for the install icon (➕) in your browser address bar');
          setTimeout(() => setInstallMessage(''), 3000);
        }
      }
    }
  };

  return (
    <div className="get-app-overlay" onClick={onClose}>
      <div className="get-app-page" onClick={(e) => e.stopPropagation()}>
        <div className="get-app-header">
          <button className="get-app-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Download App</h2>
          <div className="get-app-header-placeholder"></div>
        </div>

        <div className="get-app-content">
          <div className="get-app-main">
            <div className="get-app-left">
              <div className="get-app-hero">
                <div className="platform-tabs">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      className={`platform-tab ${selectedPlatform === platform.id ? 'active' : ''}`}
                      onClick={() => handlePlatformSelect(platform.id)}
                    >
                      <i className={platform.icon}></i>
                      <span>{platform.name}</span>
                    </button>
                  ))}
                </div>
                <h2 className="platform-heading">{currentPlatform.heading}</h2>
                <h1 className="get-app-title">Download TikTok - Make Your Day</h1>
                
                <div className="download-section">
                  <button className="download-btn" onClick={handleDownload}>
                    <i className={currentPlatform.icon}></i>
                    Download for {currentPlatform.name}
                  </button>
                  {installMessage && (
                    <p className="install-message">{installMessage}</p>
                  )}
                </div>

                <div className="qr-codes-section">
                  <div className="qr-code-item">
                    <div className="qr-code">
                      <div className="qr-placeholder">
                        <i className="fa-solid fa-qrcode"></i>
                      </div>
                    </div>
                    <p className="qr-label">Scan QR code to download</p>
                  </div>
                  <div className="qr-code-item">
                    <div className="qr-code">
                      <div className="qr-placeholder">
                        <i className="fa-solid fa-qrcode"></i>
                      </div>
                    </div>
                    <p className="qr-label">Scan QR code to download</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="get-app-right">
              <div className="phone-mockup">
                <div className="phone-screen">
                  <div className="phone-header">
                    <div className="phone-logo">
                      <strong>TikTok</strong>
                    </div>
                    <div className="phone-search">
                      <i className="fa-solid fa-search"></i>
                    </div>
                    <button className="phone-login-btn">Log in</button>
                    <button className="phone-menu-btn">
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                  </div>
                  <div className="phone-video">
                    <div className="video-content">
                      <div className="video-people">
                        <div className="person person-1"></div>
                        <div className="person person-2"></div>
                      </div>
                      <div className="video-lights">
                        <div className="light light-blue"></div>
                        <div className="light light-purple"></div>
                        <div className="light light-pink"></div>
                      </div>
                    </div>
                  </div>
                  <div className="phone-qr-box">
                    <p className="qr-box-text">Scan QR code to download</p>
                    <div className="qr-box-code">
                      <i className="fa-solid fa-qrcode"></i>
                    </div>
                  </div>
                </div>
                <div className="tiktok-logo-3d">
                  <i className="fa-brands fa-tiktok"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetApp;

