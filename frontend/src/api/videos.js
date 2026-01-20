import api, { API_URL } from '../config/axios';
import { videos as sampleVideos } from '../data/sampleData';

const isBrowser = typeof window !== 'undefined';
const INTERACTIONS_KEY = 'tiktok_interactions_v1';
let hasWarnedFeed = false;
let skipVideoRequests = false;

const normalizeUrl = (url) => (url ? url.replace(/\/+$/, '') : '');

const assumeMocksInDev = () => {
  if (!isBrowser) return false;
  if (process.env.NODE_ENV !== 'development') return false;
  const current = normalizeUrl(window.location.origin);
  const configured = normalizeUrl(API_URL);
  return current === configured;
};

if (assumeMocksInDev()) {
  skipVideoRequests = true;
}

if (isBrowser && process.env.NODE_ENV === 'development') {
  window.__APP_API_URL__ = API_URL;
  window.__SKIP_VIDEO_REQUESTS__ = skipVideoRequests;
}

const getMediaBaseUrl = () => {
  const configured = normalizeUrl(API_URL);
  if (configured) {
    return configured;
  }
  if (isBrowser && window.location?.origin) {
    return normalizeUrl(window.location.origin);
  }
  return '';
};

const ABSOLUTE_MEDIA_PROTOCOL = /^(?:https?:|data:|blob:)/i;
const LOCAL_HOSTNAME_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\[::1\]|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1]))$/i;

const ensureAbsoluteMediaUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  if (ABSOLUTE_MEDIA_PROTOCOL.test(value)) {
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        if (LOCAL_HOSTNAME_PATTERN.test(parsed.hostname)) {
          const base = getMediaBaseUrl();
          if (base) {
            try {
              const baseUrl = new URL(base, isBrowser && window.location?.origin ? window.location.origin : undefined);
              const path = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
              return `${baseUrl.origin}${path}${parsed.search || ''}${parsed.hash || ''}`;
            } catch (error) {
              const normalizedBase = base.replace(/\/+$/, '');
              const normalizedPath = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
              return `${normalizedBase}${normalizedPath}${parsed.search || ''}${parsed.hash || ''}`;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to normalize media URL', value, error);
      }
    }
    return value;
  }
  const base = getMediaBaseUrl();
  if (!base) {
    return value.startsWith('/') ? value : `/${value}`;
  }
  return `${base}/${value.replace(/^\/+/, '')}`;
};

const transformVideoForClient = (video, source = 'api') => {
  if (!video || typeof video !== 'object') {
    return video;
  }

  const result = { ...video, __source: source };

  const primaryUrl = ensureAbsoluteMediaUrl(result.videoUrl || result.url);
  if (primaryUrl) {
    result.videoUrl = primaryUrl;
    result.url = primaryUrl;
  }

  if (result.thumbnail) {
    result.thumbnail = ensureAbsoluteMediaUrl(result.thumbnail);
  }

  if (result.poster) {
    result.poster = ensureAbsoluteMediaUrl(result.poster);
  }

  if (result.transcoded && typeof result.transcoded === 'object') {
    result.transcoded = {
      ...result.transcoded,
      url: ensureAbsoluteMediaUrl(result.transcoded.url),
      thumbnailUrl: ensureAbsoluteMediaUrl(result.transcoded.thumbnailUrl)
    };
  }

  if (result.assets && typeof result.assets === 'object') {
    result.assets = {
      ...result.assets,
      thumbnail: ensureAbsoluteMediaUrl(result.assets.thumbnail)
    };
  }

  if (Array.isArray(result.processedVideos)) {
    result.processedVideos = result.processedVideos.map((item) => ({
      ...item,
      url: ensureAbsoluteMediaUrl(item.url),
      thumbnail: ensureAbsoluteMediaUrl(item.thumbnail)
    }));
  }

  // Transform music audioUrl to absolute URL
  if (result.music && result.music.audioUrl) {
    result.music = {
      ...result.music,
      audioUrl: ensureAbsoluteMediaUrl(result.music.audioUrl)
    };
  }

  // Also check metadata.music for backward compatibility
  if (result.metadata && result.metadata.music && result.metadata.music.audioUrl) {
    result.metadata = {
      ...result.metadata,
      music: {
        ...result.metadata.music,
        audioUrl: ensureAbsoluteMediaUrl(result.metadata.music.audioUrl)
      }
    };
  }

  return result;
};

const defaultInteractionCache = () => ({
  likes: {},
  shares: {},
  following: {}
});

