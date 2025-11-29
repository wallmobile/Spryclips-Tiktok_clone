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

// ==================== CREATOR FUND ====================

export const getCreatorFundStatus = async () => {
  const response = await api.get('/api/monetization/creator-fund');
  return response.data;
};

export const applyToCreatorFund = async () => {
  const response = await api.post('/api/monetization/creator-fund/apply');
  return response.data;
};

export const approveCreatorFund = async () => {
  const response = await api.post('/api/monetization/creator-fund/approve');
  return response.data;
};

// ==================== ADS REVENUE ====================

export const getAdsStatus = async () => {
  const response = await api.get('/api/monetization/ads');
  return response.data;
};

export const enableAds = async (settings = {}) => {
  const response = await api.post('/api/monetization/ads/enable', { settings });
  return response.data;
};

export const disableAds = async () => {
  const response = await api.post('/api/monetization/ads/disable');
  return response.data;
};

export const simulateAds = async (impressions = 1000, clicks = 50) => {
  const response = await api.post('/api/monetization/ads/simulate', { impressions, clicks });
  return response.data;
};

// ==================== SUBSCRIPTIONS ====================

export const getSubscriptionsStatus = async () => {
  const response = await api.get('/api/monetization/subscriptions');
  return response.data;
};

export const enableSubscriptions = async (plans = []) => {
  const response = await api.post('/api/monetization/subscriptions/enable', { plans });
  return response.data;
};

export const subscribeToCreator = async (creatorId, planId) => {
  const response = await api.post(`/api/monetization/subscriptions/subscribe/${creatorId}`, { planId });
  return response.data;
};

export const cancelSubscription = async (subscriptionId) => {
  const response = await api.post(`/api/monetization/subscriptions/cancel/${subscriptionId}`);
  return response.data;
};

// ==================== TIP JAR ====================

export const getTipJar = async () => {
  const response = await api.get('/api/monetization/tipjar');
  return response.data;
};

export const sendTip = async (receiverId, amount, message = '') => {
  const response = await api.post('/api/monetization/tipjar/send', { receiverId, amount, message });
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
  // Creator Fund
  getCreatorFundStatus,
  applyToCreatorFund,
  approveCreatorFund,
  // Ads
  getAdsStatus,
  enableAds,
  disableAds,
  simulateAds,
  // Subscriptions
  getSubscriptionsStatus,
  enableSubscriptions,
  subscribeToCreator,
  cancelSubscription,
  // Tip Jar
  getTipJar,
  sendTip,
};

export default monetizationApi;

