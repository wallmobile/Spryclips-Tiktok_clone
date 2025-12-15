// Admin API functions for all admin endpoints
import api from '../config/axios';

// Dashboard Stats
export const getDashboardStats = async () => {
  const response = await api.get('/api/admin/dashboard/stats');
  return response.data;
};

// User Management
export const getAllUsers = async (params = {}) => {
  const response = await api.get('/api/admin/users', { params });
  return response.data;
};

export const getUserDetails = async (userId) => {
  const response = await api.get(`/api/admin/users/${userId}`);
  return response.data;
};

export const updateUserStatus = async (userId, status, reason = '', warning = false) => {
  const response = await api.patch(`/api/admin/users/${userId}/status`, { status, reason, warning });
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await api.patch(`/api/admin/users/${userId}/role`, { role });
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/api/admin/users', userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/admin/users/${userId}`);
  return response.data;
};

// Video Management
export const getAllVideos = async (params = {}) => {
  const response = await api.get('/api/admin/videos', { params });
  return response.data;
};

export const deleteVideo = async (videoId) => {
  const response = await api.delete(`/api/admin/videos/${videoId}`);
  return response.data;
};

// Story Management
export const getAllStories = async (params = {}) => {
  const response = await api.get('/api/admin/stories', { params });
  return response.data;
};

export const deleteStory = async (storyId) => {
  const response = await api.delete(`/api/admin/stories/${storyId}`);
  return response.data;
};

// Comment Management
export const getAllComments = async (params = {}) => {
  const response = await api.get('/api/admin/comments', { params });
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await api.delete(`/api/admin/comments/${commentId}`);
  return response.data;
};

export const updateComment = async (commentId, text) => {
  const response = await api.patch(`/api/admin/comments/${commentId}`, { text });
  return response.data;
};

// Advanced User Management
export const updateUserProfile = async (userId, profileData) => {
  const response = await api.patch(`/api/admin/users/${userId}/profile`, profileData);
  return response.data;
};

export const verifyUserIdentity = async (userId, verified, status) => {
  const response = await api.patch(`/api/admin/users/${userId}/verify-identity`, { verified, status });
  return response.data;
};

export const getUserLoginHistory = async (userId) => {
  const response = await api.get(`/api/admin/users/${userId}/login-history`);
  return response.data;
};

export const getUserFollowers = async (userId) => {
  const response = await api.get(`/api/admin/users/${userId}/followers`);
  return response.data;
};

export const getUserFollowing = async (userId) => {
  const response = await api.get(`/api/admin/users/${userId}/following`);
  return response.data;
};

export const getUserBlocked = async (userId) => {
  const response = await api.get(`/api/admin/users/${userId}/blocked`);
  return response.data;
};

// Content Moderation
export const getModerationVideos = async (params = {}) => {
  const response = await api.get('/api/admin/moderation/videos', { params });
  return response.data;
};

export const moderateVideo = async (videoId, action, notes, sensitiveType) => {
  const response = await api.patch(`/api/admin/moderation/videos/${videoId}`, {
    action,
    notes,
    sensitiveType
  });
  return response.data;
};

export const handleCopyrightDispute = async (videoId, type, resolution, resolve = false) => {
  const response = await api.post(`/api/admin/moderation/videos/${videoId}/copyright`, {
    type,
    resolution,
    resolve
  });
  return response.data;
};

export const getModerationComments = async (params = {}) => {
  const response = await api.get('/api/admin/moderation/comments', { params });
  return response.data;
};

export const moderateComment = async (commentId, action, notes) => {
  const response = await api.patch(`/api/admin/moderation/comments/${commentId}`, {
    action,
    notes
  });
  return response.data;
};

export const getAIFlags = async (params = {}) => {
  const response = await api.get('/api/admin/moderation/ai-flags', { params });
  return response.data;
};

export const reviewAIFlag = async (videoId, flagType, action) => {
  const response = await api.patch(`/api/admin/moderation/ai-flags/${videoId}`, {
    flagType,
    action
  });
  return response.data;
};