const loadInteractionCache = () => {
  if (!isBrowser) {
    return defaultInteractionCache();
  }
  try {
    const raw = window.localStorage.getItem(INTERACTIONS_KEY);
    if (!raw) {
      return defaultInteractionCache();
    }
    const parsed = JSON.parse(raw);
    return {
      ...defaultInteractionCache(),
      ...parsed
    };
  } catch (error) {
    console.warn('Failed to read interaction cache, resetting.', error);
    return defaultInteractionCache();
  }
};

const saveInteractionCache = (cache) => {
  if (!isBrowser) {
    return;
  }
  try {
    window.localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to persist interaction cache.', error);
  }
};

const findSampleVideo = (videoId) => {
  if (!videoId) return undefined;
  return sampleVideos.find((video) => String(video.id ?? video._id) === String(videoId));
};

const findSampleUserByKey = (key) => {
  if (!key) return undefined;
  const keyString = String(key);
  return sampleVideos.find((video) => {
    const user = video.user ?? {};
    return (
      String(video.channel ?? '') === keyString ||
      String(user._id ?? user.id ?? '') === keyString ||
      String(user.username ?? '') === keyString
    );
  });
};

const buildSampleUser = (key) => {
  const source = findSampleUserByKey(key);
  if (!source) {
    return undefined;
  }
  const user = source.user ?? {};
  const username = user.username ?? source.channel ?? String(key);
  const avatar = user.profile?.avatar ?? source.avatar;
  return {
    username,
    profile: {
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=ff0050&color=fff`
    },
    stats: {
      likes: user.stats?.likes ?? source.likes ?? 0,
      followers: user.stats?.followers ?? Math.max(0, Math.round((source.likes ?? 0) / 25)),
      videos: user.stats?.videos ?? 0
    }
  };
};

const fallbackLikeToggle = (videoId) => {
  const cache = loadInteractionCache();
  const existing = cache.likes[videoId] ?? {};
  const sample = findSampleVideo(videoId);
  const base = typeof existing.base === 'number'
    ? existing.base
    : typeof sample?.likes === 'number'
    ? sample.likes
    : typeof sample?.video?.likes === 'number'
    ? sample.video.likes
    : 0;
  const previousTotal = typeof existing.total === 'number' ? existing.total : base;
  const nextLiked = !existing.liked;
  const nextTotal = Math.max(0, previousTotal + (nextLiked ? 1 : -1));

  cache.likes[videoId] = {
    base,
    total: nextTotal,
    liked: nextLiked
  };
  saveInteractionCache(cache);
  return { isLiked: nextLiked, likes: nextTotal };
};

const fallbackShareIncrement = (videoId) => {
  const cache = loadInteractionCache();
  const existing = cache.shares[videoId] ?? {};
  const sample = findSampleVideo(videoId);
  const base = typeof existing.base === 'number'
    ? existing.base
    : typeof sample?.shares === 'number'
    ? sample.shares
    : typeof sample?.video?.shares === 'number'
    ? sample.video.shares
    : 0;
  const previousTotal = typeof existing.total === 'number' ? existing.total : base;
  const nextTotal = previousTotal + 1;

  cache.shares[videoId] = {
    base,
    total: nextTotal
  };
  saveInteractionCache(cache);
  return { shares: nextTotal };
};

const fallbackFollowToggle = (userId) => {
  const cache = loadInteractionCache();
  const current = Boolean(cache.following[userId]);
  const nextState = !current;
  cache.following[userId] = nextState;
  saveInteractionCache(cache);
  return { isFollowing: nextState };
};

const normalizeVideos = (list, source) =>
  list.map((video) => transformVideoForClient(video, source));

const extractArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.videos)) return payload.videos;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
};

const unwrapSuccessData = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data;
  }
  return payload;
};

const toFiniteNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getSampleVideos = () => normalizeVideos(sampleVideos, 'sample');

// Video upload with all features
export const uploadVideo = async (formData, onUploadProgress) => {
  // Increase timeout for large video uploads (5 minutes = 300000ms)
  const UPLOAD_TIMEOUT = 300000; // 5 minutes for large videos
  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: UPLOAD_TIMEOUT, // Set timeout for video upload
    onUploadProgress
  });
  return response.data;
};

// Get user's uploaded videos
export const getMyVideos = async () => {
  const response = await api.get('/api/upload/my-videos');
  const payload = response.data;
  if (payload && typeof payload === 'object') {
    const next = { ...payload };
    if (Array.isArray(next.videos)) {
      next.videos = normalizeVideos(next.videos, 'api');
    }
    if (Array.isArray(next.data)) {
      next.data = normalizeVideos(next.data, 'api');
    }
    return next;
  }
  return payload;
};

// Get single uploaded video
export const getMyVideo = async (id) => {
  const response = await api.get(`/api/upload/my-videos/${id}`);
  return response.data;
};

// Update video details
export const updateVideo = async (id, data) => {
  const response = await api.put(`/api/upload/my-videos/${id}`, data);
  return response.data;
};

// Delete video
export const deleteVideo = async (id) => {
  const response = await api.delete(`/api/upload/my-videos/${id}`);
  return response.data;
};

// Get video analytics
export const getVideoAnalytics = async (id) => {
  const response = await api.get(`/api/upload/my-videos/${id}/analytics`);
  return response.data;
};

// Search user's videos
export const searchMyVideos = async (query) => {
  const response = await api.get(`/api/upload/my-videos/search/${query}`);
  return response.data;
};

// Promote video
export const promoteVideo = async (id) => {
  const response = await api.post(`/api/upload/my-videos/${id}/promote`);
  return response.data;
};

// Get all public videos (feed)
export const getAllVideos = async () => {
  // Don't use skipVideoRequests permanently - allow retries
  if (skipVideoRequests && hasWarnedFeed) {
    // After first failure, still try API occasionally (every 5th call)
    if (Math.random() > 0.8) {
      skipVideoRequests = false; // Reset to retry
    }
  }
  
  if (skipVideoRequests) {
    return getSampleVideos();
  }
  try {
    const response = await api.get('/api/videos');
    const list = extractArray(response.data);
    if (list.length > 0) {
      // Success! Reset flags
      skipVideoRequests = false;
      hasWarnedFeed = false;
      return normalizeVideos(list, 'api');
    }
    if (!hasWarnedFeed) {
      console.warn('Video feed returned no items. Falling back to sample catalogue.');
      hasWarnedFeed = true;
    }
    skipVideoRequests = true;
    return getSampleVideos();
  } catch (error) {
    if (!hasWarnedFeed) {
      console.warn('Unable to load videos from API. Using sample data instead.', error?.message ?? error);
      hasWarnedFeed = true;
    }
    skipVideoRequests = true;
    return getSampleVideos();
  }
};

// Get video by ID
export const getVideoById = async (id) => {
  try {
    const response = await api.get(`/api/videos/${id}`);
    const payload = response.data;
    const video = payload?.data ?? payload;
    return transformVideoForClient(video, 'api');
  } catch (error) {
    const sample = findSampleVideo(id);
    if (sample) {
      console.warn(`Using local sample video for ${id} due to API error.`, error?.message ?? error);
      return transformVideoForClient(sample, 'sample');
    }
    throw error;
  }
};

// Like/Unlike video with idempotency
export const toggleLike = async (id, idempotencyKey) => {
  if (skipVideoRequests) {
    return fallbackLikeToggle(id);
  }
  try {
    const response = await api.post(
      `/api/videos/${id}/like`,
      {},
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      }
    );
    const payload = unwrapSuccessData(response.data);
    return {
      isLiked: Boolean(payload?.isLiked),
      likes: toFiniteNumber(payload?.likes)
    };
  } catch (error) {
    // Check for 401 (unauthorized) error and throw user-friendly message
    if (error?.response?.status === 401 || error?.status === 401) {
      // Prioritize userMessage from error object or response data
      const userMessage = error?.userMessage || 
                         error?.response?.data?.userMessage || 
                         error?.response?.data?.message || 
                         'Please sign in to like videos.';
      const authError = new Error(userMessage);
      authError.status = 401;
      authError.userMessage = userMessage;
      // Preserve original error for debugging
      authError.originalError = error;
      throw authError;
    }
    console.warn('toggleLike fell back to local cache.', error?.message ?? error);
    skipVideoRequests = true;
    return fallbackLikeToggle(id);
  }
};

// Share video with idempotency
export const shareVideo = async (id, idempotencyKey) => {
  if (skipVideoRequests) {
    return fallbackShareIncrement(id);
  }
  try {
    const response = await api.post(
      `/api/videos/${id}/share`,
      {},
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey
        }
      }
    );
    const payload = unwrapSuccessData(response.data);
    return {
      shares: toFiniteNumber(payload?.shares)
    };
  } catch (error) {
    // Check for 401 (unauthorized) error and throw user-friendly message
    if (error?.response?.status === 401 || error?.status === 401) {
      // Prioritize userMessage from error object or response data
      const userMessage = error?.userMessage || 
                         error?.response?.data?.userMessage || 
                         error?.response?.data?.message || 
                         'Please sign in to share videos.';
      const authError = new Error(userMessage);
      authError.status = 401;
      authError.userMessage = userMessage;
      // Preserve original error for debugging
      authError.originalError = error;
      throw authError;
    }
    console.warn('shareVideo fell back to local cache.', error?.message ?? error);
    skipVideoRequests = true;
    return fallbackShareIncrement(id);
  }
};

// Get video comments
export const getVideoComments = async (id) => {
  try {
    const response = await api.get(`/api/videos/${id}/comments`);
    return unwrapSuccessData(response.data);
  } catch (error) {
    console.warn('Unable to fetch comments. Returning empty list.', error?.message ?? error);
    return [];
  }
};

// Get user profile
export const getUserProfile = async (id) => {
  try {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  } catch (error) {
    const sampleUser = buildSampleUser(id);
    if (sampleUser) {
      console.warn(`Using sample profile for ${id}.`, error?.message ?? error);
      return sampleUser;
    }
    return {
      username: String(id),
      profile: {
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(String(id))}&background=ff0050&color=fff`
      }
    };
  }
};

