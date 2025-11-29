import api from '../config/axios';

// ==================== BUSINESS PROFILE ====================

export const getBusinessProfile = async () => {
  const response = await api.get('/api/business/profile');
  return response.data;
};

export const updateBusinessProfile = async (profileData) => {
  const response = await api.put('/api/business/profile', profileData);
  return response.data;
};

export const applyForVerification = async () => {
  const response = await api.post('/api/business/verification/apply');
  return response.data;
};

export const approveVerification = async () => {
  const response = await api.post('/api/business/verification/approve');
  return response.data;
};

// ==================== BIO LINK ====================

export const updateBioLink = async (linkData) => {
  const response = await api.put('/api/business/bio-link', linkData);
  return response.data;
};

export const trackBioLinkClick = async (userId) => {
  const response = await api.post(`/api/business/bio-link/click/${userId}`);
  return response.data;
};

// ==================== AD CAMPAIGNS ====================

export const getCampaigns = async () => {
  const response = await api.get('/api/business/campaigns');
  return response.data;
};

export const createCampaign = async (campaignData) => {
  const response = await api.post('/api/business/campaigns', campaignData);
  return response.data;
};

export const updateCampaignStatus = async (campaignId, status) => {
  const response = await api.put(`/api/business/campaigns/${campaignId}/status`, { status });
  return response.data;
};

export const simulateCampaign = async (campaignId) => {
  const response = await api.post(`/api/business/campaigns/${campaignId}/simulate`);
  return response.data;
};

export const deleteCampaign = async (campaignId) => {
  const response = await api.delete(`/api/business/campaigns/${campaignId}`);
  return response.data;
};

// ==================== PROMO CODES ====================

export const getPromoCodes = async () => {
  const response = await api.get('/api/business/promo-codes');
  return response.data;
};

export const createPromoCode = async (promoData) => {
  const response = await api.post('/api/business/promo-codes', promoData);
  return response.data;
};

export const togglePromoCode = async (promoId) => {
  const response = await api.put(`/api/business/promo-codes/${promoId}/toggle`);
  return response.data;
};

export const usePromoCode = async (code, orderAmount) => {
  const response = await api.post(`/api/business/promo-codes/${code}/use`, { orderAmount });
  return response.data;
};

export const deletePromoCode = async (promoId) => {
  const response = await api.delete(`/api/business/promo-codes/${promoId}`);
  return response.data;
};

// ==================== ANALYTICS ====================

export const getBusinessAnalytics = async (days = 30) => {
  const response = await api.get('/api/business/analytics', { params: { days } });
  return response.data;
};

export const getBusinessDashboard = async () => {
  const response = await api.get('/api/business/dashboard');
  return response.data;
};

// ==================== SAVED AUDIENCES ====================

export const getAudiences = async () => {
  const response = await api.get('/api/business/audiences');
  return response.data;
};

export const createAudience = async (audienceData) => {
  const response = await api.post('/api/business/audiences', audienceData);
  return response.data;
};

export const updateAudience = async (audienceId, audienceData) => {
  const response = await api.put(`/api/business/audiences/${audienceId}`, audienceData);
  return response.data;
};

export const deleteAudience = async (audienceId) => {
  const response = await api.delete(`/api/business/audiences/${audienceId}`);
  return response.data;
};

// ==================== PRODUCT CATALOG ====================

export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.category) params.append('category', filters.category);
  if (filters.search) params.append('search', filters.search);
  
  const response = await api.get(`/api/business/products?${params.toString()}`);
  return response.data;
};

