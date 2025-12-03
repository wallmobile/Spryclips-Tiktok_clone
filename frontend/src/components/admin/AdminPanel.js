import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAllVideos,
  deleteVideo,
  getAllStories,
  deleteStory,
  getAllComments,
  deleteComment,
  updateUserProfile,
  verifyUserIdentity,
  getUserLoginHistory,
  getUserFollowers,
  getUserFollowing,
  getUserBlocked,
  getModerationVideos,
  moderateVideo,
  handleCopyrightDispute,
  getModerationComments,
  moderateComment,
  getAIFlags,
  reviewAIFlag,
  getLiveStreamsModeration,
  moderateLiveStream,
  getReports,
  getHighRiskReports,
  getReportDetails,
  resolveReport,
  dismissReport,
  getSpamAlerts,
  getChildSafetyViolations,
  getBotDetectionQueue,
  getTakeoverAlerts,
  markTakeoverAlertReviewed,
  getMonetizationDashboard,
  getCreators,
  updateCreatorStatus,
  getAdRevenue,
  getGiftsCoins,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getTaxDocuments,
  verifyTaxDocument,
  getBrandDeals,
  updateBrandDealStatus,
  getCreatorEarnings,
  getAnalyticsDashboard,
  getActiveUsers,
  getRetention,
  getVideoCompletion,
  getTrendingHashtags,
  getCategoryPerformance,
  getRegionGrowth,
  getDeviceNetworkStats,
  getBlacklist,
  addBlacklistItem,
  updateBlacklistItem,
  deleteBlacklistItem,
  getBoostedContent,
  boostContent,
  updateBoostedContent,
  downrankContent,
  getHashtagControls,
  updateHashtagControl,
  getABTests,
  createABTest,
  updateABTest,
  getVideoProcessing,
  getVideoProcessingStats,
  getCDNHealth,
  getCDNQualityDrop,
  getServerHealth,
  getServerMetrics,
  getErrorLogs,
  resolveErrorLog,
  getCrashStats,
  getAPIRequests,
  getAPIRequestStats,
  getStorage,
  getStorageAlerts,
  getTickets,
  getTicketDetails,
  assignTicket,
  updateTicketStatus,
  addTicketMessage,
  getLoginIssues,
  getLoginIssueDetails,
  resolveLoginIssue,
  getPaymentIssues,
  tracePayment,
  resolvePaymentIssue,
  getVideoUploadIssues,
  resolveVideoUploadIssue,
  getShadowbanCases,
  getShadowbanCaseDetails,
  investigateShadowban,
  resolveShadowbanCase,
  getCommentAppeals,
  getCommentAppealDetails,
  updateCommentAppealDecision
} from '../../api/admin';
import './AdminPanel.css';