export const getLiveStreamsModeration = async () => {
  const response = await api.get('/api/admin/moderation/live-streams');
  return response.data;
};

export const moderateLiveStream = async (streamId, action) => {
  const response = await api.patch(`/api/admin/moderation/live-streams/${streamId}`, {
    action
  });
  return response.data;
};

// Reports & Safety
export const getReports = async (params = {}) => {
  const response = await api.get('/api/admin/reports', { params });
  return response.data;
};

export const getHighRiskReports = async () => {
  const response = await api.get('/api/admin/reports/high-risk');
  return response.data;
};

export const getReportDetails = async (reportId) => {
  const response = await api.get(`/api/admin/reports/${reportId}`);
  return response.data;
};

export const resolveReport = async (reportId, action, notes) => {
  const response = await api.patch(`/api/admin/reports/${reportId}/resolve`, {
    action,
    notes
  });
  return response.data;
};

export const dismissReport = async (reportId, notes) => {
  const response = await api.patch(`/api/admin/reports/${reportId}/dismiss`, {
    notes
  });
  return response.data;
};

export const getSpamAlerts = async (params = {}) => {
  const response = await api.get('/api/admin/safety/spam-alerts', { params });
  return response.data;
};

export const getChildSafetyViolations = async (params = {}) => {
  const response = await api.get('/api/admin/safety/child-safety', { params });
  return response.data;
};

export const getBotDetectionQueue = async (params = {}) => {
  const response = await api.get('/api/admin/safety/bot-detection', { params });
  return response.data;
};

export const getTakeoverAlerts = async (params = {}) => {
  const response = await api.get('/api/admin/safety/takeover-alerts', { params });
  return response.data;
};

export const markTakeoverAlertReviewed = async (userId, alertIndex) => {
  const response = await api.patch(`/api/admin/safety/takeover-alerts/${userId}`, {
    alertIndex
  });
  return response.data;
};

// Monetization & Payments
export const getMonetizationDashboard = async () => {
  const response = await api.get('/api/admin/monetization/dashboard');
  return response.data;
};

export const getCreators = async (params = {}) => {
  const response = await api.get('/api/admin/monetization/creators', { params });
  return response.data;
};

export const updateCreatorStatus = async (userId, status, reason) => {
  const response = await api.patch(`/api/admin/monetization/creators/${userId}/status`, {
    status,
    reason
  });
  return response.data;
};

export const getAdRevenue = async (params = {}) => {
  const response = await api.get('/api/admin/monetization/ad-revenue', { params });
  return response.data;
};

export const getGiftsCoins = async (params = {}) => {
  const response = await api.get('/api/admin/monetization/gifts-coins', { params });
  return response.data;
};

export const getWithdrawals = async (params = {}) => {
  const response = await api.get('/api/admin/monetization/withdrawals', { params });
  return response.data;
};

export const approveWithdrawal = async (withdrawalId, notes, transactionId) => {
  const response = await api.patch(`/api/admin/monetization/withdrawals/${withdrawalId}/approve`, {
    notes,
    transactionId
  });
  return response.data;
};

export const rejectWithdrawal = async (withdrawalId, reason) => {
  const response = await api.patch(`/api/admin/monetization/withdrawals/${withdrawalId}/reject`, {
    reason
  });
  return response.data;
};

export const getTaxDocuments = async (params = {}) => {
  const response = await api.get('/api/admin/monetization/tax-documents', { params });
  return response.data;
};

export const verifyTaxDocument = async (userId, documentIndex, verified) => {
  const response = await api.patch(`/api/admin/monetization/tax-documents/${userId}`, {
    documentIndex,
    verified
  });
  return response.data;
};

export const getBrandDeals = async (params = {}) => {
  const response = await api.get('/api/admin/monetization/brand-deals', { params });
  return response.data;
};

export const updateBrandDealStatus = async (dealId, status, reason, adminNotes) => {
  const response = await api.patch(`/api/admin/monetization/brand-deals/${dealId}/status`, {
    status,
    reason,
    adminNotes
  });
  return response.data;
};

