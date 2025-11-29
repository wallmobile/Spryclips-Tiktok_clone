import api from '../config/axios';

// Get all effects
export const getEffects = async (params = {}) => {
  const response = await api.get('/api/effects', { params });
  return response.data;
};

// Get effect categories
export const getEffectCategories = async () => {
  const response = await api.get('/api/effects/categories');
  return response.data;
};

// Get single effect by ID
export const getEffectById = async (id) => {
  const response = await api.get(`/api/effects/${id}`);
  return response.data;
};

// Get trending effects
export const getTrendingEffects = async (limit = 20) => {
  const response = await api.get('/api/effects', { 
    params: { sort: 'popular', limit } 
  });
  return response.data;
};

// Search effects
export const searchEffects = async (query, limit = 20) => {
  const response = await api.get(`/api/effects/search/${encodeURIComponent(query)}`, {
    params: { limit }
  });
  return response.data;
};

// Toggle favorite effect
export const toggleFavoriteEffect = async (effectId) => {
  const response = await api.post(`/api/effects/${effectId}/favorite`);
  return response.data;
};

// Get user's favorite effects
export const getFavoriteEffects = async () => {
  const response = await api.get('/api/effects/user/favorites');
  return response.data;
};

// Create new effect (admin only)
export const createEffect = async (effectData) => {
  const response = await api.post('/api/effects', effectData);
  return response.data;
};

const effectsApi = {
  getEffects,
  getEffectCategories,
  getEffectById,
  getTrendingEffects,
  searchEffects,
  toggleFavoriteEffect,
  getFavoriteEffects,
  createEffect,
};

export default effectsApi;


