import api from '../config/axios';

// Get comments for a video
export const getComments = async (videoId) => {
  try {
    // Skip API call for sample videos (IDs starting with "sample-")
    if (videoId && typeof videoId === 'string' && videoId.startsWith('sample-')) {
      return { comments: [] };
    }
    
    const response = await api.get(`/api/comments/video/${videoId}`);
    // Backend returns { comments: [...] }, ensure we return the same format
    if (response.data && response.data.comments) {
      return response.data;
    }
    // If response is already an array, wrap it
    if (Array.isArray(response.data)) {
      return { comments: response.data };
    }
    return response.data || { comments: [] };
  } catch (error) {
    // Don't show error for sample videos or 400 errors (invalid ID)
    if (videoId && typeof videoId === 'string' && videoId.startsWith('sample-')) {
      return { comments: [] };
    }
    if (error?.response?.status === 400) {
      // Invalid video ID - return empty comments silently
      return { comments: [] };
    }
    console.error('Error fetching comments:', error);
    return { comments: [] };
  }
};

// Add comment
export const addComment = async (videoId, text, parentId = null) => {
  try {
    // Don't allow commenting on sample videos
    if (videoId && typeof videoId === 'string' && videoId.startsWith('sample-')) {
      throw new Error('Comments are not available for this video. Please sign in to comment on uploaded videos.');
    }
    
    const response = await api.post(`/api/comments/video/${videoId}`, { text, parentId });
    // Backend returns { comment: {...} }
    return response.data || {};
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

// Update comment
export const updateComment = async (commentId, text) => {
  const response = await api.put(`/api/comments/${commentId}`, { text });
  return response.data;
};

// Delete comment
export const deleteComment = async (commentId) => {
  const response = await api.delete(`/api/comments/${commentId}`);
  return response.data;
};

// Pin/Unpin comment
export const pinComment = async (commentId) => {
  const response = await api.post(`/api/videos/comments/${commentId}/pin`);
  return response.data;
};

// Like/Unlike comment
export const toggleCommentLike = async (commentId) => {
  const response = await api.post(`/api/comments/${commentId}/like`);
  return response.data;
};

const commentsApi = {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  pinComment,
  toggleCommentLike
};

export default commentsApi;