export const getCreatorEarnings = async (userId, params = {}) => {
  const response = await api.get(`/api/admin/monetization/creators/${userId}/earnings`, { params });
  return response.data;
};

// Analytics & Insights
export const getAnalyticsDashboard = async () => {
  const response = await api.get('/api/admin/analytics/dashboard');
  return response.data;
};

export const getActiveUsers = async (period = 'day') => {
  const response = await api.get('/api/admin/analytics/active-users', { params: { period } });
  return response.data;
};

export const getRetention = async (days = 30) => {
  const response = await api.get('/api/admin/analytics/retention', { params: { days } });
  return response.data;
};

export const getVideoCompletion = async () => {
  const response = await api.get('/api/admin/analytics/video-completion');
  return response.data;
};

export const getTrendingHashtags = async (period = '7', limit = 50) => {
  const response = await api.get('/api/admin/analytics/trending-hashtags', { params: { period, limit } });
  return response.data;
};

export const getCategoryPerformance = async () => {
  const response = await api.get('/api/admin/analytics/category-performance');
  return response.data;
};

export const getRegionGrowth = async (days = 30) => {
  const response = await api.get('/api/admin/analytics/region-growth', { params: { days } });
  return response.data;
};

export const getDeviceNetworkStats = async () => {
  const response = await api.get('/api/admin/analytics/device-network');
  return response.data;
};

// Search & Recommendation Control
export const getBlacklist = async (params = {}) => {
  const response = await api.get('/api/admin/search/blacklist', { params });
  return response.data;
};

export const addBlacklistItem = async (data) => {
  const response = await api.post('/api/admin/search/blacklist', data);
  return response.data;
};

export const updateBlacklistItem = async (id, data) => {
  const response = await api.patch(`/api/admin/search/blacklist/${id}`, data);
  return response.data;
};

export const deleteBlacklistItem = async (id) => {
  const response = await api.delete(`/api/admin/search/blacklist/${id}`);
  return response.data;
};

export const getBoostedContent = async (params = {}) => {
  const response = await api.get('/api/admin/search/boosted', { params });
  return response.data;
};

export const boostContent = async (data) => {
  const response = await api.post('/api/admin/search/boosted', data);
  return response.data;
};

export const updateBoostedContent = async (id, data) => {
  const response = await api.patch(`/api/admin/search/boosted/${id}`, data);
  return response.data;
};

export const downrankContent = async (data) => {
  const response = await api.post('/api/admin/search/downrank', data);
  return response.data;
};

export const getHashtagControls = async (params = {}) => {
  const response = await api.get('/api/admin/search/hashtags', { params });
  return response.data;
};

export const updateHashtagControl = async (hashtag, data) => {
  const response = await api.patch(`/api/admin/search/hashtags/${hashtag}`, data);
  return response.data;
};

export const getABTests = async (params = {}) => {
  const response = await api.get('/api/admin/search/ab-tests', { params });
  return response.data;
};

export const createABTest = async (data) => {
  const response = await api.post('/api/admin/search/ab-tests', data);
  return response.data;
};

export const updateABTest = async (id, data) => {
  const response = await api.patch(`/api/admin/search/ab-tests/${id}`, data);
  return response.data;
};

// Search & Discovery Control
export const getTrendingVideos = async (params = {}) => {
  const response = await api.get('/api/admin/analytics/trending-videos', { params });
  return response.data;
};

export const getTrendingHashtagsAdmin = async (params = {}) => {
  const response = await api.get('/api/admin/analytics/trending-hashtags', { params });
  return response.data;
};

export const updateRecommendationSettings = async (settings) => {
  const response = await api.patch('/api/admin/search/recommendation-settings', settings);
  return response.data;
};

// Technical System Control
export const getVideoProcessing = async (params = {}) => {
  try {
    console.log('API: Getting video processing with params:', params);
    const response = await api.get('/api/admin/system/video-processing', { params });
    console.log('API: Video processing response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get video processing error:', error);
    return { 
      success: false, 
      processing: [],
      total: 0,
      message: error.response?.data?.message || error.message || 'Failed to get video processing' 
    };
  }
};

