import api from '../config/axios';

// ==================== PRODUCTS ====================

// Get all products
export const getAllProducts = async (params = {}) => {
  const response = await api.get('/api/products', { params });
  return response.data;
};

// Get product by ID
export const getProduct = async (id) => {
  const response = await api.get(`/api/products/${id}`);
  return response.data;
};

// Search products
export const searchProducts = async (query, params = {}) => {
  const response = await api.get(`/api/products/search/${encodeURIComponent(query)}`, { params });
  return response.data;
};

// Get trending products
export const getTrendingProducts = async (limit = 20) => {
  const response = await api.get('/api/products/trending', { params: { limit } });
  return response.data;
};

// Get products by category
export const getProductsByCategory = async (category, params = {}) => {
  const response = await api.get(`/api/products/category/${category}`, { params });
  return response.data;
};

// ==================== PRODUCT TAGGING (for creators) ====================

// Tag product to video
export const tagProductToVideo = async (videoId, productId, data = {}) => {
  const response = await api.post(`/api/products/videos/${videoId}/tag`, { productId, ...data });
  return response.data;
};

// Get products tagged in video
export const getVideoTaggedProducts = async (videoId) => {
  const response = await api.get(`/api/products/videos/${videoId}`);
  return response.data;
};

// Remove product tag from video
export const removeProductTag = async (videoId, productId) => {
  const response = await api.delete(`/api/products/videos/${videoId}/tag/${productId}`);
  return response.data;
};

// ==================== PRODUCT INTERACTIONS ====================

// Add product to favorites
export const addProductToFavorites = async (productId) => {
  const response = await api.post(`/api/products/${productId}/favorite`);
  return response.data;
};

// Remove product from favorites
export const removeProductFromFavorites = async (productId) => {
  const response = await api.delete(`/api/products/${productId}/favorite`);
  return response.data;
};

// Get favorite products
export const getFavoriteProducts = async () => {
  const response = await api.get('/api/products/favorites');
  return response.data;
};
