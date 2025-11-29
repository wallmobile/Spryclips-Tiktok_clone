import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axios';
import './PersonalTools.css';

const PersonalTools = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qrRef = useRef(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Generate unique profile URL for QR code
  const profileUrl = `${window.location.origin}/@${user?.username || 'user'}`;
  
  const [personalStats, setPersonalStats] = useState({
    notifications: 0,
    qrScans: 0,
    activityToday: 0
  });

  // Fetch real QR stats from backend
  useEffect(() => {
    const fetchQRStats = async () => {
      try {
        const response = await api.get('/api/users/qr-stats');
        if (response.data.success) {
          setPersonalStats(prev => ({
            ...prev,
            qrScans: response.data.qrScans || 0
          }));
        }
      } catch (error) {
        console.error('Error fetching QR stats:', error);
      }
    };
    
    fetchQRStats();
  }, []);

  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Fetch real notifications/activities from backend
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoadingActivities(true);
        const response = await api.get('/api/notifications');
        if (response.data.notifications) {
          const formattedActivities = response.data.notifications.slice(0, 5).map(notif => ({
            id: notif._id,
            type: notif.type === 'likes' ? 'like' : 
                  notif.type === 'comments' ? 'comment' : 
                  notif.type === 'follows' ? 'follow' : 
                  notif.type === 'comment_reply' ? 'comment' :
                  notif.type,
            user: notif.relatedUser?.username || 'Unknown',
            userId: notif.relatedUser?._id,
            time: getTimeAgo(notif.createdAt),
            video: notif.relatedVideo?.description || null,
            videoId: notif.relatedVideo?._id
          }));
          setActivities(formattedActivities);
          setPersonalStats(prev => ({
            ...prev,
            notifications: response.data.notifications.filter(n => !n.isRead).length
          }));
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoadingActivities(false);
      }
    };
    
    fetchActivities();
  }, []);

  // Helper function to format time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

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
        // Navigate to Activity Center / Notifications
        onClose();
        navigate('/more/activity-center');
        break;
      case 'qrcode':
        // Scroll to QR code section
        const qrSection = document.querySelector('.qr-code-preview');
        if (qrSection) {
          qrSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          qrSection.classList.add('highlight-section');
          setTimeout(() => qrSection.classList.remove('highlight-section'), 2000);
        }
        break;
      default:
        break;
    }
  };

  const handleActivityClick = (activity) => {
    onClose();
    // Navigate to Activity Center to see all notifications
    navigate('/more/activity-center');
  };

  // Download QR Code as PNG image
  const handleQRDownload = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    // Add padding and background
    const padding = 40;
    const size = 256 + padding * 2;
    canvas.width = size;
    canvas.height = size + 60; // Extra space for username
    
    img.onload = () => {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR code
      ctx.drawImage(img, padding, padding, 256, 256);
      
      // Add username text
      ctx.fillStyle = '#161823';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`@${user?.username || 'user'}`, canvas.width / 2, canvas.height - 20);
      
      // Download
      const link = document.createElement('a');
      link.download = `${user?.username || 'user'}-qrcode.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [user?.username]);

  // Share QR Code
  const handleQRShare = useCallback(async () => {
    setShowShareModal(true);
  }, []);

  // Share to specific platform
  const shareToplatform = useCallback(async (platform) => {
    const shareText = `Follow me on TikTok! Scan my QR code or visit my profile: ${profileUrl}`;
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(profileUrl);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Follow me on TikTok! @${user?.username}`)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(`Follow @${user?.username} on TikTok`)}&body=${encodedText}`;
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(profileUrl);
          alert('Profile link copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        setShowShareModal(false);
        return;
      case 'native':
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Follow @${user?.username} on TikTok`,
              text: `Scan my QR code to follow me!`,
              url: profileUrl
            });
          } catch (err) {
            console.log('Share cancelled');
          }
        }
        setShowShareModal(false);
        return;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setShowShareModal(false);
  }, [profileUrl, user?.username]);

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
              {loadingActivities ? (
                <div className="activity-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Loading activities...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="activity-empty">
                  <i className="fa-solid fa-bell-slash"></i>
                  <span>No recent activity</span>
                </div>
              ) : (
                activities.map(activity => (
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
                ))
              )}
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="personal-section">
            <h3>Your QR Code</h3>
            <div className="qr-code-preview">
              <div className="qr-code-container">
                <div className="qr-code-actual" ref={qrRef}>
                  <QRCodeSVG
                    value={profileUrl}
                    size={140}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#161823"
                    imageSettings={{
                      src: user?.profile?.avatar || '/default-avatar.png',
                      x: undefined,
                      y: undefined,
                      height: 30,
                      width: 30,
                      excavate: true,
                    }}
                  />
                  <p className="qr-username">@{user?.username}</p>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Share Your QR Code</h3>
              <button className="share-modal-close" onClick={() => setShowShareModal(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="share-modal-qr">
              <QRCodeSVG
                value={profileUrl}
                size={180}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#161823"
              />
              <p>@{user?.username}</p>
            </div>
            <div className="share-modal-platforms">
              <button className="share-platform whatsapp" onClick={() => shareToplatform('whatsapp')}>
                <i className="fa-brands fa-whatsapp"></i>
                <span>WhatsApp</span>
              </button>
              <button className="share-platform facebook" onClick={() => shareToplatform('facebook')}>
                <i className="fa-brands fa-facebook"></i>
                <span>Facebook</span>
              </button>
              <button className="share-platform twitter" onClick={() => shareToplatform('twitter')}>
                <i className="fa-brands fa-twitter"></i>
                <span>Twitter</span>
              </button>
              <button className="share-platform telegram" onClick={() => shareToplatform('telegram')}>
                <i className="fa-brands fa-telegram"></i>
                <span>Telegram</span>
              </button>
              <button className="share-platform email" onClick={() => shareToplatform('email')}>
                <i className="fa-solid fa-envelope"></i>
                <span>Email</span>
              </button>
              <button className="share-platform copy" onClick={() => shareToplatform('copy')}>
                <i className="fa-solid fa-copy"></i>
                <span>Copy Link</span>
              </button>
            </div>
            {navigator.share && (
              <button className="share-native-btn" onClick={() => shareToplatform('native')}>
                <i className="fa-solid fa-share-nodes"></i>
                More Options
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalTools;