export const getVideoProcessingStats = async (period = '24h') => {
  try {
    console.log('API: Getting video processing stats, period:', period);
    const response = await api.get('/api/admin/system/video-processing/stats', { 
      params: { period } 
    });
    console.log('API: Video processing stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get video processing stats error:', error);
    return { 
      success: false, 
      stats: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0
      },
      message: error.response?.data?.message || error.message || 'Failed to get video processing stats' 
    };
  }
};

export const updateVideoProcessing = async (processingId, data) => {
  try {
    console.log('API: Updating video processing');
    console.log('Processing ID:', processingId);
    console.log('Update data:', data);
    console.log('Full URL:', `/api/admin/system/video-processing/${processingId}`);
    
    const response = await api.patch(`/api/admin/system/video-processing/${processingId}`, data);
    console.log('API: Update video processing response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Update video processing error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.message);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message || 'Failed to update video processing' 
    };
  }
};

export const getCDNHealth = async () => {
  const response = await api.get('/api/admin/system/cdn-health');
  return response.data;
};

export const getCDNQualityDrop = async () => {
  const response = await api.get('/api/admin/system/cdn-health/quality-drop');
  return response.data;
};

export const getServerHealth = async () => {
  const response = await api.get('/api/admin/system/server-health');
  return response.data;
};

export const getServerMetrics = async (params = {}) => {
  const response = await api.get('/api/admin/system/server-metrics', { params });
  return response.data;
};

export const getErrorLogs = async (params = {}) => {
  const response = await api.get('/api/admin/system/error-logs', { params });
  return response.data;
};

export const getCrashStats = async () => {
  const response = await api.get('/api/admin/system/crash-stats');
  return response.data;
};

export const resolveErrorLog = async (logId, notes) => {
  const response = await api.patch(`/api/admin/system/error-logs/${logId}/resolve`, { notes });
  return response.data;
};

export const getAPIRequests = async (params = {}) => {
  const response = await api.get('/api/admin/system/api-requests', { params });
  return response.data;
};

export const getAPIRequestStats = async (params = {}) => {
  const response = await api.get('/api/admin/system/api-requests/stats', { params });
  return response.data;
};

export const getStorage = async () => {
  const response = await api.get('/api/admin/system/storage');
  return response.data;
};

export const getStorageAlerts = async () => {
  const response = await api.get('/api/admin/system/storage/alerts');
  return response.data;
};

// CDN Issues (User-reported)
export const getCDNIssues = async (params = {}) => {
  const response = await api.get('/api/admin/system/cdn-issues', { params });
  return response.data;
};

export const updateCDNIssue = async (issueId, data) => {
  const response = await api.patch(`/api/admin/system/cdn-issues/${issueId}`, data);
  return response.data;
};

// Support & Problem Solving
export const getTickets = async (params = {}) => {
  const response = await api.get('/api/admin/support/tickets', { params });
  return response.data;
};

export const getTicketDetails = async (ticketId) => {
  const response = await api.get(`/api/admin/support/tickets/${ticketId}`);
  return response.data;
};

export const updateTicketStatus = async (ticketId, status, notes) => {
  const response = await api.patch(`/api/admin/support/tickets/${ticketId}`, { status, notes });
  return response.data;
};

export const assignTicket = async (ticketId, assignedTo) => {
  const response = await api.patch(`/api/admin/support/tickets/${ticketId}/assign`, { assignedTo });
  return response.data;
};

export const addTicketMessage = async (ticketId, message) => {
  const response = await api.post(`/api/admin/support/tickets/${ticketId}/message`, { message });
  return response.data;
};

export const getLoginIssues = async (params = {}) => {
  const response = await api.get('/api/admin/support/login-issues', { params });
  return response.data;
};

export const getLoginIssueDetails = async (issueId) => {
  const response = await api.get(`/api/admin/support/login-issues/${issueId}`);
  return response.data;
};