const AdminPanel = ({ onClose, mode = 'modal' }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isModal = mode === 'modal';
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard Stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Users
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [usersSearch, setUsersSearch] = useState('');
  const [usersStatusFilter, setUsersStatusFilter] = useState('all');
  const [usersRoleFilter, setUsersRoleFilter] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsTab, setUserDetailsTab] = useState('overview');
  const [loginHistory, setLoginHistory] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileEditData, setProfileEditData] = useState({});

  // Videos
  const [videos, setVideos] = useState([]);
  const [videosPagination, setVideosPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [videosSearch, setVideosSearch] = useState('');
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Stories
  const [stories, setStories] = useState([]);
  const [storiesPagination, setStoriesPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loadingStories, setLoadingStories] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [commentsSearch, setCommentsSearch] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Moderation
  const [moderationTab, setModerationTab] = useState('videos');
  const [moderationVideos, setModerationVideos] = useState([]);
  const [moderationVideosPagination, setModerationVideosPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [moderationVideosStatus, setModerationVideosStatus] = useState('pending');
  const [loadingModerationVideos, setLoadingModerationVideos] = useState(false);
  const [moderationComments, setModerationComments] = useState([]);
  const [moderationCommentsPagination, setModerationCommentsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loadingModerationComments, setLoadingModerationComments] = useState(false);
  const [aiFlags, setAiFlags] = useState([]);
  const [aiFlagsPagination, setAiFlagsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [aiFlagType, setAiFlagType] = useState('all');
  const [loadingAiFlags, setLoadingAiFlags] = useState(false);
  const [liveStreams, setLiveStreams] = useState([]);
  const [loadingLiveStreams, setLoadingLiveStreams] = useState(false);
  const [selectedVideoForModeration, setSelectedVideoForModeration] = useState(null);
  const [moderationNotes, setModerationNotes] = useState('');

  // Reports & Safety
  const [safetyTab, setSafetyTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [reportsPagination, setReportsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [reportsStatus, setReportsStatus] = useState('pending');
  const [reportsPriority, setReportsPriority] = useState('all');
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [highRiskReports, setHighRiskReports] = useState([]);
  const [loadingHighRisk, setLoadingHighRisk] = useState(false);
  const [spamAlerts, setSpamAlerts] = useState([]);
  const [spamPagination, setSpamPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loadingSpam, setLoadingSpam] = useState(false);
  const [childSafety, setChildSafety] = useState(null);
  const [loadingChildSafety, setLoadingChildSafety] = useState(false);
  const [botDetection, setBotDetection] = useState([]);
  const [botPagination, setBotPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loadingBot, setLoadingBot] = useState(false);
  const [takeoverAlerts, setTakeoverAlerts] = useState([]);
  const [takeoverPagination, setTakeoverPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loadingTakeover, setLoadingTakeover] = useState(false);

  // Monetization & Payments
  const [monetizationTab, setMonetizationTab] = useState('dashboard');
  const [monetizationStats, setMonetizationStats] = useState(null);
  const [loadingMonetizationStats, setLoadingMonetizationStats] = useState(false);
  const [creators, setCreators] = useState([]);
  const [creatorsPagination, setCreatorsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [creatorsStatus, setCreatorsStatus] = useState('approved');
  const [creatorsSearch, setCreatorsSearch] = useState('');
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [adRevenue, setAdRevenue] = useState([]);
  const [adRevenuePagination, setAdRevenuePagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loadingAdRevenue, setLoadingAdRevenue] = useState(false);
  const [giftsCoins, setGiftsCoins] = useState([]);
  const [giftsCoinsPagination, setGiftsCoinsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [giftsCoinsType, setGiftsCoinsType] = useState('all');
  const [loadingGiftsCoins, setLoadingGiftsCoins] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsPagination, setWithdrawalsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [withdrawalsStatus, setWithdrawalsStatus] = useState('pending');
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [taxDocuments, setTaxDocuments] = useState([]);
  const [taxDocumentsPagination, setTaxDocumentsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [taxDocumentsVerified, setTaxDocumentsVerified] = useState('all');
  const [loadingTaxDocuments, setLoadingTaxDocuments] = useState(false);
  const [brandDeals, setBrandDeals] = useState([]);
  const [brandDealsPagination, setBrandDealsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [brandDealsStatus, setBrandDealsStatus] = useState('all');
  const [loadingBrandDeals, setLoadingBrandDeals] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);

  // Analytics & Insights
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  const [analyticsDashboard, setAnalyticsDashboard] = useState(null);
  const [loadingAnalyticsDashboard, setLoadingAnalyticsDashboard] = useState(false);
  const [activeUsersData, setActiveUsersData] = useState(null);
  const [activeUsersPeriod, setActiveUsersPeriod] = useState('day');
  const [loadingActiveUsers, setLoadingActiveUsers] = useState(false);
  const [retentionData, setRetentionData] = useState(null);
  const [loadingRetention, setLoadingRetention] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [loadingCompletion, setLoadingCompletion] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [trendingPeriod, setTrendingPeriod] = useState('7');
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [regionGrowth, setRegionGrowth] = useState(null);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [deviceNetworkStats, setDeviceNetworkStats] = useState(null);
  const [loadingDeviceNetwork, setLoadingDeviceNetwork] = useState(false);

  // Search & Recommendation Control
  const [searchTab, setSearchTab] = useState('blacklist');
  const [blacklistItems, setBlacklistItems] = useState([]);
  const [blacklistPagination, setBlacklistPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [blacklistType, setBlacklistType] = useState('all');
  const [blacklistActive, setBlacklistActive] = useState('true');
  const [loadingBlacklist, setLoadingBlacklist] = useState(false);
  const [boostedContent, setBoostedContent] = useState([]);
  const [boostedPagination, setBoostedPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [boostedType, setBoostedType] = useState('all');
  const [boostedActive, setBoostedActive] = useState('true');
  const [loadingBoosted, setLoadingBoosted] = useState(false);
  const [hashtagControls, setHashtagControls] = useState([]);
  const [hashtagPagination, setHashtagPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [hashtagVisibility, setHashtagVisibility] = useState('all');
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [abTests, setAbTests] = useState([]);
  const [abTestsPagination, setAbTestsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [abTestStatus, setAbTestStatus] = useState('all');
  const [loadingABTests, setLoadingABTests] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showHashtagModal, setShowHashtagModal] = useState(false);
  const [showABTestModal, setShowABTestModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  // Technical System Control
  const [systemTab, setSystemTab] = useState('video-processing');
  const [videoProcessing, setVideoProcessing] = useState([]);
  const [videoProcessingStats, setVideoProcessingStats] = useState(null);
  const [videoProcessingPagination, setVideoProcessingPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [videoProcessingStatus, setVideoProcessingStatus] = useState('all');
  const [loadingVideoProcessing, setLoadingVideoProcessing] = useState(false);
  
  const [cdnHealth, setCdnHealth] = useState([]);
  const [cdnQualityDrop, setCdnQualityDrop] = useState([]);
  const [loadingCDN, setLoadingCDN] = useState(false);
  
  const [serverHealth, setServerHealth] = useState([]);
  const [serverMetrics, setServerMetrics] = useState(null);
  const [serverMetricsPeriod, setServerMetricsPeriod] = useState('1h');
  const [loadingServer, setLoadingServer] = useState(false);
  
  const [errorLogs, setErrorLogs] = useState([]);
  const [crashStats, setCrashStats] = useState(null);
  const [errorLogsPagination, setErrorLogsPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [errorLogLevel, setErrorLogLevel] = useState('all');
  const [errorLogType, setErrorLogType] = useState('all');
  const [errorLogSeverity, setErrorLogSeverity] = useState('all');
  const [errorLogResolved, setErrorLogResolved] = useState('false');
  const [loadingErrorLogs, setLoadingErrorLogs] = useState(false);
  const [selectedErrorLog, setSelectedErrorLog] = useState(null);
  
  const [apiRequests, setApiRequests] = useState([]);
  const [apiRequestStats, setApiRequestStats] = useState(null);
  const [apiRequestPagination, setApiRequestPagination] = useState({ page: 1, limit: 100, total: 0 });
  const [apiRequestEndpoint, setApiRequestEndpoint] = useState('');
  const [apiRequestMethod, setApiRequestMethod] = useState('all');
  const [apiRequestStatus, setApiRequestStatus] = useState('all');
  const [apiRequestPeriod, setApiRequestPeriod] = useState('1h');
  const [loadingAPIRequests, setLoadingAPIRequests] = useState(false);
  
  const [storage, setStorage] = useState([]);
  const [storageAlerts, setStorageAlerts] = useState([]);
  const [loadingStorage, setLoadingStorage] = useState(false);

  // Support and Problem Solving
  const [supportTab, setSupportTab] = useState('tickets');
  
  // Tickets
  const [tickets, setTickets] = useState([]);
  const [ticketsPagination, setTicketsPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [ticketStatus, setTicketStatus] = useState('all');
  const [ticketPriority, setTicketPriority] = useState('all');
  const [ticketCategory, setTicketCategory] = useState('all');
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketStats, setTicketStats] = useState({});
  
  // Login Issues
  const [loginIssues, setLoginIssues] = useState([]);
  const [loginIssuesPagination, setLoginIssuesPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [loginIssueStatus, setLoginIssueStatus] = useState('all');
  const [loginIssueType, setLoginIssueType] = useState('all');
  const [loadingLoginIssues, setLoadingLoginIssues] = useState(false);
  const [selectedLoginIssue, setSelectedLoginIssue] = useState(null);
  
  // Payment Issues
  const [paymentIssues, setPaymentIssues] = useState([]);
  const [paymentIssuesPagination, setPaymentIssuesPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [paymentIssueStatus, setPaymentIssueStatus] = useState('all');
  const [paymentIssueType, setPaymentIssueType] = useState('all');
  const [paymentSearchId, setPaymentSearchId] = useState('');
  const [loadingPaymentIssues, setLoadingPaymentIssues] = useState(false);
  const [selectedPaymentIssue, setSelectedPaymentIssue] = useState(null);
  
  // Video Upload Issues
  const [videoUploadIssues, setVideoUploadIssues] = useState([]);
  const [videoUploadIssuesPagination, setVideoUploadIssuesPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [videoUploadIssueStatus, setVideoUploadIssueStatus] = useState('all');
  const [videoUploadIssueType, setVideoUploadIssueType] = useState('all');
  const [loadingVideoUploadIssues, setLoadingVideoUploadIssues] = useState(false);
  const [selectedVideoUploadIssue, setSelectedVideoUploadIssue] = useState(null);
  
  // Shadowban Cases
  const [shadowbanCases, setShadowbanCases] = useState([]);
  const [shadowbanPagination, setShadowbanPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [shadowbanStatus, setShadowbanStatus] = useState('all');
  const [shadowbanCaseType, setShadowbanCaseType] = useState('all');
  const [loadingShadowban, setLoadingShadowban] = useState(false);
  const [selectedShadowbanCase, setSelectedShadowbanCase] = useState(null);
  
  // Comment Appeals
  const [commentAppeals, setCommentAppeals] = useState([]);
  const [commentAppealsPagination, setCommentAppealsPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [commentAppealStatus, setCommentAppealStatus] = useState('all');
  const [commentAppealType, setCommentAppealType] = useState('all');
  const [loadingCommentAppeals, setLoadingCommentAppeals] = useState(false);
  const [selectedCommentAppeal, setSelectedCommentAppeal] = useState(null);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Check if user is admin - redirect if not admin
  useEffect(() => {
    // Helper to get cached user
    const getCachedUser = () => {
      try {
        const cachedUser = localStorage.getItem('user');
        if (cachedUser && cachedUser !== 'null' && cachedUser !== 'undefined') {
          return JSON.parse(cachedUser);
        }
      } catch (e) {
        // Ignore parse errors
      }
      return <></>;
    };

    // Check localStorage for cached user FIRST (priority over context user)
    const cachedUser = getCachedUser();
    let currentUser = user || cachedUser;
    
    // If we have a cached admin user, DON'T redirect (allow access immediately)
    if (cachedUser && cachedUser.role === 'admin') {
      // Admin user is cached - allow access, don't redirect
      return;
    }
    
    // If we have a user (from context or cache), check role
    if (currentUser) {
      if (currentUser.role !== 'admin') {
        // User exists but is not admin - redirect
        navigate('/admin/login', { replace: true });
        return;
      }
      // User is admin, allow access
      return;
    }
    
    // No user at all - wait for auth to load (but with timeout)
    if (authLoading) {
      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        // Double check after timeout - maybe cached user was added
        const finalCheck = getCachedUser();
        if (!finalCheck || finalCheck.role !== 'admin') {
          navigate('/admin/login', { replace: true });
        }
      }, 2000); // 2 second timeout
      return () => clearTimeout(timeout);
    }
    
    // Auth loading complete but no user - redirect to login
    if (!currentUser) {
      navigate('/admin/login', { replace: true });
      return;
    }
  }, [user, navigate, authLoading]);

  // Fetch dashboard stats
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  // Fetch users
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, usersPagination.page, usersSearch, usersStatusFilter, usersRoleFilter]);

  // Fetch analytics dashboard
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'overview') {
      fetchAnalyticsDashboard();
    }
  }, [activeTab, analyticsTab]);

  // Fetch active users
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'active-users') {
      fetchActiveUsers();
    }
  }, [activeTab, analyticsTab, activeUsersPeriod]);

  // Fetch retention
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'retention') {
      fetchRetention();
    }
  }, [activeTab, analyticsTab]);

  // Fetch completion
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'completion') {
      fetchVideoCompletion();
    }
  }, [activeTab, analyticsTab]);

  // Fetch trending hashtags
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'hashtags') {
      fetchTrendingHashtags();
    }
  }, [activeTab, analyticsTab, trendingPeriod]);

  // Fetch category performance
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'categories') {
      fetchCategoryPerformance();
    }
  }, [activeTab, analyticsTab]);

  // Fetch region growth
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'regions') {
      fetchRegionGrowth();
    }
  }, [activeTab, analyticsTab]);

  // Fetch device network stats
  useEffect(() => {
    if (activeTab === 'analytics' && analyticsTab === 'devices') {
      fetchDeviceNetworkStats();
    }
  }, [activeTab, analyticsTab]);

  // Fetch blacklist
  useEffect(() => {
    if (activeTab === 'search' && searchTab === 'blacklist') {
      fetchBlacklist();
    }
  }, [activeTab, searchTab, blacklistType, blacklistActive, blacklistPagination.page]);

  // Fetch boosted content
  useEffect(() => {
    if (activeTab === 'search' && searchTab === 'boosted') {
      fetchBoostedContent();
    }
  }, [activeTab, searchTab, boostedType, boostedActive, boostedPagination.page]);

  // Fetch videos
  useEffect(() => {
    if (activeTab === 'videos') {
      fetchVideos();
    }
  }, [activeTab, videosPagination.page, videosSearch]);

  // Fetch stories
  useEffect(() => {
    if (activeTab === 'stories') {
      fetchStories();
    }
  }, [activeTab, storiesPagination.page]);

  // Fetch comments
  useEffect(() => {
    if (activeTab === 'comments') {
      fetchComments();
    }
  }, [activeTab, commentsPagination.page, commentsSearch]);

  // Fetch moderation videos
  useEffect(() => {
    if (activeTab === 'moderation' && moderationTab === 'videos') {
      fetchModerationVideos();
    }
  }, [activeTab, moderationTab, moderationVideosPagination.page, moderationVideosStatus]);

  // Fetch moderation comments
  useEffect(() => {
    if (activeTab === 'moderation' && moderationTab === 'comments') {
      fetchModerationComments();
    }
  }, [activeTab, moderationTab, moderationCommentsPagination.page]);

  // Fetch AI flags
  useEffect(() => {
    if (activeTab === 'moderation' && moderationTab === 'ai-flags') {
      fetchAIFlags();
    }
  }, [activeTab, moderationTab, aiFlagsPagination.page, aiFlagType]);

  // Fetch live streams
  useEffect(() => {
    if (activeTab === 'moderation' && moderationTab === 'live-streams') {
      fetchLiveStreams();
    }
  }, [activeTab, moderationTab]);

  // Fetch reports & safety data
  useEffect(() => {
    if (activeTab === 'safety') {
      if (safetyTab === 'reports') {
        fetchReports();
        fetchHighRiskReports();
      } else if (safetyTab === 'spam') {
        fetchSpamAlerts();
      } else if (safetyTab === 'child-safety') {
        fetchChildSafety();
      } else if (safetyTab === 'bot-detection') {
        fetchBotDetection();
      } else if (safetyTab === 'takeover') {
        fetchTakeoverAlerts();
      }
    }
  }, [activeTab, safetyTab, reportsPagination.page, reportsStatus, reportsPriority, spamPagination.page, botPagination.page, takeoverPagination.page]);

  // Fetch Monetization data
  useEffect(() => {
    if (activeTab === 'monetization') {
      if (monetizationTab === 'dashboard') {
        fetchMonetizationDashboard();
      } else if (monetizationTab === 'creators') {
        fetchCreators();
      }
    }
  }, [activeTab, monetizationTab, creatorsPagination.page, creatorsStatus, creatorsSearch]);

  // Fetch Technical System Control data
  useEffect(() => {
    if (activeTab === 'system') {
      if (systemTab === 'video-processing') {
        fetchVideoProcessing();
        fetchVideoProcessingStats();
      } else if (systemTab === 'cdn-health') {
        fetchCDNHealth();
        fetchCDNQualityDrop();
      } else if (systemTab === 'server-health') {
        fetchServerHealth();
        fetchServerMetrics();
      } else if (systemTab === 'error-logs') {
        fetchErrorLogs();
        fetchCrashStats();
      } else if (systemTab === 'api-requests') {
        fetchAPIRequests();
        fetchAPIRequestStats();
      } else if (systemTab === 'storage') {
        fetchStorage();
        fetchStorageAlerts();
      }
    }
  }, [activeTab, systemTab, videoProcessingPagination.page, videoProcessingStatus, errorLogsPagination.page, errorLogLevel, errorLogType, errorLogSeverity, errorLogResolved, apiRequestPagination.page, apiRequestEndpoint, apiRequestMethod, apiRequestStatus, serverMetricsPeriod, apiRequestPeriod]);

  // Fetch Support and Problem Solving data
  useEffect(() => {
    if (activeTab === 'support') {
      if (supportTab === 'tickets') {
        fetchTickets();
      } else if (supportTab === 'login-issues') {
        fetchLoginIssues();
      } else if (supportTab === 'payment-issues') {
        fetchPaymentIssues();
      } else if (supportTab === 'video-upload') {
        fetchVideoUploadIssues();
      } else if (supportTab === 'shadowban') {
        fetchShadowbanCases();
      } else if (supportTab === 'comment-appeals') {
        fetchCommentAppeals();
      }
    }
  }, [activeTab, supportTab, ticketsPagination.page, ticketStatus, ticketPriority, ticketCategory, loginIssuesPagination.page, loginIssueStatus, loginIssueType, paymentIssuesPagination.page, paymentIssueStatus, paymentIssueType, paymentSearchId, videoUploadIssuesPagination.page, videoUploadIssueStatus, videoUploadIssueType, shadowbanPagination.page, shadowbanStatus, shadowbanCaseType, commentAppealsPagination.page, commentAppealStatus, commentAppealType]);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const response = await getDashboardStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setToast({ type: 'error', message: 'Failed to load dashboard stats' });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await getAllUsers({
        page: usersPagination.page,
        limit: usersPagination.limit,
        search: usersSearch,
        status: usersStatusFilter,
        role: usersRoleFilter
      });
      if (response.success) {
        setUsers(response.users);
        setUsersPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setToast({ type: 'error', message: 'Failed to load users' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoadingVideos(true);
      const response = await getAllVideos({
        page: videosPagination.page,
        limit: videosPagination.limit,
        search: videosSearch
      });
      if (response.success) {
        setVideos(response.videos);
        setVideosPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setToast({ type: 'error', message: 'Failed to load videos' });
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchStories = async () => {
    try {
      setLoadingStories(true);
      const response = await getAllStories({
        page: storiesPagination.page,
        limit: storiesPagination.limit
      });
      if (response.success) {
        setStories(response.stories);
        setStoriesPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setToast({ type: 'error', message: 'Failed to load stories' });
    } finally {
      setLoadingStories(false);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await getAllComments({
        page: commentsPagination.page,
        limit: commentsPagination.limit,
        search: commentsSearch
      });
      if (response.success) {
        setComments(response.comments);
        setCommentsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setToast({ type: 'error', message: 'Failed to load comments' });
    } finally {
      setLoadingComments(false);
    }
  };

  const handleUserStatusChange = async (userId, status) => {
    try {
      const response = await updateUserStatus(userId, status);
      if (response.success) {
        setToast({ type: 'success', message: `User ${status} successfully` });
        fetchUsers();
        if (selectedUser?._id === userId) {
          setSelectedUser(response.user);
        }
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      setToast({ type: 'error', message: 'Failed to update user status' });
    }
  };

  const handleUserRoleChange = async (userId, role) => {
    try {
      const response = await updateUserRole(userId, role);
      if (response.success) {
        setToast({ type: 'success', message: `User role updated to ${role}` });
        fetchUsers();
        if (selectedUser?._id === userId) {
          setSelectedUser(response.user);
        }
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setToast({ type: 'error', message: 'Failed to update user role' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await deleteUser(userId);
      if (response.success) {
        setToast({ type: 'success', message: 'User deleted successfully' });
        fetchUsers();
        if (selectedUser?._id === userId) {
          setSelectedUser(null);
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setToast({ type: 'error', message: 'Failed to delete user' });
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }
    try {
      const response = await deleteVideo(videoId);
      if (response.success) {
        setToast({ type: 'success', message: 'Video deleted successfully' });
        fetchVideos();
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      setToast({ type: 'error', message: 'Failed to delete video' });
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this story?')) {
      return;
    }
    try {
      const response = await deleteStory(storyId);
      if (response.success) {
        setToast({ type: 'success', message: 'Story deleted successfully' });
        fetchStories();
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      setToast({ type: 'error', message: 'Failed to delete story' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    try {
      const response = await deleteComment(commentId);
      if (response.success) {
        setToast({ type: 'success', message: 'Comment deleted successfully' });
        fetchComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setToast({ type: 'error', message: 'Failed to delete comment' });
    }
  };

  // Moderation functions
  const fetchModerationVideos = async () => {
    try {
      setLoadingModerationVideos(true);
      const response = await getModerationVideos({
        status: moderationVideosStatus,
        page: moderationVideosPagination.page,
        limit: moderationVideosPagination.limit
      });
      if (response.success) {
        setModerationVideos(response.videos);
        setModerationVideosPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching moderation videos:', error);
      setToast({ type: 'error', message: 'Failed to load videos for moderation' });
    } finally {
      setLoadingModerationVideos(false);
    }
  };

  const fetchModerationComments = async () => {
    try {
      setLoadingModerationComments(true);
      const response = await getModerationComments({
        status: 'flagged',
        page: moderationCommentsPagination.page,
        limit: moderationCommentsPagination.limit
      });
      if (response.success) {
        setModerationComments(response.comments);
        setModerationCommentsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching moderation comments:', error);
      setToast({ type: 'error', message: 'Failed to load comments for moderation' });
    } finally {
      setLoadingModerationComments(false);
    }
  };

  const fetchAIFlags = async () => {
    try {
      setLoadingAiFlags(true);
      const response = await getAIFlags({
        type: aiFlagType !== 'all' ? aiFlagType : undefined,
        page: aiFlagsPagination.page,
        limit: aiFlagsPagination.limit
      });
      if (response.success) {
        setAiFlags(response.videos);
        setAiFlagsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching AI flags:', error);
      setToast({ type: 'error', message: 'Failed to load AI flagged content' });
    } finally {
      setLoadingAiFlags(false);
    }
  };

  const fetchLiveStreams = async () => {
    try {
      setLoadingLiveStreams(true);
      const response = await getLiveStreamsModeration();
      if (response.success) {
        setLiveStreams(response.streams);
      }
    } catch (error) {
      console.error('Error fetching live streams:', error);
      setToast({ type: 'error', message: 'Failed to load live streams' });
    } finally {
      setLoadingLiveStreams(false);
    }
  };

  const handleModerateVideo = async (videoId, action, sensitiveType = null) => {
    try {
      const response = await moderateVideo(videoId, action, moderationNotes, sensitiveType);
      if (response.success) {
        setToast({ type: 'success', message: `Video ${action}ed successfully` });
        setSelectedVideoForModeration(null);
        setModerationNotes('');
        fetchModerationVideos();
      }
    } catch (error) {
      console.error('Error moderating video:', error);
      setToast({ type: 'error', message: 'Failed to moderate video' });
    }
  };

  const handleModerateComment = async (commentId, action) => {
    try {
      const response = await moderateComment(commentId, action, moderationNotes);
      if (response.success) {
        setToast({ type: 'success', message: `Comment ${action}ed successfully` });
        setModerationNotes('');
        fetchModerationComments();
      }
    } catch (error) {
      console.error('Error moderating comment:', error);
      setToast({ type: 'error', message: 'Failed to moderate comment' });
    }
  };

  const handleReviewAIFlag = async (videoId, flagType, action) => {
    try {
      const response = await reviewAIFlag(videoId, flagType, action);
      if (response.success) {
        setToast({ type: 'success', message: `AI flag ${action}ed successfully` });
        fetchAIFlags();
      }
    } catch (error) {
      console.error('Error reviewing AI flag:', error);
      setToast({ type: 'error', message: 'Failed to review AI flag' });
    }
  };

  const handleModerateLiveStream = async (streamId, action) => {
    try {
      const response = await moderateLiveStream(streamId, action);
      if (response.success) {
        setToast({ type: 'success', message: `Live stream ${action}ed successfully` });
        fetchLiveStreams();
      }
    } catch (error) {
      console.error('Error moderating live stream:', error);
      setToast({ type: 'error', message: 'Failed to moderate live stream' });
    }
  };

  const handleCopyrightDisputeAction = async (videoId, type, resolve = false, resolution = '') => {
    try {
      const response = await handleCopyrightDispute(videoId, type, resolution, resolve);
      if (response.success) {
        setToast({ type: 'success', message: resolve ? 'Copyright dispute resolved' : 'Copyright dispute created' });
        fetchModerationVideos();
      }
    } catch (error) {
      console.error('Error handling copyright dispute:', error);
      setToast({ type: 'error', message: 'Failed to handle copyright dispute' });
    }
  };

  // Reports & Safety functions
  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const params = {
        status: reportsStatus,
        page: reportsPagination.page,
        limit: reportsPagination.limit
      };
      if (reportsPriority !== 'all') params.priority = reportsPriority;
      
      const response = await getReports(params);
      if (response.success) {
        setReports(response.reports);
        setReportsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setToast({ type: 'error', message: 'Failed to load reports' });
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchHighRiskReports = async () => {
    try {
      setLoadingHighRisk(true);
      const response = await getHighRiskReports();
      if (response.success) {
        setHighRiskReports(response.reports);
      }
    } catch (error) {
      console.error('Error fetching high risk reports:', error);
    } finally {
      setLoadingHighRisk(false);
    }
  };

  const fetchSpamAlerts = async () => {
    try {
      setLoadingSpam(true);
      const response = await getSpamAlerts({
        page: spamPagination.page,
        limit: spamPagination.limit
      });
      if (response.success) {
        setSpamAlerts(response.alerts);
        setSpamPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching spam alerts:', error);
      setToast({ type: 'error', message: 'Failed to load spam alerts' });
    } finally {
      setLoadingSpam(false);
    }
  };

  const fetchChildSafety = async () => {
    try {
      setLoadingChildSafety(true);
      const response = await getChildSafetyViolations();
      if (response.success) {
        setChildSafety(response);
      }
    } catch (error) {
      console.error('Error fetching child safety violations:', error);
      setToast({ type: 'error', message: 'Failed to load child safety data' });
    } finally {
      setLoadingChildSafety(false);
    }
  };

  const fetchBotDetection = async () => {
    try {
      setLoadingBot(true);
      const response = await getBotDetectionQueue({
        page: botPagination.page,
        limit: botPagination.limit
      });
      if (response.success) {
        setBotDetection(response.users);
        setBotPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching bot detection:', error);
      setToast({ type: 'error', message: 'Failed to load bot detection queue' });
    } finally {
      setLoadingBot(false);
    }
  };

  const fetchTakeoverAlerts = async () => {
    try {
      setLoadingTakeover(true);
      const response = await getTakeoverAlerts({
        page: takeoverPagination.page,
        limit: takeoverPagination.limit
      });
      if (response.success) {
        setTakeoverAlerts(response.alerts);
        setTakeoverPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching takeover alerts:', error);
      setToast({ type: 'error', message: 'Failed to load account takeover alerts' });
    } finally {
      setLoadingTakeover(false);
    }
  };

  const handleResolveReport = async (reportId, action, notes) => {
    try {
      const response = await resolveReport(reportId, action, notes);
      if (response.success) {
        setToast({ type: 'success', message: 'Report resolved successfully' });
        setSelectedReport(null);
        fetchReports();
        fetchHighRiskReports();
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      setToast({ type: 'error', message: 'Failed to resolve report' });
    }
  };

  const handleDismissReport = async (reportId, notes) => {
    try {
      const response = await dismissReport(reportId, notes);
      if (response.success) {
        setToast({ type: 'success', message: 'Report dismissed successfully' });
        setSelectedReport(null);
        fetchReports();
        fetchHighRiskReports();
      }
    } catch (error) {
      console.error('Error dismissing report:', error);
      setToast({ type: 'error', message: 'Failed to dismiss report' });
    }
  };

  const viewReportDetails = async (reportId) => {
    try {
      const response = await getReportDetails(reportId);
      if (response.success) {
        setSelectedReport(response.report);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
      setToast({ type: 'error', message: 'Failed to load report details' });
    }
  };

  // Monetization functions
  const fetchMonetizationDashboard = async () => {
    try {
      setLoadingMonetizationStats(true);
      const response = await getMonetizationDashboard();
      if (response.success) {
        setMonetizationStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching monetization dashboard:', error);
      setToast({ type: 'error', message: 'Failed to load monetization dashboard' });
    } finally {
      setLoadingMonetizationStats(false);
    }
  };

  const fetchCreators = async () => {
    try {
      setLoadingCreators(true);
      const response = await getCreators({
        status: creatorsStatus,
        page: creatorsPagination.page,
        limit: creatorsPagination.limit,
        search: creatorsSearch
      });
      if (response.success) {
        setCreators(response.creators);
        setCreatorsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
      setToast({ type: 'error', message: 'Failed to load creators' });
    } finally {
      setLoadingCreators(false);
    }
  };

  const fetchAdRevenue = async () => {
    try {
      setLoadingAdRevenue(true);
      const response = await getAdRevenue({
        page: adRevenuePagination.page,
        limit: adRevenuePagination.limit
      });
      if (response.success) {
        setAdRevenue(response.earnings);
        setAdRevenuePagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching ad revenue:', error);
      setToast({ type: 'error', message: 'Failed to load ad revenue data' });
    } finally {
      setLoadingAdRevenue(false);
    }
  };

  const fetchGiftsCoins = async () => {
    try {
      setLoadingGiftsCoins(true);
      const response = await getGiftsCoins({
        type: giftsCoinsType,
        page: giftsCoinsPagination.page,
        limit: giftsCoinsPagination.limit
      });
      if (response.success) {
        setGiftsCoins(response.purchases);
        setGiftsCoinsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching gifts/coins:', error);
      setToast({ type: 'error', message: 'Failed to load gift/coin purchase logs' });
    } finally {
      setLoadingGiftsCoins(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      const response = await getWithdrawals({
        status: withdrawalsStatus,
        page: withdrawalsPagination.page,
        limit: withdrawalsPagination.limit
      });
      if (response.success) {
        setWithdrawals(response.withdrawals);
        setWithdrawalsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      setToast({ type: 'error', message: 'Failed to load withdrawal requests' });
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const fetchTaxDocuments = async () => {
    try {
      setLoadingTaxDocuments(true);
      const response = await getTaxDocuments({
        verified: taxDocumentsVerified,
        page: taxDocumentsPagination.page,
        limit: taxDocumentsPagination.limit
      });
      if (response.success) {
        setTaxDocuments(response.users);
        setTaxDocumentsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching tax documents:', error);
      setToast({ type: 'error', message: 'Failed to load tax documents' });
    } finally {
      setLoadingTaxDocuments(false);
    }
  };

  const fetchBrandDeals = async () => {
    try {
      setLoadingBrandDeals(true);
      const response = await getBrandDeals({
        status: brandDealsStatus,
        page: brandDealsPagination.page,
        limit: brandDealsPagination.limit
      });
      if (response.success) {
        setBrandDeals(response.brandDeals);
        setBrandDealsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching brand deals:', error);
      setToast({ type: 'error', message: 'Failed to load brand deals' });
    } finally {
      setLoadingBrandDeals(false);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId, notes, transactionId) => {
    try {
      const response = await approveWithdrawal(withdrawalId, notes, transactionId);
      if (response.success) {
        setToast({ type: 'success', message: 'Withdrawal approved successfully' });
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      setToast({ type: 'error', message: 'Failed to approve withdrawal' });
    }
  };

  const handleRejectWithdrawal = async (withdrawalId, reason) => {
    try {
      const response = await rejectWithdrawal(withdrawalId, reason);
      if (response.success) {
        setToast({ type: 'success', message: 'Withdrawal rejected successfully' });
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      setToast({ type: 'error', message: 'Failed to reject withdrawal' });
    }
  };

  const handleUpdateCreatorStatus = async (userId, status, reason) => {
    try {
      const response = await updateCreatorStatus(userId, status, reason);
      if (response.success) {
        setToast({ type: 'success', message: `Creator ${status} successfully` });
        fetchCreators();
      }
    } catch (error) {
      console.error('Error updating creator status:', error);
      setToast({ type: 'error', message: 'Failed to update creator status' });
    }
  };

  const handleVerifyTaxDocument = async (userId, documentIndex, verified) => {
    try {
      const response = await verifyTaxDocument(userId, documentIndex, verified);
      if (response.success) {
        setToast({ type: 'success', message: `Tax document ${verified ? 'verified' : 'unverified'} successfully` });
        fetchTaxDocuments();
      }
    } catch (error) {
      console.error('Error verifying tax document:', error);
      setToast({ type: 'error', message: 'Failed to verify tax document' });
    }
  };

  const handleUpdateBrandDealStatus = async (dealId, status, reason, adminNotes) => {
    try {
      const response = await updateBrandDealStatus(dealId, status, reason, adminNotes);
      if (response.success) {
        setToast({ type: 'success', message: `Brand deal ${status} successfully` });
        fetchBrandDeals();
      }
    } catch (error) {
      console.error('Error updating brand deal status:', error);
      setToast({ type: 'error', message: 'Failed to update brand deal status' });
    }
  };

  // Analytics functions
  const fetchAnalyticsDashboard = async () => {
    try {
      setLoadingAnalyticsDashboard(true);
      setAnalyticsDashboard(null); // Clear previous data
      const response = await getAnalyticsDashboard();
      if (response.success && response.stats) {
        setAnalyticsDashboard(response.stats);
      } else {
        setAnalyticsDashboard(null);
        setToast({ type: 'error', message: response.message || 'Failed to load analytics dashboard' });
      }
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error);
      setAnalyticsDashboard(null); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load analytics dashboard from database' });
    } finally {
      setLoadingAnalyticsDashboard(false);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      setLoadingActiveUsers(true);
      setActiveUsersData(null); // Clear previous data
      const response = await getActiveUsers(activeUsersPeriod);
      if (response.success) {
        setActiveUsersData(response);
      } else {
        setActiveUsersData(null);
        setToast({ type: 'error', message: response.message || 'Failed to load active users data' });
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
      setActiveUsersData(null); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load active users data from database' });
    } finally {
      setLoadingActiveUsers(false);
    }
  };

  const fetchRetention = async () => {
    try {
      setLoadingRetention(true);
      setRetentionData(null); // Clear previous data
      const response = await getRetention(30);
      if (response.success) {
        setRetentionData(response);
      } else {
        setRetentionData(null);
        setToast({ type: 'error', message: response.message || 'Failed to load retention data' });
      }
    } catch (error) {
      console.error('Error fetching retention:', error);
      setRetentionData(null); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load retention data from database' });
    } finally {
      setLoadingRetention(false);
    }
  };

  const fetchVideoCompletion = async () => {
    try {
      setLoadingCompletion(true);
      setCompletionData(null); // Clear previous data
      const response = await getVideoCompletion();
      if (response.success) {
        setCompletionData(response);
      } else {
        setCompletionData(null);
        setToast({ type: 'error', message: response.message || 'Failed to load completion data' });
      }
    } catch (error) {
      console.error('Error fetching completion data:', error);
      setCompletionData(null); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load completion data from database' });
    } finally {
      setLoadingCompletion(false);
    }
  };

  const fetchTrendingHashtags = async () => {
    try {
      setLoadingTrending(true);
      setTrendingHashtags([]); // Clear previous data
      const response = await getTrendingHashtags(trendingPeriod, 50);
      if (response.success && response.trending) {
        setTrendingHashtags(response.trending);
      } else {
        setTrendingHashtags([]);
        setToast({ type: 'error', message: response.message || 'Failed to load trending hashtags' });
      }
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      setTrendingHashtags([]); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load trending hashtags from database' });
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchCategoryPerformance = async () => {
    try {
      setLoadingCategory(true);
      setCategoryPerformance([]); // Clear previous data
      const response = await getCategoryPerformance();
      if (response.success && response.categoryStats) {
        setCategoryPerformance(response.categoryStats);
      } else {
        setCategoryPerformance([]);
        setToast({ type: 'error', message: response.message || 'Failed to load category performance' });
      }
    } catch (error) {
      console.error('Error fetching category performance:', error);
      setCategoryPerformance([]); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load category performance from database' });
    } finally {
      setLoadingCategory(false);
    }
  };

  const fetchRegionGrowth = async () => {
    try {
      setLoadingRegion(true);
      setRegionGrowth(null); // Clear previous data
      const response = await getRegionGrowth(30);
      if (response.success) {
        setRegionGrowth(response);
      } else {
        setRegionGrowth(null);
        setToast({ type: 'error', message: response.message || 'Failed to load region growth data' });
      }
    } catch (error) {
      console.error('Error fetching region growth:', error);
      setRegionGrowth(null); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load region growth data from database' });
    } finally {
      setLoadingRegion(false);
    }
  };

  const fetchDeviceNetworkStats = async () => {
    try {
      setLoadingDeviceNetwork(true);
      setDeviceNetworkStats(null); // Clear previous data
      const response = await getDeviceNetworkStats();
      if (response.success && response.stats) {
        setDeviceNetworkStats(response.stats);
      } else {
        setDeviceNetworkStats(null);
        setToast({ type: 'error', message: response.message || 'Failed to load device/network stats' });
      }
    } catch (error) {
      console.error('Error fetching device/network stats:', error);
      setDeviceNetworkStats(null); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load device/network stats from database' });
    } finally {
      setLoadingDeviceNetwork(false);
    }
  };

  // Search & Recommendation functions
  const fetchBlacklist = async () => {
    try {
      setLoadingBlacklist(true);
      setBlacklistItems([]); // Clear previous data
      const response = await getBlacklist({
        type: blacklistType !== 'all' ? blacklistType : undefined,
        active: blacklistActive,
        page: blacklistPagination.page,
        limit: blacklistPagination.limit
      });
      if (response.success && response.items) {
        setBlacklistItems(response.items || []);
        setBlacklistPagination(response.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
      } else {
        setBlacklistItems([]);
        setToast({ type: 'error', message: response.message || 'Failed to load blacklist' });
      }
    } catch (error) {
      console.error('Error fetching blacklist:', error);
      setBlacklistItems([]); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load blacklist from database' });
    } finally {
      setLoadingBlacklist(false);
    }
  };

  const fetchBoostedContent = async () => {
    try {
      setLoadingBoosted(true);
      setBoostedContent([]); // Clear previous data
      const response = await getBoostedContent({
        contentType: boostedType !== 'all' ? boostedType : undefined,
        active: boostedActive,
        page: boostedPagination.page,
        limit: boostedPagination.limit
      });
      if (response.success && response.items) {
        setBoostedContent(response.items || []);
        setBoostedPagination(response.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
      } else {
        setBoostedContent([]);
        setToast({ type: 'error', message: response.message || 'Failed to load boosted content' });
      }
    } catch (error) {
      console.error('Error fetching boosted content:', error);
      setBoostedContent([]); // Ensure no fake data
      setToast({ type: 'error', message: 'Failed to load boosted content from database' });
    } finally {
      setLoadingBoosted(false);
    }
  };

  const fetchHashtagControls = async () => {
    try {
      setLoadingHashtags(true);
      const response = await getHashtagControls({
        visibility: hashtagVisibility !== 'all' ? hashtagVisibility : undefined,
        page: hashtagPagination.page,
        limit: hashtagPagination.limit
      });
      if (response.success) {
        setHashtagControls(response.hashtags);
        setHashtagPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching hashtag controls:', error);
      setToast({ type: 'error', message: 'Failed to load hashtag controls' });
    } finally {
      setLoadingHashtags(false);
    }
  };

  const fetchABTests = async () => {
    try {
      setLoadingABTests(true);
      const response = await getABTests({
        status: abTestStatus !== 'all' ? abTestStatus : undefined,
        page: abTestsPagination.page,
        limit: abTestsPagination.limit
      });
      if (response.success) {
        setAbTests(response.tests);
        setAbTestsPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching AB tests:', error);
      setToast({ type: 'error', message: 'Failed to load AB tests' });
    } finally {
      setLoadingABTests(false);
    }
  };

  // Technical System Control - Video Processing
  const fetchVideoProcessing = async () => {
    try {
      setLoadingVideoProcessing(true);
      const params = {
        page: videoProcessingPagination.page,
        limit: videoProcessingPagination.limit
      };
      if (videoProcessingStatus !== 'all') params.status = videoProcessingStatus;
      const response = await getVideoProcessing(params);
      if (response.success) {
        setVideoProcessing(response.processing || []);
        setVideoProcessingPagination({ ...videoProcessingPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching video processing:', error);
      setToast({ type: 'error', message: 'Failed to load video processing status' });
    } finally {
      setLoadingVideoProcessing(false);
    }
  };

  const fetchVideoProcessingStats = async () => {
    try {
      const response = await getVideoProcessingStats('24h');
      if (response.success) {
        setVideoProcessingStats(response);
      }
    } catch (error) {
      console.error('Error fetching video processing stats:', error);
    }
  };

  // Technical System Control - CDN Health
  const fetchCDNHealth = async () => {
    try {
      setLoadingCDN(true);
      const response = await getCDNHealth();
      if (response.success) {
        setCdnHealth(response.cdnHealth || []);
      }
    } catch (error) {
      console.error('Error fetching CDN health:', error);
      setToast({ type: 'error', message: 'Failed to load CDN health' });
    } finally {
      setLoadingCDN(false);
    }
  };

  const fetchCDNQualityDrop = async () => {
    try {
      const response = await getCDNQualityDrop();
      if (response.success) {
        setCdnQualityDrop(response.qualityDrops || []);
      }
    } catch (error) {
      console.error('Error fetching CDN quality drop:', error);
    }
  };

  // Technical System Control - Server Health
  const fetchServerHealth = async () => {
    try {
      setLoadingServer(true);
      const response = await getServerHealth();
      if (response.success) {
        setServerHealth(response.servers || []);
      }
    } catch (error) {
      console.error('Error fetching server health:', error);
      setToast({ type: 'error', message: 'Failed to load server health' });
    } finally {
      setLoadingServer(false);
    }
  };

  const fetchServerMetrics = async () => {
    try {
      const response = await getServerMetrics(serverMetricsPeriod);
      if (response.success) {
        setServerMetrics(response);
      }
    } catch (error) {
      console.error('Error fetching server metrics:', error);
    }
  };

  // Technical System Control - Error Logs
  const fetchErrorLogs = async () => {
    try {
      setLoadingErrorLogs(true);
      const params = {
        page: errorLogsPagination.page,
        limit: errorLogsPagination.limit,
        resolved: errorLogResolved
      };
      if (errorLogLevel !== 'all') params.level = errorLogLevel;
      if (errorLogType !== 'all') params.type = errorLogType;
      if (errorLogSeverity !== 'all') params.severity = errorLogSeverity;
      const response = await getErrorLogs(params);
      if (response.success) {
        setErrorLogs(response.errors || []);
        setErrorLogsPagination({ ...errorLogsPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching error logs:', error);
      setToast({ type: 'error', message: 'Failed to load error logs' });
    } finally {
      setLoadingErrorLogs(false);
    }
  };

  const fetchCrashStats = async () => {
    try {
      const response = await getCrashStats('24h');
      if (response.success) {
        setCrashStats(response);
      }
    } catch (error) {
      console.error('Error fetching crash stats:', error);
    }
  };

  const handleResolveErrorLog = async (errorId, resolution) => {
    try {
      const response = await resolveErrorLog(errorId, resolution);
      if (response.success) {
        setToast({ type: 'success', message: 'Error log resolved' });
        fetchErrorLogs();
        setSelectedErrorLog(null);
      }
    } catch (error) {
      console.error('Error resolving error log:', error);
      setToast({ type: 'error', message: 'Failed to resolve error log' });
    }
  };

  // Technical System Control - API Requests
  const fetchAPIRequests = async () => {
    try {
      setLoadingAPIRequests(true);
      const params = {
        page: apiRequestPagination.page,
        limit: apiRequestPagination.limit
      };
      if (apiRequestEndpoint) params.endpoint = apiRequestEndpoint;
      if (apiRequestMethod !== 'all') params.method = apiRequestMethod;
      if (apiRequestStatus !== 'all') params.status = apiRequestStatus;
      const response = await getAPIRequests(params);
      if (response.success) {
        setApiRequests(response.requests || []);
        setApiRequestPagination({ ...apiRequestPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching API requests:', error);
      setToast({ type: 'error', message: 'Failed to load API requests' });
    } finally {
      setLoadingAPIRequests(false);
    }
  };

  const fetchAPIRequestStats = async () => {
    try {
      const response = await getAPIRequestStats(apiRequestPeriod);
      if (response.success) {
        setApiRequestStats(response);
      }
    } catch (error) {
      console.error('Error fetching API request stats:', error);
    }
  };

  // Technical System Control - Storage
  const fetchStorage = async () => {
    try {
      setLoadingStorage(true);
      const response = await getStorage();
      if (response.success) {
        setStorage(response.storage || []);
      }
    } catch (error) {
      console.error('Error fetching storage:', error);
      setToast({ type: 'error', message: 'Failed to load storage data' });
    } finally {
      setLoadingStorage(false);
    }
  };

  const fetchStorageAlerts = async () => {
    try {
      const response = await getStorageAlerts();
      if (response.success) {
        setStorageAlerts(response.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching storage alerts:', error);
    }
  };

  // Support and Problem Solving - Tickets
  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const params = {
        page: ticketsPagination.page,
        limit: ticketsPagination.limit
      };
      if (ticketStatus !== 'all') params.status = ticketStatus;
      if (ticketPriority !== 'all') params.priority = ticketPriority;
      if (ticketCategory !== 'all') params.category = ticketCategory;
      const response = await getTickets(params);
      if (response.success) {
        setTickets(response.tickets || []);
        setTicketsPagination({ ...ticketsPagination, total: response.total || 0 });
        setTicketStats(response.stats || {});
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setToast({ type: 'error', message: 'Failed to load tickets' });
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await getTicketDetails(ticketId);
      if (response.success) {
        setSelectedTicket(response.ticket);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      setToast({ type: 'error', message: 'Failed to load ticket details' });
    }
  };

  // Support and Problem Solving - Login Issues
  const fetchLoginIssues = async () => {
    try {
      setLoadingLoginIssues(true);
      const params = {
        page: loginIssuesPagination.page,
        limit: loginIssuesPagination.limit
      };
      if (loginIssueStatus !== 'all') params.status = loginIssueStatus;
      if (loginIssueType !== 'all') params.issueType = loginIssueType;
      const response = await getLoginIssues(params);
      if (response.success) {
        setLoginIssues(response.issues || []);
        setLoginIssuesPagination({ ...loginIssuesPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching login issues:', error);
      setToast({ type: 'error', message: 'Failed to load login issues' });
    } finally {
      setLoadingLoginIssues(false);
    }
  };

  // Support and Problem Solving - Payment Issues
  const fetchPaymentIssues = async () => {
    try {
      setLoadingPaymentIssues(true);
      const params = {
        page: paymentIssuesPagination.page,
        limit: paymentIssuesPagination.limit
      };
      if (paymentIssueStatus !== 'all') params.status = paymentIssueStatus;
      if (paymentIssueType !== 'all') params.issueType = paymentIssueType;
      if (paymentSearchId) params.paymentId = paymentSearchId;
      const response = await getPaymentIssues(params);
      if (response.success) {
        setPaymentIssues(response.issues || []);
        setPaymentIssuesPagination({ ...paymentIssuesPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching payment issues:', error);
      setToast({ type: 'error', message: 'Failed to load payment issues' });
    } finally {
      setLoadingPaymentIssues(false);
    }
  };

  // Support and Problem Solving - Video Upload Issues
  const fetchVideoUploadIssues = async () => {
    try {
      setLoadingVideoUploadIssues(true);
      const params = {
        page: videoUploadIssuesPagination.page,
        limit: videoUploadIssuesPagination.limit
      };
      if (videoUploadIssueStatus !== 'all') params.status = videoUploadIssueStatus;
      if (videoUploadIssueType !== 'all') params.issueType = videoUploadIssueType;
      const response = await getVideoUploadIssues(params);
      if (response.success) {
        setVideoUploadIssues(response.issues || []);
        setVideoUploadIssuesPagination({ ...videoUploadIssuesPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching video upload issues:', error);
      setToast({ type: 'error', message: 'Failed to load video upload issues' });
    } finally {
      setLoadingVideoUploadIssues(false);
    }
  };

  // Support and Problem Solving - Shadowban Cases
  const fetchShadowbanCases = async () => {
    try {
      setLoadingShadowban(true);
      const params = {
        page: shadowbanPagination.page,
        limit: shadowbanPagination.limit
      };
      if (shadowbanStatus !== 'all') params.status = shadowbanStatus;
      if (shadowbanCaseType !== 'all') params.caseType = shadowbanCaseType;
      const response = await getShadowbanCases(params);
      if (response.success) {
        setShadowbanCases(response.cases || []);
        setShadowbanPagination({ ...shadowbanPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching shadowban cases:', error);
      setToast({ type: 'error', message: 'Failed to load shadowban cases' });
    } finally {
      setLoadingShadowban(false);
    }
  };

  // Support and Problem Solving - Comment Appeals
  const fetchCommentAppeals = async () => {
    try {
      setLoadingCommentAppeals(true);
      const params = {
        page: commentAppealsPagination.page,
        limit: commentAppealsPagination.limit
      };
      if (commentAppealStatus !== 'all') params.status = commentAppealStatus;
      if (commentAppealType !== 'all') params.restrictionType = commentAppealType;
      const response = await getCommentAppeals(params);
      if (response.success) {
        setCommentAppeals(response.appeals || []);
        setCommentAppealsPagination({ ...commentAppealsPagination, total: response.total || 0 });
      }
    } catch (error) {
      console.error('Error fetching comment appeals:', error);
      setToast({ type: 'error', message: 'Failed to load comment appeals' });
    } finally {
      setLoadingCommentAppeals(false);
    }
  };

  const handleAddBlacklist = async (data) => {
    try {
      const response = await addBlacklistItem(data);
      if (response.success) {
        setToast({ type: 'success', message: 'Item added to blacklist' });
        setShowBlacklistModal(false);
        fetchBlacklist();
      }
    } catch (error) {
      console.error('Error adding blacklist item:', error);
      setToast({ type: 'error', message: 'Failed to add blacklist item' });
    }
  };

  const handleBoostContent = async (data) => {
    try {
      const response = await boostContent(data);
      if (response.success) {
        setToast({ type: 'success', message: 'Content boosted successfully' });
        setShowBoostModal(false);
        fetchBoostedContent();
      } else {
        setToast({ type: 'error', message: response.message || 'Failed to boost content' });
      }
    } catch (error) {
      console.error('Error boosting content:', error);
      setToast({ type: 'error', message: error.response?.data?.message || 'Failed to boost content' });
    }
  };

  const handleDownrankContent = async (data) => {
    try {
      const response = await downrankContent(data);
      if (response.success) {
        setToast({ type: 'success', message: 'Content downranked successfully' });
        setShowBoostModal(false);
        fetchBoostedContent();
      }
    } catch (error) {
      console.error('Error downranking content:', error);
      setToast({ type: 'error', message: 'Failed to downrank content' });
    }
  };

  const handleUpdateHashtagControl = async (hashtag, data) => {
    try {
      const response = await updateHashtagControl(hashtag, data);
      if (response.success) {
        setToast({ type: 'success', message: 'Hashtag control updated' });
        setShowHashtagModal(false);
        fetchHashtagControls();
      }
    } catch (error) {
      console.error('Error updating hashtag control:', error);
      setToast({ type: 'error', message: 'Failed to update hashtag control' });
    }
  };

  const handleCreateABTest = async (data) => {
    try {
      const response = await createABTest(data);
      if (response.success) {
        setToast({ type: 'success', message: 'A/B test created successfully' });
        setShowABTestModal(false);
        fetchABTests();
      }
    } catch (error) {
      console.error('Error creating AB test:', error);
      setToast({ type: 'error', message: 'Failed to create A/B test' });
    }
  };

  const viewUserDetails = async (userId) => {
    try {
      setLoadingUserDetails(true);
      setUserDetailsTab('overview');
      const response = await getUserDetails(userId);
      if (response.success) {
        setSelectedUser(response.user);
        setProfileEditData({
          username: response.user.username || '',
          email: response.user.email || '',
          phone: response.user.phone || '',
          displayName: response.user.profile?.displayName || '',
          bio: response.user.profile?.bio || '',
          avatar: response.user.profile?.avatar || '',
          website: response.user.profile?.website || ''
        });
        // Load related data
        loadUserRelatedData(userId);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      setToast({ type: 'error', message: 'Failed to load user details' });
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const loadUserRelatedData = async (userId) => {
    try {
      const [historyRes, followersRes, followingRes, blockedRes] = await Promise.all([
        getUserLoginHistory(userId),
        getUserFollowers(userId),
        getUserFollowing(userId),
        getUserBlocked(userId)
      ]);
      
      if (historyRes.success) setLoginHistory(historyRes.loginHistory || []);
      if (followersRes.success) setFollowers(followersRes.followers || []);
      if (followingRes.success) setFollowing(followingRes.following || []);
      if (blockedRes.success) setBlockedUsers(blockedRes.blocked || []);
    } catch (error) {
      console.error('Error loading user related data:', error);
    }
  };

  const handleProfileUpdate = async () => {
    if (!selectedUser) return;
    try {
      const response = await updateUserProfile(selectedUser._id, profileEditData);
      if (response.success) {
        setSelectedUser(response.user);
        setEditingProfile(false);
        setToast({ type: 'success', message: 'Profile updated successfully' });
        fetchUsers(); // Refresh list
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setToast({ type: 'error', message: 'Failed to update profile' });
    }
  };

  const handleIdentityVerification = async (verified, status) => {
    if (!selectedUser) return;
    try {
      const response = await verifyUserIdentity(selectedUser._id, verified, status);
      if (response.success) {
        setSelectedUser(response.user);
        setToast({ type: 'success', message: `Identity ${verified ? 'verified' : 'rejected'}` });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error verifying identity:', error);
      setToast({ type: 'error', message: 'Failed to verify identity' });
    }
  };

  const handleWarningStrike = async (reason) => {
    if (!selectedUser || !reason) return;
    try {
      const response = await updateUserStatus(selectedUser._id, null, reason, true);
      if (response.success) {
        setSelectedUser(response.user);
        setToast({ type: 'success', message: 'Warning strike issued' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error issuing warning:', error);
      setToast({ type: 'error', message: 'Failed to issue warning' });
    }
  };

  // Close toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check localStorage for cached user FIRST (don't wait for authLoading if user is cached)
  const getCachedUser = () => {
    try {
      const cachedUser = localStorage.getItem('user');
      if (cachedUser && cachedUser !== 'null' && cachedUser !== 'undefined') {
        return JSON.parse(cachedUser);
      }
    } catch (e) {
      // Ignore parse errors
    }
    return <></>;
  };

  const cachedUser = getCachedUser();
  const currentUser = user || cachedUser;
  
  // If we have a cached admin user, show panel immediately (don't wait for authLoading)
  if (cachedUser && cachedUser.role === 'admin') {
    // Allow render to continue - panel will show
  } else if (authLoading && !currentUser) {
    // Show loading ONLY if auth is loading AND we have NO user (neither from context nor cached)
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#666',
        background: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #FF0050',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }} />
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>Loading admin panel...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }
  
  // Early return if user is not admin or not logged in (redirect handled in useEffect above)
  if (!currentUser || (currentUser && currentUser.role !== 'admin')) {
    return null;
  }

  const closeButton = isModal ? (
    <button className="admin-panel-close" onClick={onClose}>×</button>
  ) : (
    onClose ? <button className="admin-panel-close" onClick={() => navigate('/')}>×</button> : null
  );

  const content = (
    <div className="admin-panel-with-sidebar">
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeSubTab={null}
        setActiveSubTab={(subTab) => {
          if (activeTab === 'moderation') setModerationTab(subTab);
          else if (activeTab === 'safety') setSafetyTab(subTab);
          else if (activeTab === 'monetization') setMonetizationTab(subTab);
          else if (activeTab === 'analytics') setAnalyticsTab(subTab);
          else if (activeTab === 'search') setSearchTab(subTab);
          else if (activeTab === 'system') setSystemTab(subTab);
          else if (activeTab === 'support') setSupportTab(subTab);
        }}
        onClose={onClose} 
      />
      
      <div className="admin-panel-main-content">
        <div className="admin-panel-container" onClick={(e) => isModal && e.stopPropagation()}>
          {/* Header */}
          <div className="admin-panel-header">
            <h2>
              <i className="fa-solid fa-shield-halved"></i>
              {(() => {
                const getTabTitle = () => {
                  switch (activeTab) {
                    case 'dashboard': return 'Dashboard';
                    case 'users': return 'Users';
                    case 'videos': return 'Videos';
                    case 'stories': return 'Stories';
                    case 'comments': return 'Comments';
                    case 'moderation': 
                      if (moderationTab) {
                        const moderationTabNames = {
                          'videos': 'Videos',
                          'comments': 'Comments',
                          'ai-flags': 'AI Flags',
                          'live-streams': 'Live Streams',
                          'copyright': 'Copyright Disputes'
                        };
                        return `Moderation → ${moderationTabNames[moderationTab] || moderationTab}`;
                      }
                      return 'Moderation';
                    case 'safety': 
                      if (safetyTab) {
                        const safetyTabNames = {
                          'reports': 'Reports',
                          'high-risk': 'High Risk',
                          'spam': 'Spam Alerts',
                          'child-safety': 'Child Safety',
                          'bot-detection': 'Bot Detection',
                          'takeover': 'Account Takeover'
                        };
                        return `Reports & Safety → ${safetyTabNames[safetyTab] || safetyTab}`;
                      }
                      return 'Reports & Safety';
                    case 'monetization': 
                      if (monetizationTab) {
                        const monetizationTabNames = {
                          'dashboard': 'Dashboard',
                          'creators': 'Creators',
                          'ad-revenue': 'Ad Revenue',
                          'gifts-coins': 'Gifts & Coins',
                          'withdrawals': 'Withdrawals',
                          'tax-documents': 'Tax Documents',
                          'brand-deals': 'Brand Deals'
                        };
                        return `Monetization → ${monetizationTabNames[monetizationTab] || monetizationTab}`;
                      }
                      return 'Monetization';
                    case 'analytics': 
                      if (analyticsTab) {
                        const analyticsTabNames = {
                          'overview': 'Overview',
                          'active-users': 'Active Users',
                          'retention': 'Retention',
                          'completion': 'Completion Rate',
                          'hashtags': 'Trending Hashtags',
                          'categories': 'Categories',
                          'regions': 'Regions',
                          'devices': 'Devices'
                        };
                        return `Analytics → ${analyticsTabNames[analyticsTab] || analyticsTab}`;
                      }
                      return 'Analytics';
                    case 'search': 
                      if (searchTab) {
                        const searchTabNames = {
                          'blacklist': 'Blacklist',
                          'trending': 'Trending',
                          'hashtags': 'Hashtags',
                          'recommendations': 'Recommendations'
                        };
                        return `Search & Rec → ${searchTabNames[searchTab] || searchTab}`;
                      }
                      return 'Search & Rec';
                    case 'system': 
                      if (systemTab) {
                        const systemTabNames = {
                          'video-processing': 'Video Processing',
                          'cdn': 'CDN Health',
                          'servers': 'Servers',
                          'errors': 'Error Logs',
                          'crashes': 'Crashes',
                          'api': 'API Requests',
                          'storage': 'Storage'
                        };
                        return `Technical System → ${systemTabNames[systemTab] || systemTab}`;
                      }
                      return 'Technical System';
                    case 'support': return 'Support & Help';
                    case 'policy': return 'Policy Compliance';
                    case 'security': return 'Security';
                    case 'app-store': return 'App Store Compliance';
                    case 'experiments': return 'Experiment Features';
                    case 'notifications': return 'Notifications Control';
                    case 'backup': return 'Backup & Recovery';
                    default: return 'Admin Panel';
                  }
                };
                return getTabTitle();
              })()}
            </h2>
            {closeButton}
          </div>

          {/* Tabs - Keep for desktop, hide on mobile when sidebar is visible - REMOVED FROM LAYOUT */}
          <div className="admin-panel-tabs admin-panel-tabs-desktop" style={{ display: 'none', height: 0, margin: 0, padding: 0 }}>
          <button 
            className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button 
            className={`admin-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            🎬 Videos
          </button>
          <button 
            className={`admin-tab ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            📖 Stories
          </button>
          <button 
            className={`admin-tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            💬 Comments
          </button>
          <button 
            className={`admin-tab ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            🛡️ Moderation
          </button>
          <button 
            className={`admin-tab ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
          >
            🚨 Reports & Safety
          </button>
          <button 
            className={`admin-tab ${activeTab === 'monetization' ? 'active' : ''}`}
            onClick={() => setActiveTab('monetization')}
          >
            💰 Monetization
          </button>
          <button 
            className={`admin-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Analytics
          </button>
          <button 
            className={`admin-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search & Rec
          </button>
          </div>

          {/* Content */}
          <div className="admin-panel-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="admin-dashboard">
              {loadingStats ? (
                <div className="admin-loading">Loading dashboard...</div>
              ) : stats ? (
                <>
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                      <h3>Total Users</h3>
                      <p className="stat-value">{stats.totalUsers}</p>
                      <p className="stat-subtitle">{stats.activeUsers} active</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Total Videos</h3>
                      <p className="stat-value">{stats.totalVideos}</p>
                      <p className="stat-subtitle">{stats.videosToday} today</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Total Stories</h3>
                      <p className="stat-value">{stats.totalStories}</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Total Comments</h3>
                      <p className="stat-value">{stats.totalComments}</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Banned Users</h3>
                      <p className="stat-value">{stats.bannedUsers}</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Suspended Users</h3>
                      <p className="stat-value">{stats.suspendedUsers}</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>New Users Today</h3>
                      <p className="stat-value">{stats.newUsersToday}</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>New Users This Week</h3>
                      <p className="stat-value">{stats.newUsersThisWeek}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-error">Failed to load dashboard stats</div>
              )}
            </div>
          )}

          {/* Users Tab - Continue in next message due to length */}
          {activeTab === 'users' && (
            <div className="admin-users">
              {/* Search and Filters */}
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPagination({ ...usersPagination, page: 1 });
                  }}
                  className="admin-search-input"
                />
                <select
                  value={usersStatusFilter}
                  onChange={(e) => {
                    setUsersStatusFilter(e.target.value);
                    setUsersPagination({ ...usersPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>
                <select
                  value={usersRoleFilter}
                  onChange={(e) => {
                    setUsersRoleFilter(e.target.value);
                    setUsersPagination({ ...usersPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Users List */}
              {loadingUsers ? (
                <div className="admin-loading">Loading users...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                              <p style={{ color: '#6c757d', fontSize: '16px' }}>No users found</p>
                            </td>
                          </tr>
                        ) : (
                          users.map((user) => (
                            <tr key={user._id}>
                              <td data-label="Username">{user.username}</td>
                              <td data-label="Email">{user.email}</td>
                              <td data-label="Role">
                                <select
                                  value={user.role || 'user'}
                                  onChange={(e) => handleUserRoleChange(user._id, e.target.value)}
                                  className="admin-role-select"
                                >
                                  <option value="user">User</option>
                                  <option value="moderator">Moderator</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td data-label="Status">
                                <span className={`status-badge ${user.accountStatus || 'active'}`}>
                                  {user.accountStatus || 'active'}
                                </span>
                              </td>
                              <td data-label="Created">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</td>
                              <td data-label="Actions">
                                <div className="admin-actions">
                                  <button
                                    onClick={() => viewUserDetails(user._id)}
                                    className="admin-btn admin-btn-view"
                                    title="View user details"
                                  >
                                    View
                                  </button>
                                  {user.accountStatus === 'active' && (
                                    <>
                                      <button
                                        onClick={() => handleUserStatusChange(user._id, 'suspended')}
                                        className="admin-btn admin-btn-warning"
                                        title="Suspend user"
                                      >
                                        Suspend
                                      </button>
                                      <button
                                        onClick={() => handleUserStatusChange(user._id, 'banned')}
                                        className="admin-btn admin-btn-danger"
                                        title="Ban user"
                                      >
                                        Ban
                                      </button>
                                    </>
                                  )}
                                  {user.accountStatus !== 'active' && (
                                    <button
                                      onClick={() => handleUserStatusChange(user._id, 'active')}
                                      className="admin-btn admin-btn-success"
                                      title="Activate user"
                                    >
                                      Activate
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteUser(user._id)}
                                    className="admin-btn admin-btn-delete"
                                    title="Delete user"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {usersPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={usersPagination.page === 1}
                        onClick={() => setUsersPagination({ ...usersPagination, page: usersPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {usersPagination.page} of {usersPagination.pages}</span>
                      <button
                        disabled={usersPagination.page === usersPagination.pages}
                        onClick={() => setUsersPagination({ ...usersPagination, page: usersPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Comprehensive User Details Modal - TikTok Level */}
                  {selectedUser && (
                    <div className="admin-modal-overlay" onClick={() => {
                      setSelectedUser(null);
                      setEditingProfile(false);
                      setUserDetailsTab('overview');
                    }}>
                      <div className="admin-user-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                          <h3>User Management: {selectedUser.username}</h3>
                          <button onClick={() => {
                            setSelectedUser(null);
                            setEditingProfile(false);
                            setUserDetailsTab('overview');
                          }}>×</button>
                        </div>
                        
                        {loadingUserDetails ? (
                          <div className="admin-loading">Loading user details...</div>
                        ) : (
                          <div className="admin-user-details-content">
                            {/* Tabs */}
                            <div className="admin-user-details-tabs">
                              <button 
                                className={userDetailsTab === 'overview' ? 'active' : ''}
                                onClick={() => setUserDetailsTab('overview')}
                              >
                                Overview
                              </button>
                              <button 
                                className={userDetailsTab === 'profile' ? 'active' : ''}
                                onClick={() => setUserDetailsTab('profile')}
                              >
                                Edit Profile
                              </button>
                              <button 
                                className={userDetailsTab === 'login' ? 'active' : ''}
                                onClick={() => setUserDetailsTab('login')}
                              >
                                Login History
                              </button>
                              <button 
                                className={userDetailsTab === 'followers' ? 'active' : ''}
                                onClick={() => setUserDetailsTab('followers')}
                              >
                                Followers ({selectedUser.stats?.followers || 0})
                              </button>
                              <button 
                                className={userDetailsTab === 'following' ? 'active' : ''}
                                onClick={() => setUserDetailsTab('following')}
                              >
                                Following ({selectedUser.stats?.following || 0})
                              </button>
                              <button 
                                className={userDetailsTab === 'blocked' ? 'active' : ''}
                                onClick={() => setUserDetailsTab('blocked')}
                              >
                                Blocked ({selectedUser.stats?.blocked || 0})
                              </button>
                            </div>

                            {/* Overview Tab */}
                            {userDetailsTab === 'overview' && (
                              <div className="admin-user-overview">
                                <div className="admin-user-info-grid">
                                  <div className="admin-info-section">
                                    <h4>Basic Information</h4>
                                    <div className="admin-info-item">
                                      <label>Username:</label>
                                      <span>{selectedUser.username}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Email:</label>
                                      <span>{selectedUser.email}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Phone:</label>
                                      <span>{selectedUser.phone || 'Not provided'}</span>
                                      {selectedUser.phoneVerified && <span className="verified-badge">✓ Verified</span>}
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Display Name:</label>
                                      <span>{selectedUser.profile?.displayName || 'Not set'}</span>
                                    </div>
                                  </div>

                                  <div className="admin-info-section">
                                    <h4>Account Status</h4>
                                    <div className="admin-info-item">
                                      <label>Status:</label>
                                      <span className={`status-badge ${selectedUser.accountStatus}`}>
                                        {selectedUser.accountStatus}
                                      </span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Role:</label>
                                      <span>{selectedUser.role}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Email Verified:</label>
                                      <span>{selectedUser.emailVerified ? '✓ Yes' : '✗ No'}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Identity Verified:</label>
                                      <span>{selectedUser.identityVerified ? '✓ Yes' : '✗ No'}</span>
                                      {selectedUser.identityVerificationStatus && (
                                        <span className={`verification-status ${selectedUser.identityVerificationStatus}`}>
                                          ({selectedUser.identityVerificationStatus})
                                        </span>
                                      )}
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Warning Strikes:</label>
                                      <span className={selectedUser.warningStrikes > 0 ? 'warning-strikes' : ''}>
                                        {selectedUser.warningStrikes || 0}/3
                                      </span>
                                    </div>
                                  </div>

                                  <div className="admin-info-section">
                                    <h4>Statistics</h4>
                                    <div className="admin-info-item">
                                      <label>Videos:</label>
                                      <span>{selectedUser.stats?.videos || 0}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Stories:</label>
                                      <span>{selectedUser.stats?.stories || 0}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Comments:</label>
                                      <span>{selectedUser.stats?.comments || 0}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Followers:</label>
                                      <span>{selectedUser.stats?.followers || 0}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Following:</label>
                                      <span>{selectedUser.stats?.following || 0}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Account Created:</label>
                                      <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="admin-info-item">
                                      <label>Last Login:</label>
                                      <span>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="admin-quick-actions">
                                  <h4>Quick Actions</h4>
                                  <div className="admin-action-buttons-grid">
                                    {selectedUser.accountStatus === 'active' && (
                                      <>
                                        <button
                                          className="admin-btn admin-btn-warning"
                                          onClick={() => {
                                            const reason = prompt('Reason for suspension:');
                                            if (reason) handleUserStatusChange(selectedUser._id, 'suspended', reason);
                                          }}
                                        >
                                          ⚠️ Suspend
                                        </button>
                                        <button
                                          className="admin-btn admin-btn-danger"
                                          onClick={() => {
                                            const reason = prompt('Reason for ban:');
                                            if (reason) handleUserStatusChange(selectedUser._id, 'banned', reason);
                                          }}
                                        >
                                          🚫 Ban
                                        </button>
                                        <button
                                          className="admin-btn admin-btn-strike"
                                          onClick={() => {
                                            const reason = prompt('Warning reason:');
                                            if (reason) handleWarningStrike(reason);
                                          }}
                                        >
                                          ⚡ Warning Strike
                                        </button>
                                      </>
                                    )}
                                    {selectedUser.accountStatus !== 'active' && (
                                      <button
                                        className="admin-btn admin-btn-success"
                                        onClick={() => handleUserStatusChange(selectedUser._id, 'active')}
                                      >
                                        ✅ Activate
                                      </button>
                                    )}
                                    {!selectedUser.identityVerified && (
                                      <button
                                        className="admin-btn admin-btn-verify"
                                        onClick={() => handleIdentityVerification(true, 'approved')}
                                      >
                                        ✓ Verify Identity
                                      </button>
                                    )}
                                    {selectedUser.identityVerified && (
                                      <button
                                        className="admin-btn admin-btn-reject"
                                        onClick={() => handleIdentityVerification(false, 'rejected')}
                                      >
                                        ✗ Revoke Verification
                                      </button>
                                    )}
                                  </div>

                                  {/* Warning History */}
                                  {selectedUser.warningHistory && selectedUser.warningHistory.length > 0 && (
                                    <div className="admin-warning-history">
                                      <h5>Warning History</h5>
                                      {selectedUser.warningHistory.map((warning, idx) => (
                                        <div key={idx} className="admin-warning-item">
                                          <span className="warning-date">{new Date(warning.issuedAt).toLocaleString()}</span>
                                          <span className="warning-reason">{warning.reason}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Edit Profile Tab */}
                            {userDetailsTab === 'profile' && (
                              <div className="admin-edit-profile">
                                <h4>Edit User Profile</h4>
                                <div className="admin-edit-form">
                                  <div className="admin-form-group">
                                    <label>Username</label>
                                    <input
                                      type="text"
                                      value={profileEditData.username}
                                      onChange={(e) => setProfileEditData({...profileEditData, username: e.target.value})}
                                      disabled={!editingProfile}
                                    />
                                  </div>
                                  <div className="admin-form-group">
                                    <label>Email</label>
                                    <input
                                      type="email"
                                      value={profileEditData.email}
                                      onChange={(e) => setProfileEditData({...profileEditData, email: e.target.value})}
                                      disabled={!editingProfile}
                                    />
                                  </div>
                                  <div className="admin-form-group">
                                    <label>Phone</label>
                                    <input
                                      type="tel"
                                      value={profileEditData.phone || ''}
                                      onChange={(e) => setProfileEditData({...profileEditData, phone: e.target.value})}
                                      disabled={!editingProfile}
                                      placeholder="+1234567890"
                                    />
                                  </div>
                                  <div className="admin-form-group">
                                    <label>Display Name</label>
                                    <input
                                      type="text"
                                      value={profileEditData.displayName || ''}
                                      onChange={(e) => setProfileEditData({...profileEditData, displayName: e.target.value})}
                                      disabled={!editingProfile}
                                    />
                                  </div>
                                  <div className="admin-form-group">
                                    <label>Bio</label>
                                    <textarea
                                      value={profileEditData.bio || ''}
                                      onChange={(e) => setProfileEditData({...profileEditData, bio: e.target.value})}
                                      disabled={!editingProfile}
                                      rows="3"
                                    />
                                  </div>
                                  <div className="admin-form-group">
                                    <label>Avatar URL</label>
                                    <input
                                      type="url"
                                      value={profileEditData.avatar || ''}
                                      onChange={(e) => setProfileEditData({...profileEditData, avatar: e.target.value})}
                                      disabled={!editingProfile}
                                    />
                                  </div>
                                  <div className="admin-form-group">
                                    <label>Website</label>
                                    <input
                                      type="url"
                                      value={profileEditData.website || ''}
                                      onChange={(e) => setProfileEditData({...profileEditData, website: e.target.value})}
                                      disabled={!editingProfile}
                                    />
                                  </div>
                                  <div className="admin-form-actions">
                                    {!editingProfile ? (
                                      <button className="admin-btn admin-btn-primary" onClick={() => setEditingProfile(true)}>
                                        Edit Profile
                                      </button>
                                    ) : (
                                      <>
                                        <button className="admin-btn admin-btn-success" onClick={handleProfileUpdate}>
                                          Save Changes
                                        </button>
                                        <button className="admin-btn admin-btn-secondary" onClick={() => {
                                          setEditingProfile(false);
                                          setProfileEditData({
                                            username: selectedUser.username || '',
                                            email: selectedUser.email || '',
                                            phone: selectedUser.phone || '',
                                            displayName: selectedUser.profile?.displayName || '',
                                            bio: selectedUser.profile?.bio || '',
                                            avatar: selectedUser.profile?.avatar || '',
                                            website: selectedUser.profile?.website || ''
                                          });
                                        }}>
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Login History Tab */}
                            {userDetailsTab === 'login' && (
                              <div className="admin-login-history">
                                <h4>Login History & Devices</h4>
                                {loginHistory.length === 0 ? (
                                  <p>No login history available</p>
                                ) : (
                                  <div className="admin-login-history-list">
                                    {loginHistory.slice(0, 20).map((login, idx) => (
                                      <div key={idx} className="admin-login-item">
                                        <div className="login-item-header">
                                          <span className="login-device">{login.device || 'Unknown Device'}</span>
                                          <span className={`login-status ${login.isActive ? 'active' : 'inactive'}`}>
                                            {login.isActive ? 'Active' : 'Inactive'}
                                          </span>
                                        </div>
                                        <div className="login-item-details">
                                          <span><strong>IP:</strong> {login.ipAddress || 'N/A'}</span>
                                          <span><strong>Browser:</strong> {login.browser || 'N/A'}</span>
                                          <span><strong>OS:</strong> {login.os || 'N/A'}</span>
                                          <span><strong>Location:</strong> {login.location || 'N/A'}</span>
                                        </div>
                                        <div className="login-item-time">
                                          <span>Login: {new Date(login.loginAt).toLocaleString()}</span>
                                          {login.logoutAt && (
                                            <span>Logout: {new Date(login.logoutAt).toLocaleString()}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Followers Tab */}
                            {userDetailsTab === 'followers' && (
                              <div className="admin-followers-list">
                                <h4>Followers ({followers.length})</h4>
                                {followers.length === 0 ? (
                                  <p>No followers</p>
                                ) : (
                                  <div className="admin-users-list-grid">
                                    {followers.map((follower) => (
                                      <div key={follower._id} className="admin-user-card">
                                        <img 
                                          src={follower.profile?.avatar || '/default-avatar.png'} 
                                          alt={follower.username}
                                          className="user-card-avatar"
                                        />
                                        <div className="user-card-info">
                                          <div className="user-card-name">{follower.profile?.displayName || follower.username}</div>
                                          <div className="user-card-username">@{follower.username}</div>
                                          <div className="user-card-email">{follower.email}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Following Tab */}
                            {userDetailsTab === 'following' && (
                              <div className="admin-following-list">
                                <h4>Following ({following.length})</h4>
                                {following.length === 0 ? (
                                  <p>Not following anyone</p>
                                ) : (
                                  <div className="admin-users-list-grid">
                                    {following.map((followed) => (
                                      <div key={followed._id} className="admin-user-card">
                                        <img 
                                          src={followed.profile?.avatar || '/default-avatar.png'} 
                                          alt={followed.username}
                                          className="user-card-avatar"
                                        />
                                        <div className="user-card-info">
                                          <div className="user-card-name">{followed.profile?.displayName || followed.username}</div>
                                          <div className="user-card-username">@{followed.username}</div>
                                          <div className="user-card-email">{followed.email}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Blocked Users Tab */}
                            {userDetailsTab === 'blocked' && (
                              <div className="admin-blocked-list">
                                <h4>Blocked Users ({blockedUsers.length})</h4>
                                {blockedUsers.length === 0 ? (
                                  <p>No blocked users</p>
                                ) : (
                                  <div className="admin-users-list-grid">
                                    {blockedUsers.map((blocked) => (
                                      <div key={blocked._id} className="admin-user-card">
                                        <img 
                                          src={blocked.profile?.avatar || '/default-avatar.png'} 
                                          alt={blocked.username}
                                          className="user-card-avatar"
                                        />
                                        <div className="user-card-info">
                                          <div className="user-card-name">{blocked.profile?.displayName || blocked.username}</div>
                                          <div className="user-card-username">@{blocked.username}</div>
                                          <div className="user-card-email">{blocked.email}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div className="admin-videos">
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={videosSearch}
                  onChange={(e) => {
                    setVideosSearch(e.target.value);
                    setVideosPagination({ ...videosPagination, page: 1 });
                  }}
                  className="admin-search-input"
                />
              </div>

              {loadingVideos ? (
                <div className="admin-loading">Loading videos...</div>
              ) : videos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <p style={{ fontSize: '16px' }}>No videos found</p>
                </div>
              ) : (
                <>
                  <div className="admin-videos-grid">
                    {videos.map((video) => (
                      <div key={video._id} className="admin-video-card">
                        <div className="admin-video-card-thumbnail">
                          {video.thumbnail ? (
                            <img 
                              src={video.thumbnail} 
                              alt={video.description?.substring(0, 30) || 'Video thumbnail'} 
                              onError={(e) => {
                                e.target.src = '/placeholder.png';
                              }}
                            />
                          ) : (
                            <div className="admin-video-placeholder">
                              <i className="fa-solid fa-video"></i>
                            </div>
                          )}
                          <div className="admin-video-card-overlay">
                            <span className="admin-video-duration">
                              {video.duration ? `${Math.floor(video.duration)}s` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="admin-video-card-content">
                          <h4 className="admin-video-card-title" title={video.description || 'No description'}>
                            {video.description?.substring(0, 60) || 'No description'}
                            {video.description && video.description.length > 60 ? '...' : ''}
                          </h4>
                          <div className="admin-video-card-user">
                            <img 
                              src={video.user?.profile?.avatar || '/default-avatar.png'} 
                              alt={video.user?.username || 'User'}
                              className="admin-video-user-avatar"
                              onError={(e) => {
                                e.target.src = '/default-avatar.png';
                              }}
                            />
                            <span>{video.user?.username || 'Unknown'}</span>
                          </div>
                          <div className="admin-video-card-stats">
                            <div className="admin-video-stat">
                              <i className="fa-solid fa-eye"></i>
                              <span>{video.views || 0}</span>
                            </div>
                            <div className="admin-video-stat">
                              <i className="fa-solid fa-heart"></i>
                              <span>{video.likes || 0}</span>
                            </div>
                            <div className="admin-video-stat">
                              <i className="fa-solid fa-comment"></i>
                              <span>{video.comments || 0}</span>
                            </div>
                          </div>
                          <div className="admin-video-card-meta">
                            <span className="admin-video-date">
                              {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                            {video.hashtags && video.hashtags.length > 0 && (
                              <div className="admin-video-hashtags">
                                {video.hashtags.slice(0, 2).map((tag, idx) => (
                                  <span key={idx} className="admin-video-hashtag">#{tag}</span>
                                ))}
                                {video.hashtags.length > 2 && (
                                  <span className="admin-video-hashtag-more">+{video.hashtags.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="admin-video-card-actions">
                            <button
                              onClick={() => window.open(video.url || video.playbackUrl || '#', '_blank')}
                              className="admin-btn admin-btn-view admin-btn-small"
                              title="View video"
                            >
                              <i className="fa-solid fa-play"></i> View
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video._id)}
                              className="admin-btn admin-btn-delete admin-btn-small"
                              title="Delete video"
                            >
                              <i className="fa-solid fa-trash"></i> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {videosPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={videosPagination.page === 1}
                        onClick={() => setVideosPagination({ ...videosPagination, page: videosPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {videosPagination.page} of {videosPagination.pages}</span>
                      <button
                        disabled={videosPagination.page === videosPagination.pages}
                        onClick={() => setVideosPagination({ ...videosPagination, page: videosPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Moderation Tab */}
          {activeTab === 'moderation' && (
            <div className="admin-moderation">
              {/* Video Moderation */}
              {moderationTab === 'videos' && (
                <div className="admin-moderation-content">
                  <div className="admin-filters">
                    <select
                      value={moderationVideosStatus}
                      onChange={(e) => {
                        setModerationVideosStatus(e.target.value);
                        setModerationVideosPagination({ ...moderationVideosPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="flagged">Flagged</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  {loadingModerationVideos ? (
                    <div className="admin-loading">Loading videos...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Thumbnail</th>
                              <th>Description</th>
                              <th>User</th>
                              <th>Status</th>
                              <th>Hashtags</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {moderationVideos.map((video) => (
                              <tr key={video._id}>
                                <td>
                                  <img
                                    src={video.thumbnail || '/placeholder.png'}
                                    alt=""
                                    style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                  />
                                </td>
                                <td>{video.description?.substring(0, 50) || 'No description'}</td>
                                <td>{video.user?.username || 'Unknown'}</td>
                                <td>
                                  <span className={`moderation-badge ${video.moderationStatus || 'pending'}`}>
                                    {video.moderationStatus || 'pending'}
                                  </span>
                                </td>
                                <td>{video.hashtags?.slice(0, 3).join(', ') || 'None'}</td>
                                <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => setSelectedVideoForModeration(video)}
                                      className="admin-btn admin-btn-secondary admin-btn-small"
                                    >
                                      Review
                                    </button>
                                    {video.moderationStatus !== 'approved' && (
                                      <button
                                        onClick={() => handleModerateVideo(video._id, 'approve')}
                                        className="admin-btn admin-btn-primary admin-btn-small"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    {video.moderationStatus !== 'rejected' && (
                                      <button
                                        onClick={() => handleModerateVideo(video._id, 'reject')}
                                        className="admin-btn admin-btn-danger admin-btn-small"
                                      >
                                        Reject
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {moderationVideosPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={moderationVideosPagination.page === 1}
                            onClick={() => setModerationVideosPagination({ ...moderationVideosPagination, page: moderationVideosPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {moderationVideosPagination.page} of {moderationVideosPagination.pages}</span>
                          <button
                            disabled={moderationVideosPagination.page === moderationVideosPagination.pages}
                            onClick={() => setModerationVideosPagination({ ...moderationVideosPagination, page: moderationVideosPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Comment Moderation */}
              {moderationTab === 'comments' && (
                <div className="admin-moderation-content">
                  {loadingModerationComments ? (
                    <div className="admin-loading">Loading comments...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Comment</th>
                              <th>User</th>
                              <th>Video</th>
                              <th>Status</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {moderationComments.map((comment) => (
                              <tr key={comment._id}>
                                <td>{comment.text?.substring(0, 100)}</td>
                                <td>{comment.user?.username || 'Unknown'}</td>
                                <td>{comment.video?.description?.substring(0, 30) || 'N/A'}</td>
                                <td>
                                  <span className={`moderation-badge ${comment.moderationStatus || 'approved'}`}>
                                    {comment.moderationStatus || 'approved'}
                                  </span>
                                </td>
                                <td>{new Date(comment.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => handleModerateComment(comment._id, 'approve')}
                                      className="admin-btn admin-btn-primary admin-btn-small"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleModerateComment(comment._id, 'delete')}
                                      className="admin-btn admin-btn-danger admin-btn-small"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => handleModerateComment(comment._id, 'limit')}
                                      className="admin-btn admin-btn-secondary admin-btn-small"
                                    >
                                      Limit
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {moderationCommentsPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={moderationCommentsPagination.page === 1}
                            onClick={() => setModerationCommentsPagination({ ...moderationCommentsPagination, page: moderationCommentsPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {moderationCommentsPagination.page} of {moderationCommentsPagination.pages}</span>
                          <button
                            disabled={moderationCommentsPagination.page === moderationCommentsPagination.pages}
                            onClick={() => setModerationCommentsPagination({ ...moderationCommentsPagination, page: moderationCommentsPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* AI Flags */}
              {moderationTab === 'ai-flags' && (
                <div className="admin-moderation-content">
                  <div className="admin-filters">
                    <select
                      value={aiFlagType}
                      onChange={(e) => {
                        setAiFlagType(e.target.value);
                        setAiFlagsPagination({ ...aiFlagsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Flags</option>
                      <option value="nudity">Nudity</option>
                      <option value="hate">Hate Speech</option>
                      <option value="violence">Violence</option>
                      <option value="spam">Spam</option>
                    </select>
                  </div>

                  {loadingAiFlags ? (
                    <div className="admin-loading">Loading AI flags...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Thumbnail</th>
                              <th>Description</th>
                              <th>User</th>
                              <th>Flags</th>
                              <th>Confidence</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {aiFlags.map((video) => {
                              const flags = [];
                              if (video.aiFlags?.nudity?.flagged) flags.push({ type: 'nudity', conf: video.aiFlags.nudity.confidence });
                              if (video.aiFlags?.hate?.flagged) flags.push({ type: 'hate', conf: video.aiFlags.hate.confidence });
                              if (video.aiFlags?.violence?.flagged) flags.push({ type: 'violence', conf: video.aiFlags.violence.confidence });
                              if (video.aiFlags?.spam?.flagged) flags.push({ type: 'spam', conf: video.aiFlags.spam.confidence });

                              return (
                                <tr key={video._id}>
                                  <td>
                                    <img
                                      src={video.thumbnail || '/placeholder.png'}
                                      alt=""
                                      style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                  </td>
                                  <td>{video.description?.substring(0, 50) || 'No description'}</td>
                                  <td>{video.user?.username || 'Unknown'}</td>
                                  <td>
                                    {flags.map((flag, idx) => (
                                      <span key={idx} className="ai-flag-badge" style={{ marginRight: '4px', background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                        {flag.type} ({(flag.conf * 100).toFixed(0)}%)
                                      </span>
                                    ))}
                                  </td>
                                  <td>{flags[0] ? (flags[0].conf * 100).toFixed(0) + '%' : 'N/A'}</td>
                                  <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {flags.map((flag) => (
                                        <button
                                          key={flag.type}
                                          onClick={() => handleReviewAIFlag(video._id, flag.type, 'confirm')}
                                          className="admin-btn admin-btn-danger admin-btn-small"
                                          style={{ fontSize: '11px' }}
                                        >
                                          Confirm {flag.type}
                                        </button>
                                      ))}
                                      <button
                                        onClick={() => handleReviewAIFlag(video._id, flags[0]?.type, 'dismiss')}
                                        className="admin-btn admin-btn-secondary admin-btn-small"
                                      >
                                        Dismiss
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {aiFlagsPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={aiFlagsPagination.page === 1}
                            onClick={() => setAiFlagsPagination({ ...aiFlagsPagination, page: aiFlagsPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {aiFlagsPagination.page} of {aiFlagsPagination.pages}</span>
                          <button
                            disabled={aiFlagsPagination.page === aiFlagsPagination.pages}
                            onClick={() => setAiFlagsPagination({ ...aiFlagsPagination, page: aiFlagsPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Live Streams */}
              {moderationTab === 'live-streams' && (
                <div className="admin-moderation-content">
                  {loadingLiveStreams ? (
                    <div className="admin-loading">Loading live streams...</div>
                  ) : (
                    <>
                      {liveStreams.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>No live streams currently</div>
                      ) : (
                        <div className="admin-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>User</th>
                                <th>Title</th>
                                <th>Viewers</th>
                                <th>Started</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {liveStreams.map((stream) => (
                                <tr key={stream._id}>
                                  <td>{stream.user?.username || 'Unknown'}</td>
                                  <td>{stream.description?.substring(0, 50) || 'No title'}</td>
                                  <td>{stream.views || 0}</td>
                                  <td>{new Date(stream.createdAt).toLocaleTimeString()}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <button
                                        onClick={() => handleModerateLiveStream(stream._id, 'end')}
                                        className="admin-btn admin-btn-danger admin-btn-small"
                                      >
                                        End Stream
                                      </button>
                                      <button
                                        onClick={() => handleModerateLiveStream(stream._id, 'warn')}
                                        className="admin-btn admin-btn-secondary admin-btn-small"
                                      >
                                        Warn
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Copyright Disputes */}
              {moderationTab === 'copyright' && (
                <div className="admin-moderation-content">
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    Copyright dispute handling - View videos with copyright disputes in Videos section
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stories Tab */}
          {activeTab === 'stories' && (
            <div className="admin-stories">
              {loadingStories ? (
                <div className="admin-loading">Loading stories...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Story</th>
                          <th>User</th>
                          <th>Type</th>
                          <th>Views</th>
                          <th>Expires</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stories.map((story) => (
                          <tr key={story._id}>
                            <td>
                              <div className="admin-story-preview">
                                {story.thumbnail && (
                                  <img src={story.thumbnail} alt="Story" />
                                )}
                                <span>{story.text?.substring(0, 50) || 'No text'}</span>
                              </div>
                            </td>
                            <td>{story.user?.username || 'Unknown'}</td>
                            <td>{story.type}</td>
                            <td>{story.views || 0}</td>
                            <td>{new Date(story.expiresAt).toLocaleString()}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteStory(story._id)}
                                className="admin-btn admin-btn-delete"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {storiesPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={storiesPagination.page === 1}
                        onClick={() => setStoriesPagination({ ...storiesPagination, page: storiesPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {storiesPagination.page} of {storiesPagination.pages}</span>
                      <button
                        disabled={storiesPagination.page === storiesPagination.pages}
                        onClick={() => setStoriesPagination({ ...storiesPagination, page: storiesPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="admin-comments">
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Search comments..."
                  value={commentsSearch}
                  onChange={(e) => {
                    setCommentsSearch(e.target.value);
                    setCommentsPagination({ ...commentsPagination, page: 1 });
                  }}
                  className="admin-search-input"
                />
              </div>

              {loadingComments ? (
                <div className="admin-loading">Loading comments...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Comment</th>
                          <th>User</th>
                          <th>Video</th>
                          <th>Likes</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comments.map((comment) => (
                          <tr key={comment._id}>
                            <td>{comment.text?.substring(0, 100)}</td>
                            <td>{comment.user?.username || 'Unknown'}</td>
                            <td>{comment.video?.description?.substring(0, 30) || 'N/A'}</td>
                            <td>{comment.likes || 0}</td>
                            <td>{new Date(comment.createdAt).toLocaleDateString()}</td>
                            <td>
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                className="admin-btn admin-btn-delete"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {commentsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={commentsPagination.page === 1}
                        onClick={() => setCommentsPagination({ ...commentsPagination, page: commentsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {commentsPagination.page} of {commentsPagination.pages}</span>
                      <button
                        disabled={commentsPagination.page === commentsPagination.pages}
                        onClick={() => setCommentsPagination({ ...commentsPagination, page: commentsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Reports & Safety Tab */}
          {activeTab === 'safety' && (
            <div className="admin-safety">
              {/* Abuse Reports */}
              {safetyTab === 'reports' && (
                <div className="admin-safety-content">
                  {/* High Risk Cases */}
                  {highRiskReports.length > 0 && (
                    <div style={{ marginBottom: '24px', padding: '16px', background: '#fee2e2', border: '2px solid #ef4444', borderRadius: '8px' }}>
                      <h3 style={{ margin: '0 0 12px 0', color: '#dc2626', fontSize: '18px', fontWeight: '700' }}>
                        ⚠️ High Risk Cases ({highRiskReports.length})
                      </h3>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {highRiskReports.slice(0, 5).map((report) => (
                          <div key={report._id} style={{ background: 'white', padding: '12px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => viewReportDetails(report._id)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: '#dc2626' }}>{report.reason.toUpperCase()}</strong>
                                <span className={`moderation-badge ${report.priority}`} style={{ marginLeft: '8px' }}>
                                  {report.priority}
                                </span>
                                {report.childSafetyConcern && <span style={{ marginLeft: '8px', background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>CHILD SAFETY</span>}
                              </div>
                              <span style={{ fontSize: '12px', color: '#6c757d' }}>{new Date(report.createdAt).toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '14px', color: '#495057' }}>
                              Reported by: {report.reporter?.username || 'Unknown'} | Reported user: {report.reportedUser?.username || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="admin-filters">
                    <select
                      value={reportsStatus}
                      onChange={(e) => {
                        setReportsStatus(e.target.value);
                        setReportsPagination({ ...reportsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                    <select
                      value={reportsPriority}
                      onChange={(e) => {
                        setReportsPriority(e.target.value);
                        setReportsPagination({ ...reportsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Priorities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {loadingReports ? (
                    <div className="admin-loading">Loading reports...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Reason</th>
                              <th>Reporter</th>
                              <th>Reported User</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reports.map((report) => (
                              <tr key={report._id}>
                                <td>
                                  <div>
                                    <strong>{report.reason.replace('_', ' ').toUpperCase()}</strong>
                                    {report.childSafetyConcern && <span style={{ marginLeft: '8px', background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>CHILD</span>}
                                  </div>
                                  {report.description && <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>{report.description.substring(0, 50)}...</div>}
                                </td>
                                <td>{report.reporter?.username || 'Unknown'}</td>
                                <td>{report.reportedUser?.username || 'N/A'}</td>
                                <td>
                                  <span className={`moderation-badge ${report.priority}`}>
                                    {report.priority}
                                  </span>
                                </td>
                                <td>
                                  <span className={`moderation-badge ${report.status}`}>
                                    {report.status}
                                  </span>
                                </td>
                                <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => viewReportDetails(report._id)}
                                      className="admin-btn admin-btn-secondary admin-btn-small"
                                    >
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {reportsPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={reportsPagination.page === 1}
                            onClick={() => setReportsPagination({ ...reportsPagination, page: reportsPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {reportsPagination.page} of {reportsPagination.pages}</span>
                          <button
                            disabled={reportsPagination.page === reportsPagination.pages}
                            onClick={() => setReportsPagination({ ...reportsPagination, page: reportsPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Spam Alerts */}
              {safetyTab === 'spam' && (
                <div className="admin-safety-content">
                  {loadingSpam ? (
                    <div className="admin-loading">Loading spam alerts...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Spam Score</th>
                              <th>Reports</th>
                              <th>Account Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {spamAlerts.map((user) => (
                              <tr key={user._id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {user.profile?.avatar && <img src={user.profile.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                    <div>
                                      <div>{user.username}</div>
                                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{user.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ background: user.spamScore >= 90 ? '#dc2626' : '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                    {user.spamScore}%
                                  </span>
                                </td>
                                <td>{user.reportCount || 0}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => handleUserStatusChange(user._id, 'suspended')}
                                      className="admin-btn admin-btn-secondary admin-btn-small"
                                    >
                                      Suspend
                                    </button>
                                    <button
                                      onClick={() => handleUserStatusChange(user._id, 'banned')}
                                      className="admin-btn admin-btn-danger admin-btn-small"
                                    >
                                      Ban
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {spamPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={spamPagination.page === 1}
                            onClick={() => setSpamPagination({ ...spamPagination, page: spamPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {spamPagination.page} of {spamPagination.pages}</span>
                          <button
                            disabled={spamPagination.page === spamPagination.pages}
                            onClick={() => setSpamPagination({ ...spamPagination, page: spamPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Child Safety */}
              {safetyTab === 'child-safety' && (
                <div className="admin-safety-content">
                  {loadingChildSafety ? (
                    <div className="admin-loading">Loading child safety data...</div>
                  ) : childSafety ? (
                    <>
                      <div style={{ marginBottom: '24px', padding: '16px', background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#d97706', fontSize: '18px', fontWeight: '700' }}>
                          ⚠️ Child Safety Violations
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{childSafety.reports?.length || 0}</div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>Active Reports</div>
                          </div>
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{childSafety.flaggedUsers?.length || 0}</div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>Flagged Users</div>
                          </div>
                          <div style={{ background: 'white', padding: '12px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{childSafety.flaggedVideos?.length || 0}</div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>Flagged Videos</div>
                          </div>
                        </div>
                      </div>

                      <h4 style={{ marginBottom: '16px' }}>Reports</h4>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Reason</th>
                              <th>Reporter</th>
                              <th>Reported User</th>
                              <th>Priority</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {childSafety.reports?.slice(0, 10).map((report) => (
                              <tr key={report._id}>
                                <td><strong style={{ color: '#dc2626' }}>CHILD SAFETY</strong></td>
                                <td>{report.reporter?.username || 'Unknown'}</td>
                                <td>{report.reportedUser?.username || 'N/A'}</td>
                                <td><span className="moderation-badge critical">{report.priority}</span></td>
                                <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <button
                                    onClick={() => viewReportDetails(report._id)}
                                    className="admin-btn admin-btn-secondary admin-btn-small"
                                  >
                                    Review
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>No child safety violations found</div>
                  )}
                </div>
              )}

              {/* Bot Detection */}
              {safetyTab === 'bot-detection' && (
                <div className="admin-safety-content">
                  {loadingBot ? (
                    <div className="admin-loading">Loading bot detection queue...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Bot Score</th>
                              <th>Spam Score</th>
                              <th>Reports</th>
                              <th>Created</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {botDetection.map((user) => (
                              <tr key={user._id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {user.profile?.avatar && <img src={user.profile.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                    <div>
                                      <div>{user.username}</div>
                                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{user.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ background: user.botScore >= 80 ? '#dc2626' : '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                    {user.botScore}%
                                  </span>
                                </td>
                                <td>{user.spamScore || 0}%</td>
                                <td>{user.reports?.length || 0}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => handleUserStatusChange(user._id, 'banned')}
                                      className="admin-btn admin-btn-danger admin-btn-small"
                                    >
                                      Ban Bot
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {botPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={botPagination.page === 1}
                            onClick={() => setBotPagination({ ...botPagination, page: botPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {botPagination.page} of {botPagination.pages}</span>
                          <button
                            disabled={botPagination.page === botPagination.pages}
                            onClick={() => setBotPagination({ ...botPagination, page: botPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Account Takeover Alerts */}
              {safetyTab === 'takeover' && (
                <div className="admin-safety-content">
                  {loadingTakeover ? (
                    <div className="admin-loading">Loading account takeover alerts...</div>
                  ) : (
                    <>
                      {takeoverAlerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>No unusual login alerts</div>
                      ) : (
                        <div className="admin-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>User</th>
                                <th>Risk Score</th>
                                <th>IP Address</th>
                                <th>Location</th>
                                <th>Timestamp</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {takeoverAlerts.map((alert, idx) => (
                                <tr key={`${alert.userId}-${idx}`}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {alert.avatar && <img src={alert.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                      <div>
                                        <div>{alert.username}</div>
                                        <div style={{ fontSize: '12px', color: '#6c757d' }}>{alert.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ background: alert.riskScore >= 8 ? '#dc2626' : alert.riskScore >= 5 ? '#f59e0b' : '#10b981', color: 'white', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                      {alert.riskScore}/10
                                    </span>
                                  </td>
                                  <td>{alert.ipAddress || 'N/A'}</td>
                                  <td>{alert.location || 'Unknown'}</td>
                                  <td>{new Date(alert.timestamp).toLocaleString()}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <button
                                        onClick={async () => {
                                          try {
                                            const response = await markTakeoverAlertReviewed(alert.userId, idx);
                                            if (response.success) {
                                              setToast({ type: 'success', message: 'Alert marked as reviewed' });
                                              fetchTakeoverAlerts();
                                            }
                                          } catch (error) {
                                            console.error('Error marking alert as reviewed:', error);
                                            setToast({ type: 'error', message: 'Failed to mark alert as reviewed' });
                                          }
                                        }}
                                        className="admin-btn admin-btn-secondary admin-btn-small"
                                      >
                                        Review
                                      </button>
                                      <button
                                        onClick={() => handleUserStatusChange(alert.userId, 'suspended')}
                                        className="admin-btn admin-btn-danger admin-btn-small"
                                      >
                                        Suspend
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {takeoverPagination.pages > 1 && (
                        <div className="admin-pagination">
                          <button
                            disabled={takeoverPagination.page === 1}
                            onClick={() => setTakeoverPagination({ ...takeoverPagination, page: takeoverPagination.page - 1 })}
                          >
                            Previous
                          </button>
                          <span>Page {takeoverPagination.page} of {takeoverPagination.pages}</span>
                          <button
                            disabled={takeoverPagination.page === takeoverPagination.pages}
                            onClick={() => setTakeoverPagination({ ...takeoverPagination, page: takeoverPagination.page + 1 })}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monetization Tab */}
      {activeTab === 'monetization' && (
        <div className="admin-monetization">
          {/* Monetization Dashboard */}
          {monetizationTab === 'dashboard' && (
            <div className="admin-monetization-content">
              {loadingMonetizationStats ? (
                <div className="admin-loading">Loading dashboard...</div>
              ) : monetizationStats ? (
                <>
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                      <h3>Total Creators</h3>
                      <p className="stat-value">{monetizationStats.totalCreators}</p>
                      <p className="stat-subtitle">{monetizationStats.approvedCreators} approved</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Total Earned</h3>
                      <p className="stat-value">${monetizationStats.totalEarned?.toLocaleString() || '0'}</p>
                      <p className="stat-subtitle">All time</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Total Withdrawn</h3>
                      <p className="stat-value">${monetizationStats.totalWithdrawn?.toLocaleString() || '0'}</p>
                      <p className="stat-subtitle">Completed</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Available Balance</h3>
                      <p className="stat-value">${monetizationStats.availableBalance?.toLocaleString() || '0'}</p>
                      <p className="stat-subtitle">Pending withdrawal</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Pending Withdrawals</h3>
                      <p className="stat-value">{monetizationStats.pendingWithdrawals || 0}</p>
                      <p className="stat-subtitle">Requests</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Active Brand Deals</h3>
                      <p className="stat-value">{monetizationStats.activeBrandDeals || 0}</p>
                      <p className="stat-subtitle">Campaigns</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="admin-error">Failed to load dashboard stats</div>
              )}
            </div>
          )}

          {/* Approved Creators */}
          {monetizationTab === 'creators' && (
            <div className="admin-monetization-content">
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="Search creators..."
                  value={creatorsSearch}
                  onChange={(e) => {
                    setCreatorsSearch(e.target.value);
                    setCreatorsPagination({ ...creatorsPagination, page: 1 });
                  }}
                  className="admin-search-input"
                />
                <select
                  value={creatorsStatus}
                  onChange={(e) => {
                    setCreatorsStatus(e.target.value);
                    setCreatorsPagination({ ...creatorsPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {loadingCreators ? (
                <div className="admin-loading">Loading creators...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Creator</th>
                          <th>Status</th>
                          <th>Total Earned</th>
                          <th>Available</th>
                          <th>Revenue Share</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creators.map((creator) => (
                          <tr key={creator._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {creator.profile?.avatar && <img src={creator.profile.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                <div>
                                  <div>{creator.username}</div>
                                  <div style={{ fontSize: '12px', color: '#6c757d' }}>{creator.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`moderation-badge ${creator.creatorStatus}`}>
                                {creator.creatorStatus}
                              </span>
                            </td>
                            <td>${(creator.creatorEarnings?.totalEarned || 0).toLocaleString()}</td>
                            <td>${(creator.creatorEarnings?.availableBalance || 0).toLocaleString()}</td>
                            <td>{creator.creatorEarnings?.adRevenueShare || 50}%</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {creator.creatorStatus === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateCreatorStatus(creator._id, 'approved')}
                                      className="admin-btn admin-btn-primary admin-btn-small"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateCreatorStatus(creator._id, 'rejected')}
                                      className="admin-btn admin-btn-danger admin-btn-small"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setSelectedCreator(creator)}
                                  className="admin-btn admin-btn-secondary admin-btn-small"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {creatorsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={creatorsPagination.page === 1}
                        onClick={() => setCreatorsPagination({ ...creatorsPagination, page: creatorsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {creatorsPagination.page} of {creatorsPagination.pages}</span>
                      <button
                        disabled={creatorsPagination.page === creatorsPagination.pages}
                        onClick={() => setCreatorsPagination({ ...creatorsPagination, page: creatorsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Ad Revenue Share Tracking */}
          {monetizationTab === 'ad-revenue' && (
            <div className="admin-monetization-content">
              {loadingAdRevenue ? (
                <div className="admin-loading">Loading ad revenue data...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Creator</th>
                          <th>Amount</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adRevenue.map((earning) => (
                          <tr key={earning._id}>
                            <td>{earning.user?.username || 'Unknown'}</td>
                            <td>${earning.amount?.toLocaleString() || '0'}</td>
                            <td>{earning.type?.replace('_', ' ').toUpperCase()}</td>
                            <td>
                              <span className={`moderation-badge ${earning.status}`}>
                                {earning.status}
                              </span>
                            </td>
                            <td>{new Date(earning.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {adRevenuePagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={adRevenuePagination.page === 1}
                        onClick={() => setAdRevenuePagination({ ...adRevenuePagination, page: adRevenuePagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {adRevenuePagination.page} of {adRevenuePagination.pages}</span>
                      <button
                        disabled={adRevenuePagination.page === adRevenuePagination.pages}
                        onClick={() => setAdRevenuePagination({ ...adRevenuePagination, page: adRevenuePagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Gifts & Coins Purchase Logs */}
          {monetizationTab === 'gifts-coins' && (
            <div className="admin-monetization-content">
              <div className="admin-filters">
                <select
                  value={giftsCoinsType}
                  onChange={(e) => {
                    setGiftsCoinsType(e.target.value);
                    setGiftsCoinsPagination({ ...giftsCoinsPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All</option>
                  <option value="gifts">Gifts</option>
                  <option value="coins">Coins</option>
                </select>
              </div>

              {loadingGiftsCoins ? (
                <div className="admin-loading">Loading purchase logs...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {giftsCoins.map((purchase) => (
                          <tr key={purchase._id}>
                            <td>{purchase.user?.username || 'Unknown'}</td>
                            <td>{purchase.type?.toUpperCase()}</td>
                            <td>${purchase.amount?.toLocaleString() || '0'}</td>
                            <td>
                              <span className={`moderation-badge ${purchase.status}`}>
                                {purchase.status}
                              </span>
                            </td>
                            <td>{new Date(purchase.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {giftsCoinsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={giftsCoinsPagination.page === 1}
                        onClick={() => setGiftsCoinsPagination({ ...giftsCoinsPagination, page: giftsCoinsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {giftsCoinsPagination.page} of {giftsCoinsPagination.pages}</span>
                      <button
                        disabled={giftsCoinsPagination.page === giftsCoinsPagination.pages}
                        onClick={() => setGiftsCoinsPagination({ ...giftsCoinsPagination, page: giftsCoinsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Withdrawal Requests */}
          {monetizationTab === 'withdrawals' && (
            <div className="admin-monetization-content">
              <div className="admin-filters">
                <select
                  value={withdrawalsStatus}
                  onChange={(e) => {
                    setWithdrawalsStatus(e.target.value);
                    setWithdrawalsPagination({ ...withdrawalsPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>

              {loadingWithdrawals ? (
                <div className="admin-loading">Loading withdrawal requests...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Creator</th>
                          <th>Amount</th>
                          <th>Payment Method</th>
                          <th>Status</th>
                          <th>Requested</th>
                          <th>Tax Doc</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((withdrawal) => (
                          <tr key={withdrawal._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {withdrawal.user?.profile?.avatar && <img src={withdrawal.user.profile.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                <div>
                                  <div>{withdrawal.user?.username || 'Unknown'}</div>
                                  <div style={{ fontSize: '12px', color: '#6c757d' }}>{withdrawal.user?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>${withdrawal.amount?.toLocaleString() || '0'}</td>
                            <td>{withdrawal.paymentMethod?.replace('_', ' ').toUpperCase()}</td>
                            <td>
                              <span className={`moderation-badge ${withdrawal.status}`}>
                                {withdrawal.status}
                              </span>
                            </td>
                            <td>{new Date(withdrawal.requestedAt).toLocaleDateString()}</td>
                            <td>
                              {withdrawal.taxDocumentRequired ? (
                                withdrawal.taxDocument?.verified ? (
                                  <span style={{ color: '#10b981', fontSize: '12px' }}>✓ Verified</span>
                                ) : (
                                  <span style={{ color: '#f59e0b', fontSize: '12px' }}>⚠ Required</span>
                                )
                              ) : (
                                <span style={{ color: '#6c757d', fontSize: '12px' }}>N/A</span>
                              )}
                            </td>
                            <td>
                              {withdrawal.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => setSelectedWithdrawal(withdrawal)}
                                    className="admin-btn admin-btn-primary admin-btn-small"
                                  >
                                    Review
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {withdrawalsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={withdrawalsPagination.page === 1}
                        onClick={() => setWithdrawalsPagination({ ...withdrawalsPagination, page: withdrawalsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {withdrawalsPagination.page} of {withdrawalsPagination.pages}</span>
                      <button
                        disabled={withdrawalsPagination.page === withdrawalsPagination.pages}
                        onClick={() => setWithdrawalsPagination({ ...withdrawalsPagination, page: withdrawalsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tax Documents */}
          {monetizationTab === 'tax-documents' && (
            <div className="admin-monetization-content">
              <div className="admin-filters">
                <select
                  value={taxDocumentsVerified}
                  onChange={(e) => {
                    setTaxDocumentsVerified(e.target.value);
                    setTaxDocumentsPagination({ ...taxDocumentsPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                </select>
              </div>

              {loadingTaxDocuments ? (
                <div className="admin-loading">Loading tax documents...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Creator</th>
                          <th>Documents</th>
                          <th>Status</th>
                          <th>Uploaded</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxDocuments.map((user) => (
                          <tr key={user._id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {user.profile?.avatar && <img src={user.profile.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
                                <div>
                                  <div>{user.username}</div>
                                  <div style={{ fontSize: '12px', color: '#6c757d' }}>{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              {user.taxInfo?.documents?.map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '4px' }}>
                                  <span style={{ fontSize: '12px' }}>{doc.type || 'Document'}</span>
                                  {doc.verified && <span style={{ marginLeft: '8px', color: '#10b981', fontSize: '11px' }}>✓</span>}
                                </div>
                              ))}
                            </td>
                            <td>
                              {user.taxInfo?.documents?.some(d => d.verified) ? (
                                <span style={{ color: '#10b981', fontSize: '12px' }}>Verified</span>
                              ) : (
                                <span style={{ color: '#f59e0b', fontSize: '12px' }}>Pending</span>
                              )}
                            </td>
                            <td>
                              {user.taxInfo?.documents?.[0]?.uploadedAt ? new Date(user.taxInfo.documents[0].uploadedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td>
                              {user.taxInfo?.documents?.map((doc, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleVerifyTaxDocument(user._id, idx, !doc.verified)}
                                  className="admin-btn admin-btn-secondary admin-btn-small"
                                  style={{ marginRight: '4px', marginBottom: '4px' }}
                                >
                                  {doc.verified ? 'Unverify' : 'Verify'}
                                </button>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {taxDocumentsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={taxDocumentsPagination.page === 1}
                        onClick={() => setTaxDocumentsPagination({ ...taxDocumentsPagination, page: taxDocumentsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {taxDocumentsPagination.page} of {taxDocumentsPagination.pages}</span>
                      <button
                        disabled={taxDocumentsPagination.page === taxDocumentsPagination.pages}
                        onClick={() => setTaxDocumentsPagination({ ...taxDocumentsPagination, page: taxDocumentsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Brand Deals & Campaigns */}
          {monetizationTab === 'brand-deals' && (
            <div className="admin-monetization-content">
              <div className="admin-filters">
                <select
                  value={brandDealsStatus}
                  onChange={(e) => {
                    setBrandDealsStatus(e.target.value);
                    setBrandDealsPagination({ ...brandDealsPagination, page: 1 });
                  }}
                  className="admin-filter-select"
                >
                  <option value="all">All</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {loadingBrandDeals ? (
                <div className="admin-loading">Loading brand deals...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Creator</th>
                          <th>Brand</th>
                          <th>Campaign</th>
                          <th>Budget</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brandDeals.map((deal) => (
                          <tr key={deal._id}>
                            <td>{deal.creator?.username || 'Unknown'}</td>
                            <td>{deal.brand?.name || 'N/A'}</td>
                            <td>{deal.campaign?.name || 'N/A'}</td>
                            <td>${deal.campaign?.budget?.toLocaleString() || '0'}</td>
                            <td>
                              <span className={`moderation-badge ${deal.status}`}>
                                {deal.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td>{deal.campaign?.startDate ? new Date(deal.campaign.startDate).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              {deal.status === 'pending_approval' && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => handleUpdateBrandDealStatus(deal._id, 'approved')}
                                    className="admin-btn admin-btn-primary admin-btn-small"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateBrandDealStatus(deal._id, 'rejected', 'Rejected by admin')}
                                    className="admin-btn admin-btn-danger admin-btn-small"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {brandDealsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={brandDealsPagination.page === 1}
                        onClick={() => setBrandDealsPagination({ ...brandDealsPagination, page: brandDealsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {brandDealsPagination.page} of {brandDealsPagination.pages}</span>
                      <button
                        disabled={brandDealsPagination.page === brandDealsPagination.pages}
                        onClick={() => setBrandDealsPagination({ ...brandDealsPagination, page: brandDealsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Review Modal */}
      {selectedWithdrawal && (
        <div className="admin-modal-overlay" onClick={() => setSelectedWithdrawal(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="admin-modal-header">
              <h3>Review Withdrawal Request</h3>
              <button className="admin-panel-close" onClick={() => setSelectedWithdrawal(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong>Creator:</strong> {selectedWithdrawal.user?.username || 'Unknown'} ({selectedWithdrawal.user?.email})
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Amount:</strong> ${selectedWithdrawal.amount?.toLocaleString() || '0'} {selectedWithdrawal.currency}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Payment Method:</strong> {selectedWithdrawal.paymentMethod?.replace('_', ' ').toUpperCase()}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Payment Details:</strong>
                <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '6px', fontSize: '13px' }}>
                  {selectedWithdrawal.paymentMethod === 'bank_transfer' && (
                    <>
                      <div>Bank: {selectedWithdrawal.paymentDetails?.bankName || 'N/A'}</div>
                      <div>Account: {selectedWithdrawal.paymentDetails?.accountNumber || 'N/A'}</div>
                    </>
                  )}
                  {selectedWithdrawal.paymentMethod === 'paypal' && (
                    <div>Email: {selectedWithdrawal.paymentDetails?.paypalEmail || 'N/A'}</div>
                  )}
                  {selectedWithdrawal.paymentMethod === 'crypto' && (
                    <>
                      <div>Type: {selectedWithdrawal.paymentDetails?.cryptoType || 'N/A'}</div>
                      <div>Address: {selectedWithdrawal.paymentDetails?.cryptoAddress || 'N/A'}</div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Tax Document:</strong>
                {selectedWithdrawal.taxDocumentRequired ? (
                  selectedWithdrawal.taxDocument?.verified ? (
                    <span style={{ marginLeft: '8px', color: '#10b981' }}>✓ Verified</span>
                  ) : (
                    <span style={{ marginLeft: '8px', color: '#f59e0b' }}>⚠ Required</span>
                  )
                ) : (
                  <span style={{ marginLeft: '8px', color: '#6c757d' }}>Not required</span>
                )}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Requested:</strong> {new Date(selectedWithdrawal.requestedAt).toLocaleString()}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                onClick={() => {
                  const transactionId = prompt('Enter transaction ID (optional):');
                  handleApproveWithdrawal(selectedWithdrawal._id, '', transactionId);
                }}
                className="admin-btn admin-btn-primary"
                disabled={selectedWithdrawal.taxDocumentRequired && !selectedWithdrawal.taxDocument?.verified}
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) {
                    handleRejectWithdrawal(selectedWithdrawal._id, reason);
                  }
                }}
                className="admin-btn admin-btn-danger"
              >
                Reject
              </button>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="admin-analytics">
          {/* Analytics Overview */}
          {analyticsTab === 'overview' && (
            <div className="admin-analytics-content">
              {loadingAnalyticsDashboard ? (
                <div className="admin-loading">Loading analytics dashboard...</div>
              ) : analyticsDashboard ? (
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <h3>Daily Active Users</h3>
                    <p className="stat-value">{analyticsDashboard.dau?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="admin-stat-card">
                    <h3>Weekly Active Users</h3>
                    <p className="stat-value">{analyticsDashboard.wau?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="admin-stat-card">
                    <h3>Monthly Active Users</h3>
                    <p className="stat-value">{analyticsDashboard.mau?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="admin-stat-card">
                    <h3>Total Users</h3>
                    <p className="stat-value">{analyticsDashboard.totalUsers?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="admin-stat-card">
                    <h3>Total Videos</h3>
                    <p className="stat-value">{analyticsDashboard.totalVideos?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="admin-stat-card">
                    <h3>Total Views</h3>
                    <p className="stat-value">{analyticsDashboard.totalViews?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              ) : (
                <div className="admin-error">Failed to load analytics dashboard</div>
              )}
            </div>
          )}

          {/* Active Users */}
          {analyticsTab === 'active-users' && (
            <div className="admin-analytics-content">
              <div className="admin-filters">
                <select
                  value={activeUsersPeriod}
                  onChange={(e) => {
                    setActiveUsersPeriod(e.target.value);
                  }}
                  className="admin-filter-select"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>

              {loadingActiveUsers ? (
                <div className="admin-loading">Loading active users...</div>
              ) : activeUsersData ? (
                <>
                  <div className="admin-stat-card" style={{ marginBottom: '20px' }}>
                    <h3>Active Users ({activeUsersPeriod})</h3>
                    <p className="stat-value">{activeUsersData.activeUsers?.toLocaleString() || '0'}</p>
                  </div>
                  {activeUsersData.historicalData && activeUsersData.historicalData.length > 0 && (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Active Users</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeUsersData.historicalData.slice(-30).map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.date}</td>
                              <td>{item.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <div className="admin-error">Failed to load active users data</div>
              )}
            </div>
          )}

          {/* Retention */}
          {analyticsTab === 'retention' && (
            <div className="admin-analytics-content">
              {loadingRetention ? (
                <div className="admin-loading">Loading retention data...</div>
              ) : retentionData ? (
                <>
                  <div className="admin-stats-grid" style={{ marginBottom: '20px' }}>
                    <div className="admin-stat-card">
                      <h3>Avg Day 1 Retention</h3>
                      <p className="stat-value">{retentionData.avgRetention?.day1 || '0'}%</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Avg Day 7 Retention</h3>
                      <p className="stat-value">{retentionData.avgRetention?.day7 || '0'}%</p>
                    </div>
                    <div className="admin-stat-card">
                      <h3>Avg Day 30 Retention</h3>
                      <p className="stat-value">{retentionData.avgRetention?.day30 || '0'}%</p>
                    </div>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Cohort Date</th>
                          <th>Cohort Size</th>
                          <th>Day 1 %</th>
                          <th>Day 7 %</th>
                          <th>Day 30 %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retentionData.retentionData?.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.cohortDate}</td>
                            <td>{item.cohortSize}</td>
                            <td>{item.day1}%</td>
                            <td>{item.day7}%</td>
                            <td>{item.day30}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="admin-error">Failed to load retention data</div>
              )}
            </div>
          )}

          {/* Video Completion Rate */}
          {analyticsTab === 'completion' && (
            <div className="admin-analytics-content">
              {loadingCompletion ? (
                <div className="admin-loading">Loading completion data...</div>
              ) : completionData ? (
                <>
                  <div className="admin-stat-card" style={{ marginBottom: '20px' }}>
                    <h3>Average Completion Rate</h3>
                    <p className="stat-value">{completionData.completionStats?.averageCompletion || '0'}%</p>
                    <p className="stat-subtitle">Based on {completionData.totalVideos || 0} videos</p>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>Drop Points</h4>
                  <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Completion Range</th>
                          <th>Number of Videos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completionData.completionStats?.dropPoints && Object.entries(completionData.completionStats.dropPoints).map(([range, count]) => (
                          <tr key={range}>
                            <td>{range}%</td>
                            <td>{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>By Category</h4>
                  <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Avg Completion %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completionData.completionStats?.byCategory && Object.entries(completionData.completionStats.byCategory).map(([cat, rate]) => (
                          <tr key={cat}>
                            <td>{cat.toUpperCase()}</td>
                            <td>{typeof rate === 'object' ? rate : rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>By Duration</h4>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Duration Range (seconds)</th>
                          <th>Avg Completion %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completionData.completionStats?.byDuration && Object.entries(completionData.completionStats.byDuration).map(([range, rate]) => (
                          <tr key={range}>
                            <td>{range}</td>
                            <td>{typeof rate === 'object' ? rate : rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="admin-error">Failed to load completion data</div>
              )}
            </div>
          )}

          {/* Trending Hashtags */}
          {analyticsTab === 'hashtags' && (
            <div className="admin-analytics-content">
              <div className="admin-filters">
                <select
                  value={trendingPeriod}
                  onChange={(e) => {
                    setTrendingPeriod(e.target.value);
                  }}
                  className="admin-filter-select"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              {loadingTrending ? (
                <div className="admin-loading">Loading trending hashtags...</div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Hashtag</th>
                        <th>Videos</th>
                        <th>Total Views</th>
                        <th>Avg Views</th>
                        <th>Total Likes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendingHashtags.map((tag, idx) => (
                        <tr key={idx}>
                          <td>#{idx + 1}</td>
                          <td><strong>#{tag.name}</strong></td>
                          <td>{tag.count}</td>
                          <td>{tag.totalViews?.toLocaleString() || '0'}</td>
                          <td>{tag.avgViews?.toLocaleString() || '0'}</td>
                          <td>{tag.totalLikes?.toLocaleString() || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Category Performance */}
          {analyticsTab === 'categories' && (
            <div className="admin-analytics-content">
              {loadingCategory ? (
                <div className="admin-loading">Loading category performance...</div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Videos</th>
                        <th>Total Views</th>
                        <th>Avg Views</th>
                        <th>Total Likes</th>
                        <th>Engagement %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryPerformance.map((cat, idx) => (
                        <tr key={idx}>
                          <td><strong>{cat.category.toUpperCase()}</strong></td>
                          <td>{cat.videoCount}</td>
                          <td>{cat.totalViews?.toLocaleString() || '0'}</td>
                          <td>{cat.avgViews?.toLocaleString() || '0'}</td>
                          <td>{cat.totalLikes?.toLocaleString() || '0'}</td>
                          <td>{cat.engagementRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Region Growth */}
          {analyticsTab === 'regions' && (
            <div className="admin-analytics-content">
              {loadingRegion ? (
                <div className="admin-loading">Loading region growth...</div>
              ) : regionGrowth ? (
                <>
                  <div className="admin-stat-card" style={{ marginBottom: '20px' }}>
                    <h3>Total Regions</h3>
                    <p className="stat-value">{regionGrowth.totalRegions || '0'}</p>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Region</th>
                          <th>Total Users</th>
                          <th>Growth Rate (per day)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regionGrowth.regionStats?.map((region, idx) => (
                          <tr key={idx}>
                            <td><strong>{region.country}</strong></td>
                            <td>{region.totalUsers?.toLocaleString() || '0'}</td>
                            <td>{region.growthRate?.toFixed(2) || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="admin-error">Failed to load region growth data</div>
              )}
            </div>
          )}

          {/* Device & Network Stats */}
          {analyticsTab === 'devices' && (
            <div className="admin-analytics-content">
              {loadingDeviceNetwork ? (
                <div className="admin-loading">Loading device/network stats...</div>
              ) : deviceNetworkStats ? (
                <>
                  <h4 style={{ marginBottom: '12px' }}>Device Types</h4>
                  <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Device Type</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceNetworkStats.devices?.map((device, idx) => (
                          <tr key={idx}>
                            <td>{device.name}</td>
                            <td>{device.count?.toLocaleString() || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>Operating Systems</h4>
                  <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>OS</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceNetworkStats.os?.map((os, idx) => (
                          <tr key={idx}>
                            <td>{os.name}</td>
                            <td>{os.count?.toLocaleString() || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>Browsers</h4>
                  <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Browser</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceNetworkStats.browsers?.map((browser, idx) => (
                          <tr key={idx}>
                            <td>{browser.name}</td>
                            <td>{browser.count?.toLocaleString() || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 style={{ marginBottom: '12px' }}>Networks</h4>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Network</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceNetworkStats.networks?.map((network, idx) => (
                          <tr key={idx}>
                            <td>{network.name}</td>
                            <td>{network.count?.toLocaleString() || '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="admin-error">Failed to load device/network stats</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Recommendation Control Tab */}
      {activeTab === 'search' && (
        <div className="admin-search">
          {/* Blacklist */}
          {searchTab === 'blacklist' && (
            <div className="admin-search-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="admin-filters">
                  <select
                    value={blacklistType}
                    onChange={(e) => {
                      setBlacklistType(e.target.value);
                      setBlacklistPagination({ ...blacklistPagination, page: 1 });
                    }}
                    className="admin-filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="word">Word</option>
                    <option value="hashtag">Hashtag</option>
                    <option value="username">Username</option>
                    <option value="domain">Domain</option>
                  </select>
                  <select
                    value={blacklistActive}
                    onChange={(e) => {
                      setBlacklistActive(e.target.value);
                      setBlacklistPagination({ ...blacklistPagination, page: 1 });
                    }}
                    className="admin-filter-select"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowBlacklistModal(true)}
                  className="admin-btn admin-btn-primary"
                >
                  + Add Blacklist Item
                </button>
              </div>

              {loadingBlacklist ? (
                <div className="admin-loading">Loading blacklist...</div>
              ) : blacklistItems.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No blacklist items found.</p>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    Click "+ Add Blacklist Item" to add your first item.
                  </p>
                </div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Value</th>
                          <th>Severity</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Added By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blacklistItems.map((item) => (
                          <tr key={item._id}>
                            <td>{item.type}</td>
                            <td><strong>{item.value}</strong></td>
                            <td>
                              <span className={`moderation-badge ${item.severity}`}>
                                {item.severity}
                              </span>
                            </td>
                            <td>{item.reason || 'N/A'}</td>
                            <td>
                              <span className={`moderation-badge ${item.active ? 'approved' : 'rejected'}`}>
                                {item.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>{item.addedBy?.username || 'Unknown'}</td>
                            <td>
                              <div className="admin-action-buttons">
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateBlacklistItem(item._id, { active: !item.active });
                                      setToast({ type: 'success', message: 'Updated' });
                                      fetchBlacklist();
                                    } catch (error) {
                                      setToast({ type: 'error', message: 'Failed to update' });
                                    }
                                  }}
                                  className="admin-btn admin-btn-secondary admin-btn-small"
                                >
                                  {item.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Delete this blacklist item?')) {
                                      try {
                                        await deleteBlacklistItem(item._id);
                                        setToast({ type: 'success', message: 'Item deleted' });
                                        fetchBlacklist();
                                      } catch (error) {
                                        setToast({ type: 'error', message: 'Failed to delete' });
                                      }
                                    }
                                  }}
                                  className="admin-btn admin-btn-danger admin-btn-small"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {blacklistPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={blacklistPagination.page === 1}
                        onClick={() => setBlacklistPagination({ ...blacklistPagination, page: blacklistPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {blacklistPagination.page} of {blacklistPagination.pages}</span>
                      <button
                        disabled={blacklistPagination.page === blacklistPagination.pages}
                        onClick={() => setBlacklistPagination({ ...blacklistPagination, page: blacklistPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Boosted Content */}
          {searchTab === 'boosted' && (
            <div className="admin-search-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="admin-filters">
                  <select
                    value={boostedType}
                    onChange={(e) => {
                      setBoostedType(e.target.value);
                      setBoostedPagination({ ...boostedPagination, page: 1 });
                    }}
                    className="admin-filter-select"
                  >
                    <option value="all">All Types</option>
                    <option value="video">Video</option>
                    <option value="hashtag">Hashtag</option>
                    <option value="user">User</option>
                    <option value="trend">Trend</option>
                  </select>
                  <select
                    value={boostedActive}
                    onChange={(e) => {
                      setBoostedActive(e.target.value);
                      setBoostedPagination({ ...boostedPagination, page: 1 });
                    }}
                    className="admin-filter-select"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowBoostModal(true)}
                  className="admin-btn admin-btn-primary"
                >
                  + Boost Content
                </button>
              </div>

              {loadingBoosted ? (
                <div className="admin-loading">Loading boosted content...</div>
              ) : boostedContent.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No boosted content found.</p>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    Click "+ Boost Content" to boost your first content.
                  </p>
                </div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Content ID</th>
                          <th>Boost Type</th>
                          <th>Boost Level</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boostedContent.map((item) => (
                          <tr key={item._id}>
                            <td>{item.contentType}</td>
                            <td>{item.contentId?.toString().slice(-8) || 'N/A'}</td>
                            <td>{item.boostType}</td>
                            <td>{item.boostLevel}x</td>
                            <td>{item.priority}/10</td>
                            <td>
                              <span className={`moderation-badge ${item.active ? 'approved' : 'rejected'}`}>
                                {item.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="admin-action-buttons">
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateBoostedContent(item._id, { active: !item.active });
                                      setToast({ type: 'success', message: 'Updated' });
                                      fetchBoostedContent();
                                    } catch (error) {
                                      setToast({ type: 'error', message: 'Failed to update' });
                                    }
                                  }}
                                  className="admin-btn admin-btn-secondary admin-btn-small"
                                >
                                  {item.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Delete this boosted content?')) {
                                      try {
                                        await downrankContent({ contentId: item.contentId, contentType: item.contentType });
                                        setToast({ type: 'success', message: 'Content downranked' });
                                        fetchBoostedContent();
                                      } catch (error) {
                                        setToast({ type: 'error', message: 'Failed to downrank' });
                                      }
                                    }
                                  }}
                                  className="admin-btn admin-btn-danger admin-btn-small"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {boostedPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={boostedPagination.page === 1}
                        onClick={() => setBoostedPagination({ ...boostedPagination, page: boostedPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {boostedPagination.page} of {boostedPagination.pages}</span>
                      <button
                        disabled={boostedPagination.page === boostedPagination.pages}
                        onClick={() => setBoostedPagination({ ...boostedPagination, page: boostedPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Hashtag Controls */}
          {searchTab === 'hashtags' && (
            <div className="admin-search-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="admin-filters">
                  <select
                    value={hashtagVisibility}
                    onChange={(e) => {
                      setHashtagVisibility(e.target.value);
                      setHashtagPagination({ ...hashtagPagination, page: 1 });
                    }}
                    className="admin-filter-select"
                  >
                    <option value="all">All</option>
                    <option value="visible">Visible</option>
                    <option value="hidden">Hidden</option>
                    <option value="restricted">Restricted</option>
                    <option value="trending">Trending</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setSelectedContent(null);
                    setShowHashtagModal(true);
                  }}
                  className="admin-btn admin-btn-primary"
                >
                  + Control Hashtag
                </button>
              </div>

              {loadingHashtags ? (
                <div className="admin-loading">Loading hashtag controls...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Hashtag</th>
                          <th>Visibility</th>
                          <th>Boost Level</th>
                          <th>Searchable</th>
                          <th>Trending</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hashtagControls.map((control) => (
                          <tr key={control._id}>
                            <td><strong>#{control.hashtag}</strong></td>
                            <td>
                              <span className={`moderation-badge ${control.visibility}`}>
                                {control.visibility}
                              </span>
                            </td>
                            <td>{control.boostLevel}x</td>
                            <td>{control.searchable ? '✓' : '✗'}</td>
                            <td>{control.trending ? '✓' : '✗'}</td>
                            <td>
                              <button
                                onClick={() => {
                                  setSelectedContent(control);
                                  setShowHashtagModal(true);
                                }}
                                className="admin-btn admin-btn-secondary admin-btn-small"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {hashtagPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={hashtagPagination.page === 1}
                        onClick={() => setHashtagPagination({ ...hashtagPagination, page: hashtagPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {hashtagPagination.page} of {hashtagPagination.pages}</span>
                      <button
                        disabled={hashtagPagination.page === hashtagPagination.pages}
                        onClick={() => setHashtagPagination({ ...hashtagPagination, page: hashtagPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* A/B Tests */}
          {searchTab === 'ab-tests' && (
            <div className="admin-search-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div className="admin-filters">
                  <select
                    value={abTestStatus}
                    onChange={(e) => {
                      setAbTestStatus(e.target.value);
                      setAbTestsPagination({ ...abTestsPagination, page: 1 });
                    }}
                    className="admin-filter-select"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setSelectedContent(null);
                    setShowABTestModal(true);
                  }}
                  className="admin-btn admin-btn-primary"
                >
                  + Create A/B Test
                </button>
              </div>

              {loadingABTests ? (
                <div className="admin-loading">Loading A/B tests...</div>
              ) : (
                <>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Groups</th>
                          <th>Users</th>
                          <th>Start Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abTests.map((test) => (
                          <tr key={test._id}>
                            <td><strong>{test.name}</strong></td>
                            <td>{test.type?.replace('_', ' ')}</td>
                            <td>
                              <span className={`moderation-badge ${test.status}`}>
                                {test.status}
                              </span>
                            </td>
                            <td>{test.groups?.length || 0}</td>
                            <td>{test.metrics?.totalUsers || 0}</td>
                            <td>{test.startDate ? new Date(test.startDate).toLocaleDateString() : 'Not started'}</td>
                            <td>
                              <button
                                onClick={() => {
                                  setSelectedContent(test);
                                  setShowABTestModal(true);
                                }}
                                className="admin-btn admin-btn-secondary admin-btn-small"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {abTestsPagination.pages > 1 && (
                    <div className="admin-pagination">
                      <button
                        disabled={abTestsPagination.page === 1}
                        onClick={() => setAbTestsPagination({ ...abTestsPagination, page: abTestsPagination.page - 1 })}
                      >
                        Previous
                      </button>
                      <span>Page {abTestsPagination.page} of {abTestsPagination.pages}</span>
                      <button
                        disabled={abTestsPagination.page === abTestsPagination.pages}
                        onClick={() => setAbTestsPagination({ ...abTestsPagination, page: abTestsPagination.page + 1 })}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

          {/* Technical System Control Tab */}
          {activeTab === 'system' && (
            <div className="admin-system">
              {/* Video Processing */}
              {systemTab === 'video-processing' && (
                <div className="admin-system-content">
                  {videoProcessingStats && (
                    <div className="admin-dashboard-stats" style={{ marginBottom: '20px' }}>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{videoProcessingStats.stats?.pending || 0}</div>
                        <div className="admin-stat-label">Pending</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{videoProcessingStats.stats?.processing || 0}</div>
                        <div className="admin-stat-label">Processing</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{videoProcessingStats.stats?.completed || 0}</div>
                        <div className="admin-stat-label">Completed</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{videoProcessingStats.stats?.failed || 0}</div>
                        <div className="admin-stat-label">Failed</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="admin-filters" style={{ marginBottom: '20px' }}>
                    <select
                      value={videoProcessingStatus}
                      onChange={(e) => {
                        setVideoProcessingStatus(e.target.value);
                        setVideoProcessingPagination({ ...videoProcessingPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {loadingVideoProcessing ? (
                    <div className="admin-loading">Loading video processing status...</div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Video ID</th>
                            <th>User</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Stage</th>
                            <th>File Size</th>
                            <th>Started</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {videoProcessing.length === 0 ? (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No video processing records found</td>
                            </tr>
                          ) : (
                            videoProcessing.map((proc) => (
                              <tr key={proc._id}>
                                <td>{proc.videoId?.title?.substring(0, 30) || proc.videoId?._id || 'N/A'}</td>
                                <td>{proc.userId?.username || 'Unknown'}</td>
                                <td>
                                  <span className={`moderation-badge ${proc.status}`}>{proc.status}</span>
                                </td>
                                <td>{proc.uploadProgress}%</td>
                                <td>{proc.processingStage || 'N/A'}</td>
                                <td>{(proc.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                                <td>{new Date(proc.startedAt).toLocaleString()}</td>
                                <td>
                                  <button
                                    onClick={() => {
                                      setSelectedErrorLog(proc);
                                    }}
                                    className="admin-btn admin-btn-secondary"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* CDN Health */}
              {systemTab === 'cdn-health' && (
                <div className="admin-system-content">
                  {loadingCDN ? (
                    <div className="admin-loading">Loading CDN health...</div>
                  ) : (
                    <>
                      <div className="admin-dashboard-stats" style={{ marginBottom: '20px' }}>
                        {cdnHealth.map((cdn) => (
                          <div key={cdn._id} className="admin-stat-card">
                            <div className="admin-stat-value">{cdn.cdnProvider}</div>
                            <div className="admin-stat-label">{cdn.status}</div>
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                              Latency: {cdn.qualityMetrics?.averageLatency || 0}ms
                              <br />
                              Quality Drops: {cdn.videoQuality?.qualityDropCount || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {cdnQualityDrop.length > 0 && (
                        <div className="admin-table-container">
                          <h3 style={{ marginBottom: '16px' }}>Quality Drop Issues</h3>
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Provider</th>
                                <th>Region</th>
                                <th>Drop Count</th>
                                <th>Average Latency</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cdnQualityDrop.map((drop) => (
                                <tr key={drop._id}>
                                  <td>{drop.cdnProvider}</td>
                                  <td>{drop.region}</td>
                                  <td>{drop.videoQuality?.qualityDropCount || 0}</td>
                                  <td>{drop.qualityMetrics?.averageLatency || 0}ms</td>
                                  <td>
                                    <span className={`moderation-badge ${drop.status}`}>{drop.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Server Health */}
              {systemTab === 'server-health' && (
                <div className="admin-system-content">
                  <div className="admin-filters" style={{ marginBottom: '20px' }}>
                    <select
                      value={serverMetricsPeriod}
                      onChange={(e) => {
                        setServerMetricsPeriod(e.target.value);
                        fetchServerMetrics();
                      }}
                      className="admin-filter-select"
                    >
                      <option value="1h">Last Hour</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                    </select>
                  </div>

                  {loadingServer ? (
                    <div className="admin-loading">Loading server health...</div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Server</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>CPU</th>
                            <th>Memory</th>
                            <th>Disk</th>
                            <th>Response Time</th>
                            <th>Requests/sec</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serverHealth.length === 0 ? (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No server data available</td>
                            </tr>
                          ) : (
                            serverHealth.map((server) => (
                              <tr key={server._id}>
                                <td>{server.serverName}</td>
                                <td>{server.serverType}</td>
                                <td>
                                  <span className={`moderation-badge ${server.status}`}>{server.status}</span>
                                </td>
                                <td>{server.cpu?.usage?.toFixed(1) || 0}%</td>
                                <td>{server.memory?.usage?.toFixed(1) || 0}%</td>
                                <td>{server.disk?.usage?.toFixed(1) || 0}%</td>
                                <td>{server.responseTime?.average?.toFixed(0) || 0}ms</td>
                                <td>{server.traffic?.requestsPerSecond?.toFixed(1) || 0}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Error Logs */}
              {systemTab === 'error-logs' && (
                <div className="admin-system-content">
                  {crashStats && (
                    <div className="admin-dashboard-stats" style={{ marginBottom: '20px' }}>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{crashStats.crashStats?.totalCrashes || 0}</div>
                        <div className="admin-stat-label">Total Crashes</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{crashStats.crashStats?.uniqueErrors || 0}</div>
                        <div className="admin-stat-label">Unique Errors</div>
                      </div>
                    </div>
                  )}

                  <div className="admin-filters" style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select
                      value={errorLogLevel}
                      onChange={(e) => {
                        setErrorLogLevel(e.target.value);
                        setErrorLogsPagination({ ...errorLogsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Levels</option>
                      <option value="error">Error</option>
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                    </select>
                    <select
                      value={errorLogType}
                      onChange={(e) => {
                        setErrorLogType(e.target.value);
                        setErrorLogsPagination({ ...errorLogsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Types</option>
                      <option value="app-crash">App Crash</option>
                      <option value="api-error">API Error</option>
                      <option value="database-error">Database Error</option>
                    </select>
                    <select
                      value={errorLogSeverity}
                      onChange={(e) => {
                        setErrorLogSeverity(e.target.value);
                        setErrorLogsPagination({ ...errorLogsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <select
                      value={errorLogResolved}
                      onChange={(e) => {
                        setErrorLogResolved(e.target.value);
                        setErrorLogsPagination({ ...errorLogsPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="false">Unresolved</option>
                      <option value="true">Resolved</option>
                      <option value="all">All</option>
                    </select>
                  </div>

                  {loadingErrorLogs ? (
                    <div className="admin-loading">Loading error logs...</div>
                  ) : (
                    <>
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Level</th>
                              <th>Type</th>
                              <th>Message</th>
                              <th>Severity</th>
                              <th>Occurrences</th>
                              <th>Last Occurred</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {errorLogs.length === 0 ? (
                              <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No error logs found</td>
                              </tr>
                            ) : (
                              errorLogs.map((error) => (
                                <tr key={error._id}>
                                  <td>
                                    <span className={`moderation-badge ${error.level}`}>{error.level}</span>
                                  </td>
                                  <td>{error.type}</td>
                                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {error.message}
                                  </td>
                                  <td>
                                    <span className={`moderation-badge ${error.severity}`}>{error.severity}</span>
                                  </td>
                                  <td>{error.occurrenceCount || 1}</td>
                                  <td>{new Date(error.lastOccurred).toLocaleString()}</td>
                                  <td>
                                    <span className={`moderation-badge ${error.resolved ? 'resolved' : 'unresolved'}`}>
                                      {error.resolved ? 'Resolved' : 'Unresolved'}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      onClick={() => setSelectedErrorLog(error)}
                                      className="admin-btn admin-btn-secondary"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {errorLogsPagination.total > errorLogsPagination.limit && (
                        <div className="admin-pagination">
                          <button
                            disabled={errorLogsPagination.page === 1}
                            onClick={() => setErrorLogsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          >
                            Previous
                          </button>
                          <span>Page {errorLogsPagination.page} of {Math.ceil(errorLogsPagination.total / errorLogsPagination.limit)}</span>
                          <button
                            disabled={errorLogsPagination.page >= Math.ceil(errorLogsPagination.total / errorLogsPagination.limit)}
                            onClick={() => setErrorLogsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* API Requests */}
              {systemTab === 'api-requests' && (
                <div className="admin-system-content">
                  {apiRequestStats && (
                    <div className="admin-dashboard-stats" style={{ marginBottom: '20px' }}>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">
                          {apiRequestStats.successRate?.total ? 
                            ((apiRequestStats.successRate.success / apiRequestStats.successRate.total) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="admin-stat-label">Success Rate</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{apiRequestStats.successRate?.avgResponseTime?.toFixed(0) || 0}ms</div>
                        <div className="admin-stat-label">Avg Response Time</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{apiRequestStats.successRate?.total || 0}</div>
                        <div className="admin-stat-label">Total Requests</div>
                      </div>
                      <div className="admin-stat-card">
                        <div className="admin-stat-value">{apiRequestStats.successRate?.failed || 0}</div>
                        <div className="admin-stat-label">Failed</div>
                      </div>
                    </div>
                  )}

                  <div className="admin-filters" style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Search endpoint..."
                      value={apiRequestEndpoint}
                      onChange={(e) => setApiRequestEndpoint(e.target.value)}
                      className="admin-filter-input"
                    />
                    <select
                      value={apiRequestMethod}
                      onChange={(e) => {
                        setApiRequestMethod(e.target.value);
                        setApiRequestPagination({ ...apiRequestPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Methods</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <select
                      value={apiRequestStatus}
                      onChange={(e) => {
                        setApiRequestStatus(e.target.value);
                        setApiRequestPagination({ ...apiRequestPagination, page: 1 });
                      }}
                      className="admin-filter-select"
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="error">Error</option>
                      <option value="timeout">Timeout</option>
                    </select>
                    <select
                      value={apiRequestPeriod}
                      onChange={(e) => {
                        setApiRequestPeriod(e.target.value);
                        fetchAPIRequestStats();
                      }}
                      className="admin-filter-select"
                    >
                      <option value="1h">Last Hour</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                    </select>
                  </div>

                  {loadingAPIRequests ? (
                    <div className="admin-loading">Loading API requests...</div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Endpoint</th>
                            <th>Method</th>
                            <th>Status</th>
                            <th>Response Time</th>
                            <th>User</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiRequests.length === 0 ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No API requests found</td>
                            </tr>
                          ) : (
                            apiRequests.map((req) => (
                              <tr key={req._id}>
                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {req.endpoint}
                                </td>
                                <td>{req.method}</td>
                                <td>
                                  <span className={`moderation-badge ${req.status}`}>{req.statusCode || req.status}</span>
                                </td>
                                <td>{req.responseTime}ms</td>
                                <td>{req.userId?.username || 'Anonymous'}</td>
                                <td>{new Date(req.timestamp).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Storage */}
              {systemTab === 'storage' && (
                <div className="admin-system-content">
                  {loadingStorage ? (
                    <div className="admin-loading">Loading storage data...</div>
                  ) : (
                    <>
                      <div className="admin-dashboard-stats" style={{ marginBottom: '20px' }}>
                        {storage.map((stor) => (
                          <div key={stor._id} className="admin-stat-card">
                            <div className="admin-stat-value">{stor.storageType}</div>
                            <div className="admin-stat-label">
                              {stor.utilization.toFixed(1)}% Used
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                              Used: {(stor.used).toFixed(2)} GB / {(stor.totalCapacity).toFixed(2)} GB
                              <br />
                              Available: {(stor.available).toFixed(2)} GB
                            </div>
                          </div>
                        ))}
                      </div>

                      {storageAlerts.length > 0 && (
                        <div className="admin-table-container" style={{ marginBottom: '20px' }}>
                          <h3 style={{ marginBottom: '16px' }}>Storage Alerts</h3>
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Storage</th>
                                <th>Alert Type</th>
                                <th>Severity</th>
                                <th>Message</th>
                                <th>Current Value</th>
                                <th>Threshold</th>
                              </tr>
                            </thead>
                            <tbody>
                              {storageAlerts.map((alert, idx) => (
                                <tr key={idx}>
                                  <td>{alert.storageType}</td>
                                  <td>{alert.type}</td>
                                  <td>
                                    <span className={`moderation-badge ${alert.severity}`}>{alert.severity}</span>
                                  </td>
                                  <td>{alert.message}</td>
                                  <td>{alert.currentValue}%</td>
                                  <td>{alert.threshold}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Storage Type</th>
                              <th>Total Capacity</th>
                              <th>Used</th>
                              <th>Available</th>
                              <th>Utilization</th>
                              <th>Files</th>
                              <th>Last Checked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storage.length === 0 ? (
                              <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No storage data available</td>
                              </tr>
                            ) : (
                              storage.map((stor) => (
                                <tr key={stor._id}>
                                  <td>{stor.storageType}</td>
                                  <td>{(stor.totalCapacity).toFixed(2)} GB</td>
                                  <td>{(stor.used).toFixed(2)} GB</td>
                                  <td>{(stor.available).toFixed(2)} GB</td>
                                  <td>
                                    <span className={`moderation-badge ${stor.utilization > 90 ? 'critical' : stor.utilization > 75 ? 'warning' : 'healthy'}`}>
                                      {stor.utilization.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td>{stor.files?.total || 0}</td>
                                  <td>{new Date(stor.lastChecked).toLocaleString()}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Blacklist Add Modal */}
      {showBlacklistModal && (
        <div className="admin-modal-overlay" onClick={() => setShowBlacklistModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h3>Add Blacklist Item</h3>
              <button className="admin-panel-close" onClick={() => setShowBlacklistModal(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleAddBlacklist({
                  type: formData.get('type'),
                  value: formData.get('value'),
                  reason: formData.get('reason'),
                  severity: formData.get('severity')
                });
              }}>
                <div className="form-group-tiktok">
                  <label>Type</label>
                  <select name="type" className="tiktok-input" required>
                    <option value="word">Word</option>
                    <option value="hashtag">Hashtag</option>
                    <option value="username">Username</option>
                    <option value="domain">Domain</option>
                  </select>
                </div>
                <div className="form-group-tiktok">
                  <label>Value</label>
                  <input type="text" name="value" className="tiktok-input" placeholder="Enter value to blacklist..." required />
                </div>
                <div className="form-group-tiktok">
                  <label>Severity</label>
                  <select name="severity" className="tiktok-input" required>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group-tiktok">
                  <label>Reason</label>
                  <textarea name="reason" className="tiktok-input" rows="4" placeholder="Enter reason for blacklisting..."></textarea>
                </div>
                <div className="admin-modal-footer">
                  <button type="submit" className="admin-btn admin-btn-primary">Add</button>
                  <button type="button" onClick={() => setShowBlacklistModal(false)} className="admin-btn admin-btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

          {/* Boost Content Modal */}
          {showBoostModal && (
            <div className="admin-modal-overlay" onClick={() => setShowBoostModal(false)}>
              <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="admin-modal-header">
                  <h3>Boost Content</h3>
                  <button className="admin-panel-close" onClick={() => setShowBoostModal(false)}>×</button>
                </div>
                <div className="admin-modal-body">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleBoostContent({
                      contentType: formData.get('contentType'),
                      contentId: formData.get('contentId'),
                      boostType: formData.get('boostType'),
                      boostLevel: parseFloat(formData.get('boostLevel')),
                      priority: parseInt(formData.get('priority')),
                      startDate: formData.get('startDate') || new Date().toISOString(),
                      endDate: formData.get('endDate') || null,
                      reason: formData.get('reason'),
                      notes: formData.get('notes')
                    });
                  }}>
                    <div className="form-group-tiktok">
                      <label>Content Type</label>
                      <select name="contentType" className="tiktok-input" required>
                        <option value="video">Video</option>
                        <option value="hashtag">Hashtag</option>
                        <option value="user">User</option>
                        <option value="trend">Trend</option>
                      </select>
                    </div>
                    <div className="form-group-tiktok">
                      <label>Content ID</label>
                      <input 
                        type="text" 
                        name="contentId" 
                        className="tiktok-input" 
                        placeholder="Enter content ID (e.g., video ID, user ID, hashtag)"
                        required 
                      />
                    </div>
                    <div className="form-group-tiktok">
                      <label>Boost Type</label>
                      <select name="boostType" className="tiktok-input" required>
                        <option value="search">Search Only</option>
                        <option value="feed">Feed Only</option>
                        <option value="both">Both Search & Feed</option>
                      </select>
                    </div>
                    <div className="form-group-tiktok">
                      <label>Boost Level (1.0 - 10.0)</label>
                      <input 
                        type="number" 
                        name="boostLevel" 
                        className="tiktok-input" 
                        min="1.0" 
                        max="10.0" 
                        step="0.1"
                        defaultValue="1.0"
                        placeholder="1.0 - 10.0"
                        required 
                      />
                    </div>
                    <div className="form-group-tiktok">
                      <label>Priority (1-10)</label>
                      <input 
                        type="number" 
                        name="priority" 
                        className="tiktok-input" 
                        min="1" 
                        max="10" 
                        defaultValue="5"
                        placeholder="1 (lowest) to 10 (highest)"
                        required 
                      />
                    </div>
                    <div className="form-group-tiktok">
                      <label>Start Date</label>
                      <input 
                        type="datetime-local" 
                        name="startDate" 
                        className="tiktok-input"
                        defaultValue={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <div className="form-group-tiktok">
                      <label>End Date (Optional)</label>
                      <input 
                        type="datetime-local" 
                        name="endDate" 
                        className="tiktok-input"
                      />
                    </div>
                    <div className="form-group-tiktok">
                      <label>Reason</label>
                      <textarea 
                        name="reason" 
                        className="tiktok-input" 
                        rows="3"
                        placeholder="Enter reason for boosting this content..."
                      ></textarea>
                    </div>
                    <div className="form-group-tiktok">
                      <label>Notes (Optional)</label>
                      <textarea 
                        name="notes" 
                        className="tiktok-input" 
                        rows="2"
                        placeholder="Additional notes..."
                      ></textarea>
                    </div>
                    <div className="admin-modal-footer">
                      <button type="submit" className="admin-btn admin-btn-primary">Boost Content</button>
                      <button type="button" onClick={() => setShowBoostModal(false)} className="admin-btn admin-btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Report Details Modal */}
          {selectedReport && (
            <div className="admin-modal-overlay" onClick={() => setSelectedReport(null)}>
              <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>Report Details</h3>
                  <button className="admin-panel-close" onClick={() => setSelectedReport(null)}>×</button>
                </div>
                <div className="admin-modal-body">
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Reason:</strong> {selectedReport.reason.replace('_', ' ').toUpperCase()}
                    <span className={`moderation-badge ${selectedReport.priority}`} style={{ marginLeft: '12px' }}>
                      {selectedReport.priority}
                    </span>
                    {selectedReport.childSafetyConcern && <span style={{ marginLeft: '8px', background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>CHILD SAFETY</span>}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Reporter:</strong> {selectedReport.reporter?.username || 'Unknown'} ({selectedReport.reporter?.email})
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Reported User:</strong> {selectedReport.reportedUser?.username || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Description:</strong>
                    <div style={{ marginTop: '8px', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                      {selectedReport.description || 'No description provided'}
                    </div>
                  </div>
                  {selectedReport.screenshots && selectedReport.screenshots.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <strong>Screenshots:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                        {selectedReport.screenshots.map((screenshot, idx) => (
                          <img key={idx} src={screenshot.url} alt={`Screenshot ${idx + 1}`} style={{ width: '100%', borderRadius: '6px', border: '1px solid #e9ecef' }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedReport.evidence && selectedReport.evidence.timestamps && selectedReport.evidence.timestamps.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <strong>Timestamps:</strong>
                      <ul>
                        {selectedReport.evidence.timestamps.map((ts, idx) => (
                          <li key={idx}>{new Date(ts).toLocaleString()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Created:</strong> {new Date(selectedReport.createdAt).toLocaleString()}
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <strong>Status:</strong> <span className={`moderation-badge ${selectedReport.status}`}>{selectedReport.status}</span>
                  </div>
                </div>
                <div className="admin-modal-footer">
                  <button
                    onClick={() => {
                      handleResolveReport(selectedReport._id, 'warning', 'Warning issued');
                    }}
                    className="admin-btn admin-btn-secondary"
                  >
                    Issue Warning
                  </button>
                  <button
                    onClick={() => {
                      handleResolveReport(selectedReport._id, 'content_removed', 'Content removed');
                    }}
                    className="admin-btn admin-btn-danger"
                  >
                    Remove Content
                  </button>
                  <button
                    onClick={() => {
                      handleResolveReport(selectedReport._id, 'account_suspended', 'Account suspended');
                    }}
                    className="admin-btn admin-btn-danger"
                  >
                    Suspend Account
                  </button>
                  <button
                    onClick={() => {
                      handleDismissReport(selectedReport._id, 'Report dismissed');
                    }}
                    className="admin-btn admin-btn-secondary"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className={`admin-toast admin-toast-${toast.type}`}>
              {toast.message}
            </div>
          )}
        </div>
      </div>
  );

  if (isModal) {
    return (
      <div className="admin-panel-overlay" onClick={(e) => e.target.classList.contains('admin-panel-overlay') && onClose?.()}>
        {content}
      </div>
    );
  }

  return (
    <div className="admin-panel-page-container">
      {content}
    </div>
  );
};
export default AdminPanel;
