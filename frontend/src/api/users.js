import api from '../config/axios';

// Update profile (including website)
export const updateProfile = async (profileData) => {
  try {
    // Calculate timeout based on data size (banner can be large)
    const dataSize = JSON.stringify(profileData).length;
    const timeout = Math.max(60000, Math.ceil(dataSize / 1000) * 2); // At least 60s, or 2ms per KB
    
    const response = await api.put('/api/users/profile', profileData, {
      timeout: timeout, // Dynamic timeout based on data size
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      throw new Error('Backend server is not running. Please start the server on port 5000.');
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Request timeout. Banner is too large. Please use a smaller image (max 2MB).');
    }
    throw error;
  }
};

// Block/Unblock user
export const blockUser = async (userId) => {
  const response = await api.post(`/api/users/${userId}/block`);
  return response.data;
};

// Get blocked users
export const getBlockedUsers = async () => {
  const response = await api.get('/api/users/blocked/list');
  return response.data;
};

// Pin/Unpin video
export const pinVideo = async (videoId) => {
  const response = await api.post(`/api/users/pin-video/${videoId}`);
  return response.data;
};

// Get follow requests
export const getFollowRequests = async () => {
  const response = await api.get('/api/users/follow-requests');
  return response.data;
};

// Accept/Reject follow request
export const handleFollowRequest = async (requestId, action) => {
  const response = await api.post(`/api/users/follow-requests/${requestId}/${action}`);
  return response.data;
};

// Follow/Unfollow user
export const followUser = async (userId) => {
  try {
    const response = await api.post(`/api/users/${userId}/follow`);
    return response.data;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

const usersApi = {
  updateProfile,
  blockUser,
  getBlockedUsers,
  pinVideo,
  getFollowRequests,
  handleFollowRequest,
  followUser
};

export default usersApi;