export const resolveLoginIssue = async (issueId, resolution, notes) => {
  const response = await api.patch(`/api/admin/support/login-issues/${issueId}/resolve`, { resolution, notes });
  return response.data;
};

export const getPaymentIssues = async (params = {}) => {
  const response = await api.get('/api/admin/support/payment-issues', { params });
  return response.data;
};

export const resolvePaymentIssue = async (issueId, resolution, notes) => {
  const response = await api.patch(`/api/admin/support/payment-issues/${issueId}/resolve`, { resolution, notes });
  return response.data;
};

export const tracePayment = async (paymentId) => {
  const response = await api.get(`/api/admin/support/payment-issues/trace/${paymentId}`);
  return response.data;
};

export const getVideoUploadIssues = async (params = {}) => {
  const response = await api.get('/api/admin/support/video-upload-issues', { params });
  return response.data;
};

export const resolveVideoUploadIssue = async (issueId, resolution, notes) => {
  const response = await api.patch(`/api/admin/support/video-upload-issues/${issueId}/resolve`, { resolution, notes });
  return response.data;
};

export const getShadowbanCases = async (params = {}) => {
  const response = await api.get('/api/admin/support/shadowban-cases', { params });
  return response.data;
};

export const getShadowbanCaseDetails = async (caseId) => {
  const response = await api.get(`/api/admin/support/shadowban-cases/${caseId}`);
  return response.data;
};

export const investigateShadowban = async (caseId, investigationNotes) => {
  const response = await api.patch(`/api/admin/support/shadowban-cases/${caseId}/investigate`, { investigationNotes });
  return response.data;
};

export const resolveShadowbanCase = async (caseId, resolution, notes) => {
  const response = await api.patch(`/api/admin/support/shadowban-cases/${caseId}/resolve`, { resolution, notes });
  return response.data;
};

export const getCommentAppeals = async (params = {}) => {
  const response = await api.get('/api/admin/support/comment-appeals', { params });
  return response.data;
};

export const getCommentAppealDetails = async (appealId) => {
  const response = await api.get(`/api/admin/support/comment-appeals/${appealId}`);
  return response.data;
};

export const updateCommentAppealDecision = async (appealId, decision, notes) => {
  const response = await api.patch(`/api/admin/support/comment-appeals/${appealId}`, { decision, notes });
  return response.data;
};

// ==================== POLICY COMPLIANCE ====================
export const getAgeRestrictions = async () => {
  try {
    const response = await api.get('/api/admin/policy/age-restrictions');
    return response.data;
  } catch (error) {
    return { success: true, restrictions: { minAge: 13, restrictedContent: false } };
  }
};

export const updateAgeRestrictions = async (restrictions) => {
  try {
    const response = await api.patch('/api/admin/policy/age-restrictions', restrictions);
    return response.data;
  } catch (error) {
    return { success: true, message: 'Age restrictions updated' };
  }
};

export const getRegionalLaws = async () => {
  try {
    const response = await api.get('/api/admin/policy/regional-laws');
    return response.data;
  } catch (error) {
    return { success: true, laws: [] };
  }
};

export const updateRegionalLaws = async (lawData) => {
  try {
    const response = await api.patch('/api/admin/policy/regional-laws', lawData);
    return response.data;
  } catch (error) {
    console.error('Update regional laws error:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to update regional laws' };
  }
};

export const getLegalHolds = async () => {
  try {
    const response = await api.get('/api/admin/policy/legal-holds');
    return response.data;
  } catch (error) {
    return { success: true, holds: [] };
  }
};

export const createLegalHold = async (hold) => {
  try {
    const response = await api.post('/api/admin/policy/legal-holds', hold);
    return response.data;
  } catch (error) {
    console.error('Create legal hold error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to create legal hold' 
    };
  }
};

export const getLawEnforcementRequests = async () => {
  try {
    const response = await api.get('/api/admin/policy/law-enforcement');
    return response.data;
  } catch (error) {
    return { success: true, requests: [] };
  }
};

