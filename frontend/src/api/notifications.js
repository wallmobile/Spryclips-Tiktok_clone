import api from '../config/axios';

// ==================== GET NOTIFICATIONS ====================

// Get all notifications
export const getNotifications = async (params = {}) => {
  const response = await api.get('/api/notifications', { params });
  return response.data;
};

// Get unread notifications count
export const getUnreadCount = async () => {
  const response = await api.get('/api/notifications/unread-count');
  return response.data;
};

// ==================== MARK NOTIFICATIONS ====================

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  const response = await api.put(`/api/notifications/${notificationId}/read`);
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const response = await api.put('/api/notifications/read-all');
  return response.data;
};

// ==================== DELETE NOTIFICATIONS ====================

// Delete notification
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/api/notifications/${notificationId}`);
  return response.data;
};

// Delete all notifications
export const deleteAllNotifications = async () => {
  const response = await api.delete('/api/notifications');
  return response.data;
};

