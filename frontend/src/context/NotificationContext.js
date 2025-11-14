import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead as apiMarkNotificationAsRead,
  markAllAsRead as apiMarkAllAsRead,
  deleteNotification as apiDeleteNotification,
  deleteAllNotifications as apiDeleteAllNotifications
} from '../api/notifications';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState('default');
  const [loading, setLoading] = useState(false);

  const persistNotifications = useCallback(
    (entries) => {
      if (user?.id && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`notifications_${user.id}`, JSON.stringify(entries));
      }
    },
    [user?.id]
  );

  const updateUnreadCount = useCallback((entries) => {
    setUnreadCount(entries.filter((n) => !n.read).length);
  }, []);

  const bootstrapFromStorage = useCallback(() => {
    if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const stored = window.localStorage.getItem(`notifications_${user.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
        updateUnreadCount(parsed);
      } catch (error) {
        console.error('Error parsing stored notifications:', error);
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [updateUnreadCount, user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const [listResponse, unreadResponse] = await Promise.all([
        getNotifications(),
        getUnreadCount()
      ]);
      const entries = Array.isArray(listResponse?.notifications)
        ? listResponse.notifications
        : Array.isArray(listResponse)
        ? listResponse
        : [];
      setNotifications(entries);
      const unread = unreadResponse?.count ?? entries.filter((n) => !n.read).length;
      setUnreadCount(unread);
      persistNotifications(entries);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      bootstrapFromStorage();
    } finally {
      setLoading(false);
    }
  }, [bootstrapFromStorage, persistNotifications, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    bootstrapFromStorage();
    loadNotifications();
  }, [bootstrapFromStorage, loadNotifications, user?.id]);

  // Request push notification permission
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      setPushPermission('default');
    } else if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPushPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      return permission === 'granted';
    }

    return false;
  }, []);

  const addNotification = useCallback(
    (notification) => {
      const newNotification = {
        id: notification.id || Date.now() + Math.random(),
        ...notification,
        timestamp: notification.timestamp || new Date().toISOString(),
        read: Boolean(notification.read)
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        persistNotifications(updated);
        updateUnreadCount(updated);
        return updated;
      });

      if (pushPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const browserNotification = new Notification(notification.title || 'New Notification', {
            body: notification.message,
            icon: notification.avatar || '/favicon.ico',
            badge: '/favicon.ico',
            tag: String(newNotification.id),
            requireInteraction: false,
          });

          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
          };

          setTimeout(() => browserNotification.close(), 5000);
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      }

      return newNotification;
    },
    [persistNotifications, pushPermission, updateUnreadCount]
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
        persistNotifications(updated);
        updateUnreadCount(updated);
        return updated;
      });

      try {
        await apiMarkNotificationAsRead(notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    [persistNotifications, updateUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      persistNotifications(updated);
      updateUnreadCount(updated);
      return updated;
    });

    try {
      await apiMarkAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [persistNotifications, updateUnreadCount]);

  const deleteNotification = useCallback(
    async (notificationId) => {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        persistNotifications(updated);
        updateUnreadCount(updated);
        return updated;
      });

      try {
        await apiDeleteNotification(notificationId);
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    },
    [persistNotifications, updateUnreadCount]
  );

  const deleteAllNotifications = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    persistNotifications([]);

    try {
      await apiDeleteAllNotifications();
    } catch (error) {
      console.error('Failed to delete notifications:', error);
    }
  }, [persistNotifications]);

  const value = {
    notifications,
    unreadCount,
    pushPermission,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    requestPushPermission,
    refreshNotifications: loadNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
