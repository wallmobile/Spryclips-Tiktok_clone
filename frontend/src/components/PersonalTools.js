import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PersonalTools.css';

const PersonalTools = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [personalStats] = useState({
    notifications: 24,
    offlineVideos: 12,
    qrScans: 156,
    activityToday: 8
  });

  const [activities] = useState([
    { id: 1, type: 'like', user: 'user123', time: '2 min ago', video: 'Dancing video' },
    { id: 2, type: 'comment', user: 'tiktoker456', time: '5 min ago', video: 'Cooking tutorial' },
    { id: 3, type: 'follow', user: 'fan789', time: '10 min ago', video: null },
    { id: 4, type: 'share', user: 'friend321', time: '15 min ago', video: 'Comedy skit' },
    { id: 5, type: 'mention', user: 'creator999', time: '1 hour ago', video: 'Challenge video' }
  ]);

  const [offlineVideos] = useState([
    { id: 1, title: 'Morning Routine', duration: '0:45', size: '12.5 MB', thumbnail: '' },
    { id: 2, title: 'Recipe Tutorial', duration: '1:20', size: '18.2 MB', thumbnail: '' },
    { id: 3, title: 'Dance Challenge', duration: '0:30', size: '8.7 MB', thumbnail: '' },
    { id: 4, title: 'Travel Vlog', duration: '2:15', size: '32.1 MB', thumbnail: '' }
  ]);

  const personalSections = [
    {
      id: 'activity',
      title: 'Activity Center',
      description: 'View all your notifications and interactions',
      icon: 'fa-solid fa-bell',
      color: 'personal-primary',
      stats: `${personalStats.notifications} New`,
      featured: true
    },
    {
      id: 'offline',
      title: 'Offline Videos',
      description: 'Access your downloaded videos for offline viewing',
      icon: 'fa-solid fa-download',
      color: 'personal-secondary',
      stats: `${personalStats.offlineVideos} Videos`
    },
    {
      id: 'qrcode',
      title: 'Your QR Code',
      description: 'Share your profile with a personalized QR code',
      icon: 'fa-solid fa-qrcode',
      color: 'personal-tertiary',
      stats: `${personalStats.qrScans} Scans`
    }
  ];

  const handleSectionClick = (sectionId) => {
    switch (sectionId) {
      case 'activity':
        // Navigate to notifications/activity center
        onClose();
        navigate('/more?section=notifications');
        break;
      case 'offline':
        // Navigate to watch later (offline videos)
        onClose();
        navigate('/watch-later');
        break;
      case 'qrcode':
        // Show QR code modal or navigate to profile
        // For now, navigate to profile
        onClose();
        navigate('/profile');
        break;
      default:
        break;
    }
  };

  const handleActivityClick = (activity) => {
    if (activity.video) {
      // Navigate to video or user profile
      navigate(`/@${activity.user}`);
    } else {
      // Navigate to user profile
      navigate(`/@${activity.user}`);
    }
  };

  const handleOfflineVideoClick = (video) => {
    // Navigate to watch later to play the video
    navigate('/watch-later');
  };

  const handleQRDownload = () => {
    // In a real app, this would download the QR code image
    // For now, we can show a message or trigger download
    alert('QR Code download feature will be implemented');
  };

  const handleQRShare = () => {
    // In a real app, this would share the QR code
    // For now, we can use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `Follow @${user?.username} on TikTok`,
        text: `Scan this QR code to follow @${user?.username}`,
        url: window.location.origin + `/@${user?.username}`
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.origin + `/@${user?.username}`);
      alert('Profile link copied to clipboard!');
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'like': return 'fa-solid fa-heart';
      case 'comment': return 'fa-solid fa-comment';
      case 'follow': return 'fa-solid fa-user-plus';
      case 'share': return 'fa-solid fa-share';
      case 'mention': return 'fa-solid fa-at';
      default: return 'fa-solid fa-bell';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'like': return '#007AFF';
      case 'comment': return '#0051D5';
      case 'follow': return '#FF6B35';
      case 'share': return '#9B59B6';
      case 'mention': return '#2ECC71';
      default: return '#007AFF';
    }
  };

  return (
    <div className="personal-tools-overlay" onClick={onClose}>
      <div className="personal-tools-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="personal-tools-header">
          <button className="personal-tools-close-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-x"></i>
          </button>
          <h2>Personal Tools</h2>
          <div className="personal-tools-header-placeholder"></div>
        </div>

        {/* Full Page Scrollable Content */}
        <div className="personal-tools-content">
          {/* Personal Stats Overview */}
          <div className="personal-stats-overview">
            <div className="personal-stats-card">
              <div className="personal-stat-item">
                <span className="personal-stat-number">{personalStats.notifications}</span>
                <span className="personal-stat-label">Notifications</span>
              </div>
              <div className="personal-stat-item">
                <span className="personal-stat-number">{personalStats.offlineVideos}</span>
                <span className="personal-stat-label">Offline Videos</span>
              </div>
              <div className="personal-stat-item">
                <span className="personal-stat-number">{personalStats.qrScans}</span>
                <span className="personal-stat-label">QR Scans</span>
              </div>
              <div className="personal-stat-item">
                <span className="personal-stat-number">{personalStats.activityToday}</span>
                <span className="personal-stat-label">Today's Activity</span>
              </div>
            </div>
          </div>
          {/* Main Personal Tools */}
          <div className="personal-section">
            <div className="personal-tools-grid">
              {personalSections.map(section => (
                <div
                  key={section.id}
                  className={`personal-tool-card ${section.color} ${section.featured ? 'featured' : ''}`}
                  onClick={() => handleSectionClick(section.id)}
                >
                  <div className="personal-card-header">
                    <div className="personal-tool-icon">
                      <i className={section.icon}></i>
                    </div>
                    <div className="personal-tool-stats">
                      {section.stats}
                    </div>
                  </div>
                  <div className="personal-card-content">
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                  </div>
                  <div className="personal-card-footer">
                    <span className="open-personal-tool">
                      Open <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Preview */}
          <div className="personal-section">
            <h3>Recent Activity</h3>
            <div className="activity-preview-list">
              {activities.slice(0, 5).map(activity => (
                <div 
                  key={activity.id} 
                  className="activity-preview-item"
                  onClick={() => handleActivityClick(activity)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="activity-icon"
                    style={{
                      backgroundColor: getActivityColor(activity.type),
                      color: '#fff'
                    }}
                  >
                    <i className={getActivityIcon(activity.type)}></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-main">
                      <span className="activity-user">@{activity.user}</span>
                      <span className="activity-action">
                        {activity.type === 'like' && 'liked your video'}
                        {activity.type === 'comment' && 'commented on your video'}
                        {activity.type === 'follow' && 'started following you'}
                        {activity.type === 'share' && 'shared your video'}
                        {activity.type === 'mention' && 'mentioned you'}
                      </span>
                    </div>
                    {activity.video && (
                      <div className="activity-video">"{activity.video}"</div>
                    )}
                  </div>
                  <div className="activity-time">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Videos Preview */}
          <div className="personal-section">
            <h3>Offline Videos</h3>
            <div className="offline-videos-grid">
              {offlineVideos.slice(0, 4).map(video => (
                <div 
                  key={video.id} 
                  className="offline-video-card"
                  onClick={() => handleOfflineVideoClick(video)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="offline-video-thumbnail">
                    <i className="fa-solid fa-play"></i>
                    <div className="video-duration">{video.duration}</div>
                  </div>
                  <div className="offline-video-info">
                    <h5>{video.title}</h5>
                    <p>{video.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="personal-section">
            <h3>Your QR Code</h3>
            <div className="qr-code-preview">
              <div className="qr-code-container">
                <div className="qr-code-placeholder">
                  <i className="fa-solid fa-qrcode"></i>
                  <p>@{user?.username}</p>
                </div>
                <div className="qr-code-info">
                  <h4>Share Your Profile</h4>
                  <p>Let others scan this QR code to follow you instantly</p>
                  <div className="qr-actions">
                    <button className="qr-action-btn" onClick={handleQRDownload}>
                      <i className="fa-solid fa-download"></i>
                      Save QR Code
                    </button>
                    <button className="qr-action-btn" onClick={handleQRShare}>
                      <i className="fa-solid fa-share"></i>
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalTools;