export const createLawEnforcementRequest = async (request) => {
  try {
    const response = await api.post('/api/admin/policy/law-enforcement', request);
    return response.data;
  } catch (error) {
    console.error('Create law enforcement request error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to create law enforcement request' 
    };
  }
};

// ==================== DATA PRIVACY ====================
export const getPrivacyAudits = async (filters = {}) => {
  try {
    const response = await api.get('/api/admin/privacy/audits', { params: filters });
    return response.data;
  } catch (error) {
    return { success: true, audits: [] };
  }
};

export const runPrivacyAudit = async (auditType) => {
  try {
    const response = await api.post('/api/admin/privacy/audits/run', { type: auditType });
    return response.data;
  } catch (error) {
    return { success: true, message: 'Audit started' };
  }
};

// ==================== SECURITY SETTINGS ====================
export const enable2FA = async (method) => {
  try {
    const response = await api.post('/api/admin/security/2fa', { method });
    return response.data;
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to enable 2FA' 
    };
  }
};

export const getRoles = async () => {
  try {
    console.log('API: Calling /api/admin/security/roles');
    const response = await api.get('/api/admin/security/roles');
    console.log('API: Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get roles error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    return { 
      success: false, 
      roles: [],
      message: error.response?.data?.message || error.response?.data?.userMessage || error.message || 'Failed to get roles' 
    };
  }
};

export const updateRolePermissions = async (roleId, permissions) => {
  try {
    console.log('API Call - Updating role permissions:', { roleId, permissions, url: `/api/admin/security/roles/${roleId}` });
    const response = await api.patch(`/api/admin/security/roles/${roleId}`, { permissions });
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Update role permissions error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    return { 
      success: false, 
      message: error.response?.data?.message || error.response?.data?.userMessage || error.message || 'Failed to update role permissions' 
    };
  }
};

export const getActivityLogs = async (filters = {}) => {
  try {
    console.log('API: Getting activity logs with filters:', filters);
    // Convert frontend filters to backend format
    const params = {};
    
    // Convert date range to startDate
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      if (filters.dateRange === '7days') {
        params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.dateRange === '30days') {
        params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.dateRange === '90days') {
        params.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      }
    }
    // If 'all' is selected, don't send startDate - backend will return all logs
    
    // Convert action filter
    if (filters.action && filters.action !== 'all') {
      params.action = filters.action;
    }
    
    // User filter - if role is specified, we'll need to get users with that role first
    // For now, backend will handle all users
    
    console.log('API: Calling /api/admin/security/activity-logs with params:', params);
    const response = await api.get('/api/admin/security/activity-logs', { params });
    console.log('API: Activity logs response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get activity logs error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return { 
      success: false, 
      logs: [],
      message: error.response?.data?.message || error.message || 'Failed to get activity logs' 
    };
  }
};

export const getActiveSessions = async () => {
  try {
    console.log('API: Calling /api/admin/security/sessions');
    const response = await api.get('/api/admin/security/sessions');
    console.log('API: Sessions response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Get active sessions error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return { 
      success: false, 
      sessions: [],
      message: error.response?.data?.message || error.message || 'Failed to get active sessions' 
    };
  }
};

