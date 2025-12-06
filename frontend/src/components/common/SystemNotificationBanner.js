import React, { useState, useEffect, useRef } from 'react';
import './SystemNotificationBanner.css';

const SystemNotificationBanner = () => {
  const [notifications, setNotifications] = useState([]);
  const dismissedRef = useRef(new Set());

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const dismissedIds = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
    dismissedRef.current = new Set(dismissedIds);

    // Sample notifications - you can fetch from API
    const sampleNotifications = [
      {
        id: 1,
        type: 'info',
        title: 'System Notifications',
        message: 'You can now view TikTok Stories in your browser! Log in to start watching',
        icon: 'fa-bell',
        dismissible: true
      }
    ];

    // Filter out dismissed notifications
    const activeNotifications = sampleNotifications.filter(
      notif => !dismissedIds.includes(notif.id)
    );
    setNotifications(activeNotifications);
  }, []);

  const handleDismiss = (id) => {
    const newSet = new Set(dismissedRef.current);
    newSet.add(id);
    dismissedRef.current = newSet;
    const dismissedIds = Array.from(newSet);
    localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedIds));

    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="system-notification-banner-container">
      {notifications.map(notif => (
        <div key={notif.id} className={`system-notification-banner ${notif.type}`}>
          <div className="notification-content">
            <i className={`fa-solid ${notif.icon}`}></i>
            <div className="notification-text">
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
            </div>
          </div>
          {notif.dismissible && (
            <button
              className="notification-close-btn"
              onClick={() => handleDismiss(notif.id)}
              aria-label="Close notification"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default SystemNotificationBanner;

