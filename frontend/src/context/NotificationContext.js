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
      console.log('⚠️ Cannot load notifications: no user ID');
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    console.log('📬 Loading notifications for user:', user.id);
    setLoading(true);
    try {
      const [listResponse, unreadResponse] = await Promise.all([
        getNotifications(),
        getUnreadCount()
      ]);
      
      console.log('📬 Notification API responses:', {
        listResponseKeys: Object.keys(listResponse || {}),
        notificationsCount: listResponse?.notifications?.length || 0,
        unreadCount: unreadResponse?.unreadCount || 0,
        hasNotifications: !!listResponse?.notifications,
        isArray: Array.isArray(listResponse?.notifications),
        rawListResponse: listResponse
      });
      
      const rawEntries = Array.isArray(listResponse?.notifications)
        ? listResponse.notifications
        : Array.isArray(listResponse)
        ? listResponse
        : [];
      
      console.log('📬 Raw notification entries:', {
        count: rawEntries.length,
        types: rawEntries.map(n => n.type),
        likesCount: rawEntries.filter(n => n.type === 'likes').length,
        allNotifications: rawEntries.map(n => ({
          id: n._id || n.id,
          type: n.type,
          message: n.message,
          title: n.title,
          createdAt: n.createdAt,
          isRead: n.isRead || n.read
        }))
      });
      
      // Transform backend data to frontend format
      const entries = rawEntries.map(notif => ({
        id: notif._id || notif.id,
        type: notif.type || 'likes',
        title: notif.title || '',
        message: notif.message || '',
        username: notif.relatedUser?.username || notif.relatedUser?.profile?.displayName || 'Someone',
        avatar: notif.relatedUser?.profile?.avatar || notif.relatedUser?.avatar || null,
        thumbnail: notif.relatedVideo?.thumbnail || null,
        videoUrl: notif.relatedVideo?.url || null,
        read: notif.isRead || notif.read || false,
        timestamp: notif.createdAt || notif.timestamp || new Date().toISOString(),
        metadata: notif.metadata || {}
      }));
      
      const likesNotifications = entries.filter(n => n.type === 'likes');
      console.log('📬 Transformed notifications:', {
        count: entries.length,
        likesCount: likesNotifications.length,
        allTypes: entries.map(n => n.type),
        likesNotifications: likesNotifications.map(n => ({
          id: n.id,
          message: n.message,
          title: n.title,
          timestamp: n.timestamp,
          username: n.username,
          read: n.read
        })),
        allNotifications: entries.map(n => ({
          id: n.id,
          type: n.type,
          message: n.message,
          title: n.title
        }))
      });
      
      setNotifications(entries);
      const unread = unreadResponse?.unreadCount ?? entries.filter((n) => !n.read).length;
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

  // Listen for notification refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (user?.id) {
        console.log('🔄 Notification refresh event received, reloading notifications...');
        loadNotifications();
      }
    };

    window.addEventListener('notifications:refresh', handleRefresh);
    return () => {
      window.removeEventListener('notifications:refresh', handleRefresh);
    };
  }, [loadNotifications, user?.id]);

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
      // Optimistic update
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
        // Revert on error if needed
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
