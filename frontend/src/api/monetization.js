import api from '../config/axios';

// ==================== BALANCE & EARNINGS ====================

export const getCreatorBalance = async () => {
  const response = await api.get('/api/monetization/balance');
  return response.data;
};

export const getEarnings = async (range = 'all') => {
  const response = await api.get('/api/monetization/earnings', {
    params: { range },
  });
  return response.data;
};

export const getTransactions = async (params = {}) => {
  const response = await api.get('/api/monetization/transactions', { params });
  return response.data;
};

// ==================== GIFTS ====================

export const getGiftsReceived = async (limit = 50) => {
  const response = await api.get('/api/monetization/gifts/received', {
    params: { limit },
  });
  return response.data;
};

export const getGiftsSent = async (limit = 50) => {
  const response = await api.get('/api/monetization/gifts/sent', {
    params: { limit },
  });
  return response.data;
};

export const sendGift = async (payload) => {
  const response = await api.post('/api/monetization/gift', payload);
  return response.data;
};

// ==================== PAYOUTS ====================

export const requestPayout = async (payload) => {
  const response = await api.post('/api/monetization/payout', payload);
  return response.data;
};

const monetizationApi = {
  getCreatorBalance,
  getEarnings,
  getTransactions,
  getGiftsReceived,
  getGiftsSent,
  sendGift,
  requestPayout,
};

export default monetizationApi;

