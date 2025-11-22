import api from '../config/axios';

// ==================== CONVERSATIONS ====================

// Get all conversations
export const getConversations = async () => {
  const response = await api.get('/api/messages/conversations');
  return response.data;
};

// Get or create conversation
export const getOrCreateConversation = async (userId) => {
  const response = await api.post('/api/messages/conversations', { userId });
  return response.data;
};

// Get messages in conversation
export const getMessages = async (conversationId, params = {}) => {
  const response = await api.get(`/api/messages/conversations/${conversationId}/messages`, { params });
  return response.data;
};

// ==================== MESSAGES ====================

// Send message
export const sendMessage = async (conversationId, messageData) => {
  const response = await api.post(`/api/messages/conversations/${conversationId}/messages`, messageData);
  return response.data;
};

// Mark message as read
export const markMessageAsRead = async (messageId) => {
  const response = await api.put(`/api/messages/messages/${messageId}/read`);
  return response.data;
};

// Delete message
export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/api/messages/messages/${messageId}`);
  return response.data;
};

// React to message
export const reactToMessage = async (messageId, emoji) => {
  const response = await api.post(`/api/messages/messages/${messageId}/react`, { emoji });
  return response.data;
};

// ==================== CONVERSATION ACTIONS ====================

// Pin/unpin conversation
export const pinConversation = async (conversationId) => {
  const response = await api.put(`/api/messages/conversations/${conversationId}/pin`);
  return response.data;
};

// Archive/unarchive conversation
export const archiveConversation = async (conversationId) => {
  const response = await api.put(`/api/messages/conversations/${conversationId}/archive`);
  return response.data;
};

