import api from '../config/axios';

// Update profile (including website)
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/api/users/profile', profileData, {
      timeout: 15000, // 15 seconds timeout for large base64 data
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      throw new Error('Backend server is not running. Please start the server on port 5000.');
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

const usersApi = {
  updateProfile,
  blockUser,
  getBlockedUsers,
  pinVideo,
  getFollowRequests,
  handleFollowRequest
};

export default usersApi;