export const getProduct = async (productId) => {
  const response = await api.get(`/api/business/products/${productId}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post('/api/business/products', productData);
  return response.data;
};

export const updateProduct = async (productId, productData) => {
  const response = await api.put(`/api/business/products/${productId}`, productData);
  return response.data;
};

export const toggleProductStatus = async (productId) => {
  const response = await api.put(`/api/business/products/${productId}/status`);
  return response.data;
};

export const deleteProduct = async (productId) => {
  const response = await api.delete(`/api/business/products/${productId}`);
  return response.data;
};

export const getProductCategories = async () => {
  const response = await api.get('/api/business/product-categories');
  return response.data;
};

// ==================== BRAND PARTNERSHIPS ====================

export const getPartnerships = async () => {
  const response = await api.get('/api/business/partnerships');
  return response.data;
};

export const createPartnershipApplication = async (partnershipData) => {
  const response = await api.post('/api/business/partnerships', partnershipData);
  return response.data;
};

export const updatePartnershipStatus = async (partnershipId, status) => {
  const response = await api.put(`/api/business/partnerships/${partnershipId}/status`, { status });
  return response.data;
};

export const deletePartnership = async (partnershipId) => {
  const response = await api.delete(`/api/business/partnerships/${partnershipId}`);
  return response.data;
};

// ==================== BUSINESS MESSAGING ====================

export const searchUsers = async (query) => {
  const response = await api.get(`/api/business/search-users?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const startNewConversation = async (userId, message) => {
  const response = await api.post('/api/business/conversations/new', { userId, message });
  return response.data;
};

export const getConversations = async (status = 'all') => {
  const response = await api.get(`/api/business/conversations?status=${status}`);
  return response.data;
};

export const getConversation = async (conversationId) => {
  const response = await api.get(`/api/business/conversations/${conversationId}`);
  return response.data;
};

export const sendMessage = async (conversationId, text) => {
  const response = await api.post(`/api/business/conversations/${conversationId}/messages`, { text });
  return response.data;
};

export const resolveConversation = async (conversationId) => {
  const response = await api.put(`/api/business/conversations/${conversationId}/resolve`);
  return response.data;
};

export const archiveConversation = async (conversationId) => {
  const response = await api.delete(`/api/business/conversations/${conversationId}`);
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/api/business/conversations/stats/unread');
  return response.data;
};

export const createDemoConversations = async () => {
  const response = await api.post('/api/business/conversations/demo');
  return response.data;
};

// ==================== MESSAGING SETTINGS ====================

export const getMessagingSettings = async () => {
  const response = await api.get('/api/business/messaging-settings');
  return response.data;
};

export const updateMessagingSettings = async (settings) => {
  const response = await api.put('/api/business/messaging-settings', settings);
  return response.data;
};

// ==================== QUICK REPLIES ====================

export const getQuickReplies = async () => {
  const response = await api.get('/api/business/quick-replies');
  return response.data;
};

export const createQuickReply = async (data) => {
  const response = await api.post('/api/business/quick-replies', data);
  return response.data;
};

export const updateQuickReply = async (id, data) => {
  const response = await api.put(`/api/business/quick-replies/${id}`, data);
  return response.data;
};

export const deleteQuickReply = async (id) => {
  const response = await api.delete(`/api/business/quick-replies/${id}`);
  return response.data;
};

// ==================== EXPORT REPORTS ====================

export const exportCSV = async () => {
  const response = await api.get('/api/business/export/csv', { responseType: 'blob' });
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `campaigns_report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

export const exportExcel = async () => {
  const response = await api.get('/api/business/export/excel', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `campaigns_report_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

export const exportPDF = async () => {
  const response = await api.get('/api/business/export/pdf', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/html' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `campaigns_report_${Date.now()}.html`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

const businessApi = {
  getBusinessProfile,
  updateBusinessProfile,
  applyForVerification,
  approveVerification,
  updateBioLink,
  trackBioLinkClick,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getPromoCodes,
  createPromoCode,
  togglePromoCode,
  usePromoCode,
  deletePromoCode,
  getBusinessAnalytics,
  getBusinessDashboard,
  getAudiences,
  createAudience,
  updateAudience,
  deleteAudience,
  exportCSV,
  exportExcel,
  exportPDF,
};

export default businessApi;