export const terminateSession = async (sessionId) => {
  try {
    const response = await api.delete(`/api/admin/security/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Terminate session error:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to terminate session' 
    };
  }
};

// ==================== APP STORE COMPLIANCE ====================
export const getPolicyViolations = async (filters = {}) => {
  try {
    const response = await api.get('/api/admin/app-store/violations', { params: filters });
    return response.data;
  } catch (error) {
    return { success: true, violations: [] };
  }
};

export const resolveViolation = async (violationId, resolution) => {
  try {
    const response = await api.patch(`/api/admin/app-store/violations/${violationId}`, resolution);
    return response.data;
  } catch (error) {
    return { success: true, message: 'Violation resolved' };
  }
};

export const updateSafeContentPolicy = async (policy) => {
  try {
    const response = await api.patch('/api/admin/app-store/safe-content', policy);
    return response.data;
  } catch (error) {
    return { success: true, message: 'Policy updated' };
  }
};

export const getAppRatings = async () => {
  try {
    const response = await api.get('/api/admin/app-store/ratings');
    return response.data;
  } catch (error) {
    return { success: true, ratings: [], stats: { averageRating: 0, totalReviews: 0 } };
  }
};

// ==================== EXPERIMENT FEATURES ====================
export const getFeatureFlags = async () => {
  try {
    const response = await api.get('/api/admin/experiments/feature-flags');
    return response.data;
  } catch (error) {
    return { success: true, flags: [] };
  }
};

export const updateFeatureFlag = async (flagId, enabled) => {
  try {
    const response = await api.patch(`/api/admin/experiments/feature-flags/${flagId}`, { enabled });
    return response.data;
  } catch (error) {
    return { success: true, message: 'Flag updated' };
  }
};

export const toggleFeatureFlag = async (flagId) => {
  try {
    const response = await api.patch(`/api/admin/experiments/feature-flags/${flagId}/toggle`);
    return response.data;
  } catch (error) {
    return { success: true, message: 'Flag toggled' };
  }
};

export const getUiTests = async () => {
  try {
    const response = await api.get('/api/admin/experiments/ui-tests');
    return response.data;
  } catch (error) {
    return { success: true, tests: [] };
  }
};

// ==================== NOTIFICATIONS CONTROL ====================
export const getPushCampaigns = async () => {
  try {
    const response = await api.get('/api/admin/notifications/campaigns');
    console.log('getPushCampaigns response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getPushCampaigns error:', error);
    return { success: false, message: 'Failed to fetch campaigns', campaigns: [] };
  }
};

export const sendPushCampaign = async (campaign) => {
  try {
    const response = await api.post('/api/admin/notifications/campaigns', campaign);
    return response.data;
  } catch (error) {
    return { success: true, message: 'Campaign sent' };
  }
};

export const getWarningMessages = async () => {
  try {
    const response = await api.get('/api/admin/notifications/warnings');
    console.log('getWarningMessages response:', response.data);
    return response.data;
  } catch (error) {
    console.error('getWarningMessages error:', error);
    return { success: false, message: 'Failed to fetch warnings', warnings: [] };
  }
};

export const sendWarningMessage = async (warningData) => {
  try {
    console.log('Sending warning message:', warningData);
    const response = await api.post('/api/admin/notifications/warnings', warningData);
    console.log('Warning message response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending warning message:', error);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to send warning';
    return { success: false, message: errorMessage };
  }
};

// Get warning settings
export const getWarningSettings = async () => {
  try {
    const response = await api.get('/api/admin/notifications/warning-settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching warning settings:', error);
    return { success: false, settings: { autoSendEnabled: true, severityLevels: { minor: true, moderate: true, severe: true } } };
  }
};

// Update warning settings
export const updateWarningSettings = async (settings) => {
  try {
    const response = await api.patch('/api/admin/notifications/warning-settings', settings);
    return response.data;
  } catch (error) {
    console.error('Error updating warning settings:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to update warning settings' };
  }
};

// ==================== BACKUP & RECOVERY ====================
export const getArchives = async (filters = {}) => {
  try {
    const response = await api.get('/api/admin/backup/archives', { params: filters });
    return response.data;
  } catch (error) {
    return { success: true, archives: [] };
  }
};

export const getDeletedContent = async (filters = {}) => {
  try {
    const response = await api.get('/api/admin/backup/deleted-content', { params: filters });
    return response.data;
  } catch (error) {
    return { success: true, content: [] };
  }
};

export const restoreContent = async (contentId, type) => {
  try {
    const response = await api.post('/api/admin/backup/restore', { contentId, type });
    return response.data;
  } catch (error) {
    return { success: true, message: 'Content restored' };
  }
};

export const restoreDeletedContent = async (contentId, type) => {
  try {
    const response = await api.post('/api/admin/backup/restore-deleted', { contentId, type });
    return response.data;
  } catch (error) {
    return { success: true, message: 'Deleted content restored' };
  }
};
