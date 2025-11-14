import api from '../config/axios';

export const fetchStudioSummary = async () => {
  const response = await api.get('/api/more/studio');
  return response.data;
};

export const fetchEffectsToolbox = async () => {
  const response = await api.get('/api/more/effects');
  return response.data;
};

export const fetchShopOverview = async () => {
  const response = await api.get('/api/more/shop');
  return response.data;
};

export const fetchGrowthInsights = async () => {
  const response = await api.get('/api/more/growth');
  return response.data;
};

export const fetchSupportResources = async () => {
  const response = await api.get('/api/more/support');
  return response.data;
};

export const fetchSupportedLanguages = async () => {
  const response = await api.get('/api/more/languages');
  return response.data?.languages ?? [];
};

export const fetchExperiencePreferences = async () => {
  const response = await api.get('/api/more/preferences');
  return response.data;
};

export const updateExperiencePreferences = async (payload) => {
  const response = await api.patch('/api/more/preferences', payload);
  return response.data;
};

