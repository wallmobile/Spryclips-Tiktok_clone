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

// Technical System Control
export const getVideoProcessing = async (params = {}) => {
  const response = await api.get('/api/admin/system/video-processing', { params });
  return response.data;
};

export const getVideoProcessingStats = async () => {
  const response = await api.get('/api/admin/system/video-processing/stats');
  return response.data;
};

export const getCDNHealth = async () => {
  const response = await api.get('/api/admin/system/cdn-health');
  return response.data;
};

export const getCDNQualityDrop = async () => {
  const response = await api.get('/api/admin/system/cdn-quality-drop');
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
  const response = await api.post(`/api/admin/support/tickets/${ticketId}/messages`, { message });
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
