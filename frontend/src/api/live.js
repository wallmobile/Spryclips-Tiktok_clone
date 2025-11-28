import axios from './index';

/**
 * Get all active live streams
 */
export const getActiveLiveStreams = async (category = 'all') => {
  try {
    const response = await axios.get('/api/live/active', {
      params: { category }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching active live streams:', error);
    throw error;
  }
};

/**
 * Get live stream details by ID
 */
export const getLiveStreamDetails = async (streamId) => {
  try {
    const response = await axios.get(`/api/live/${streamId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching live stream details:', error);
    throw error;
  }
};

/**
 * Start a new live stream
 */
export const startLiveStream = async (data) => {
  try {
    const response = await axios.post('/api/live/start', data);
    return response.data;
  } catch (error) {
    console.error('Error starting live stream:', error);
    throw error;
  }
};

/**
 * End a live stream
 */
export const endLiveStream = async (streamId) => {
  try {
    const response = await axios.post(`/api/live/${streamId}/end`);
    return response.data;
  } catch (error) {
    console.error('Error ending live stream:', error);
    throw error;
  }
};

/**
 * Update viewer count (join/leave)
 */
export const updateViewerCount = async (streamId, action) => {
  try {
    const response = await axios.post(`/api/live/${streamId}/viewer`, { action });
    return response.data;
  } catch (error) {
    console.error('Error updating viewer count:', error);
    throw error;
  }
};

/**
 * Send chat message
 */
export const sendChatMessage = async (streamId, message) => {
  try {
    const response = await axios.post(`/api/live/${streamId}/chat`, {
      message,
      type: 'text'
    });
    return response.data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

/**
 * Get chat messages
 */
export const getChatMessages = async (streamId, limit = 50) => {
  try {
    const response = await axios.get(`/api/live/${streamId}/chat`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }
};

/**
 * Like/Unlike live stream
 */
export const toggleLikeLiveStream = async (streamId) => {
  try {
    const response = await axios.post(`/api/live/${streamId}/like`);
    return response.data;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

/**
 * Send gift on live stream
 */
export const sendGift = async (streamId, giftId) => {
  try {
    const response = await axios.post(`/api/live/${streamId}/gift`, { giftId });
    return response.data;
  } catch (error) {
    console.error('Error sending gift:', error);
    throw error;
  }
};

/**
 * Get available gift types
 */
export const getGiftTypes = async (category = 'all') => {
  try {
    const response = await axios.get('/api/live/gift-types', {
      params: { category }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching gift types:', error);
    throw error;
  }
};

