import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './NotificationCenter.css';

const NotificationCenter = ({ onClose }) => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
    loading
  } = useNotification();
  const [activeFilter, setActiveFilter] = useState('all');
  const notificationsEndRef = useRef(null);

  const filters = [
    { id: 'all', label: 'All', icon: 'fa-solid fa-bell' },
    { id: 'likes', label: 'Likes', icon: 'fa-solid fa-heart' },
    { id: 'comments', label: 'Comments', icon: 'fa-solid fa-comment' },
    { id: 'follows', label: 'Followers', icon: 'fa-solid fa-user-plus' },
    { id: 'mentions', label: 'Mentions', icon: 'fa-solid fa-at' },
    { id: 'live', label: 'Live', icon: 'fa-solid fa-broadcast-tower' },
  ];

  const filteredNotifications = notifications.filter(notif => {
    if (activeFilter === 'all') return true;
    return notif.type === activeFilter;
  });

  const filteredUnreadCount = filteredNotifications.filter(n => !n.read).length;

  // Auto-scroll to top when filter changes
  useEffect(() => {
    if (notificationsEndRef.current) {
      notificationsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeFilter]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    // Navigate to related content if needed
    // onNavigate?.(notification);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'likes':
        return 'fa-solid fa-heart';
      case 'comments':
        return 'fa-solid fa-comment';
      case 'follows':
        return 'fa-solid fa-user-plus';
      case 'mentions':
        return 'fa-solid fa-at';
      case 'live':
        return 'fa-solid fa-broadcast-tower';
      case 'shares':
        return 'fa-solid fa-share';
      default:
        return 'fa-solid fa-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'likes':
        return '#FF3B6E';
      case 'comments':
        return '#007AFF';
      case 'follows':
        return '#34C759';
      case 'mentions':
        return '#FF9500';
      case 'live':
        return '#FF0000';
      case 'shares':
        return '#5856D6';
      default:
        return '#2563EB';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="notification-center-overlay">
      <div className="notification-center-modal">
        {/* Header */}
        <div className="notification-center-header">
          <button className="notification-center-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>
            Notifications
            {unreadCount > 0 && (
              <span className="notification-badge-header">{unreadCount}</span>
            )}
          </h2>
          <div className="notification-header-actions">
            <button
              className="notification-refresh-btn"
              onClick={refreshNotifications}
              title="Refresh"
            >
              <i className="fa-solid fa-rotate"></i>
            </button>
            {filteredUnreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <i className="fa-solid fa-check-double"></i>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                className="clear-all-notifications"
                onClick={deleteAllNotifications}
                title="Clear all notifications"
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="notification-filters">
          {filters.map(filter => {
            const filterCount = filter.id === 'all'
              ? unreadCount
              : notifications.filter(n => !n.read && n.type === filter.id).length;
            
            return (
              <button
                key={filter.id}
                className={`notification-filter-btn ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                <i className={filter.icon}></i>
                <span>{filter.label}</span>
                {filterCount > 0 && (
                  <span className="filter-count">{filterCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {user && (
          <div className="notification-user-summary">
            <div className="notification-user-avatar">
              <img
                src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=2563EB&color=fff`}
                alt={user?.username || 'Current user'}
              />
            </div>
            <div className="notification-user-details">
              <span className="notification-user-name">
                {user?.profile?.displayName || user?.username || 'Creator'}
              </span>
              <span className="notification-user-status">
                {filteredUnreadCount > 0
                  ? `You have ${filteredUnreadCount} new ${filteredUnreadCount === 1 ? 'notification' : 'notifications'}`
                  : 'You are all caught up'}
              </span>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="notifications-list">
          {loading && notifications.length === 0 ? (
            <div className="notifications-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading notifications…</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="empty-notifications">
              <i className="fa-solid fa-bell-slash"></i>
              <p>No notifications yet</p>
              <span>When you get notifications, they'll show up here</span>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-avatar">
                  <img
                    src={notification.avatar || `https://ui-avatars.com/api/?name=${notification.username}&background=${getNotificationColor(notification.type).replace('#', '')}&color=fff`}
                    alt={notification.username}
                  />
                  <div
                    className="notification-icon"
                    style={{ backgroundColor: getNotificationColor(notification.type) }}
                  >
                    <i className={getNotificationIcon(notification.type)}></i>
                  </div>
                </div>
                <div className="notification-content">
                  <div className="notification-text">
                    <strong>{notification.username}</strong>
                    {' '}
                    {notification.message}
                  </div>
                  <div className="notification-time">{formatTime(notification.timestamp)}</div>
                  {notification.thumbnail && (
                    <div className="notification-thumbnail">
                      <img src={notification.thumbnail} alt="Preview" />
                    </div>
                  )}
                </div>
                <div className="notification-actions">
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                  <button
                    className="delete-notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Delete"
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={notificationsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