// Follow/Unfollow user
export const toggleFollow = async (id) => {
  if (skipVideoRequests) {
    return fallbackFollowToggle(id);
  }
  try {
    const response = await api.post(`/api/users/${id}/follow`);
    // Backend returns { isFollowing: boolean, isPending: boolean }
    // Ensure consistent response format
    const data = response.data || {};
    return {
      isFollowing: data.isFollowing ?? data.following ?? false,
      isPending: data.isPending ?? false,
      ...data
    };
  } catch (error) {
    // Check for 401 (unauthorized) error and throw user-friendly message
    if (error?.response?.status === 401 || error?.status === 401) {
      // Prioritize userMessage from error object or response data
      const userMessage = error?.userMessage || 
                         error?.response?.data?.userMessage || 
                         error?.response?.data?.message || 
                         'Please sign in to follow users.';
      const authError = new Error(userMessage);
      authError.status = 401;
      authError.userMessage = userMessage;
      // Preserve original error for debugging
      authError.originalError = error;
      throw authError;
    }
    console.warn('toggleFollow fell back to local cache.', error?.message ?? error);
    skipVideoRequests = true;
    return fallbackFollowToggle(id);
  }
};

// Get user's videos
export const getUserVideos = async (id) => {
  try {
    const response = await api.get(`/api/users/${id}/videos`);
    const payload = response.data;
    
    // Backend returns array directly, normalize it
    if (Array.isArray(payload)) {
      const normalized = normalizeVideos(payload, 'api');
      return {
        success: true,
        videos: normalized
      };
    }
    
    // If it's an object, check for videos or data array
    if (payload && typeof payload === 'object') {
      const next = { ...payload };
      if (Array.isArray(next.videos)) {
        next.videos = normalizeVideos(next.videos, 'api');
        next.success = next.success !== undefined ? next.success : true;
        return next;
      }
      if (Array.isArray(next.data)) {
        next.videos = normalizeVideos(next.data, 'api');
        next.success = next.success !== undefined ? next.success : true;
        return next;
      }
      // If no videos array, return empty
      return { success: true, videos: [] };
    }
    
    return { success: true, videos: [] };
  } catch (error) {
    console.error('Error fetching user videos:', error);
    const key = String(id);
    const filtered = sampleVideos.filter((video) => {
      const user = video.user ?? {};
      return (
        String(video.channel ?? '') === key ||
        String(user._id ?? user.id ?? '') === key ||
        String(user.username ?? '') === key
      );
    });
    if (filtered.length > 0) {
      console.warn(`Using sample videos for user ${id}.`, error?.message ?? error);
      return {
        success: true,
        videos: normalizeVideos(filtered, 'sample')
      };
    }
    // Return empty array on error instead of throwing
    return { success: true, videos: [] };
  }
};

