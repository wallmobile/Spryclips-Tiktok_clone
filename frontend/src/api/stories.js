import api from '../config/axios';

/**
 * Get stories from users you follow
 */
export const getFollowingStories = async () => {
  try {
    const response = await api.get('/api/stories/following');
    return response.data;
  } catch (error) {
    console.error('Error fetching following stories:', error);
    throw error;
  }
};

/**
 * Get stories for a specific user
 */
export const getUserStories = async (userId) => {
  try {
    const response = await api.get(`/api/stories/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user stories:', error);
    throw error;
  }
};

/**
 * Create a new story
 */
export const createStory = async (formData) => {
  try {
    const response = await api.post('/api/stories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating story:', error);
    throw error;
  }
};

/**
 * View a story (marks it as viewed)
 */
export const viewStory = async (storyId) => {
  try {
    const response = await api.post(`/api/stories/${storyId}/view`);
    return response.data;
  } catch (error) {
    console.error('Error viewing story:', error);
    throw error;
  }
};

/**
 * React to a story
 */
export const reactToStory = async (storyId, emoji = '❤️') => {
  try {
    const response = await api.post(`/api/stories/${storyId}/react`, { emoji });
    return response.data;
  } catch (error) {
    console.error('Error reacting to story:', error);
    throw error;
  }
};

/**
 * Reply to a story
 */
export const replyToStory = async (storyId, message) => {
  try {
    const response = await api.post(`/api/stories/${storyId}/reply`, { message });
    return response.data;
  } catch (error) {
    console.error('Error replying to story:', error);
    throw error;
  }
};

/**
 * Delete a story
 */
export const deleteStory = async (storyId) => {
  try {
    const response = await api.delete(`/api/stories/${storyId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};

/**
 * Get story details
 */
export const getStoryDetails = async (storyId) => {
  try {
    const response = await api.get(`/api/stories/${storyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching story details:', error);
    throw error;
  }
};