// Update profile
export const updateProfile = async (data) => {
  const response = await api.put('/api/users/profile', data);
  return response.data;
};

// Update privacy settings
export const updatePrivacy = async (data) => {
  const response = await api.put('/api/users/privacy', data);
  return response.data;
};

// Retry processing for failed video
export const retryVideoProcessing = async (id) => {
  const response = await api.post(`/api/videos/${id}/retry-processing`);
  return response.data;
};

export const downloadVideo = async (id) => {
  try {
    const response = await api.get(`/api/videos/${id}/download`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'video/mp4' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-${id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};

/**
 * Track video view - Dedicated endpoint for accurate view tracking
 * This ensures views are tracked for monetization even if regular view counting has issues
 * @param {string} videoId - Video ID
 * @param {number} watchTime - Watch time in seconds (optional)
 * @param {number} completionRate - Completion rate percentage 0-100 (optional)
 */
export const trackVideoView = async (videoId, watchTime = 0, completionRate = 0) => {
  try {
    const response = await api.post('/api/video-views/track', {
      videoId,
      watchTime,
      completionRate
    });
    return response.data;
  } catch (error) {
    console.error('Error tracking video view:', error);
    // Don't throw - view tracking failure shouldn't break video playback
    return { success: false, error: error.message };
  }
};














