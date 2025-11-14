import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const WatchHistoryContext = createContext();

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within WatchHistoryProvider');
  }
  return context;
};

export const WatchHistoryProvider = ({ children }) => {
  const { user } = useAuth();
  const [watchHistory, setWatchHistory] = useState([]);
  const [userInterests, setUserInterests] = useState({
    hashtags: {},
    categories: {},
    creators: {},
    watchTime: 0
  });

  // Load watch history from localStorage
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const stored = window.localStorage.getItem(`watchHistory_${user.id}`);
    const storedInterests = window.localStorage.getItem(`userInterests_${user.id}`);

    if (stored) {
      try {
        setWatchHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading watch history:', e);
      }
    }

    if (storedInterests) {
      try {
        setUserInterests(JSON.parse(storedInterests));
      } catch (e) {
        console.error('Error loading interests:', e);
      }
    }
  }, [user?.id]);

  // Save watch history to localStorage
  useEffect(() => {
    if (!user?.id || watchHistory.length === 0 || typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(`watchHistory_${user.id}`, JSON.stringify(watchHistory));
  }, [watchHistory, user?.id]);

  // Save interests to localStorage
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(`userInterests_${user.id}`, JSON.stringify(userInterests));
  }, [userInterests, user?.id]);

  // Update user interests based on watch behavior
  const updateInterests = useCallback((videoData, watchDuration, completionRate) => {
    if (!videoData) return;

    setUserInterests(prev => {
      const newInterests = { ...prev };
      
      // Extract hashtags
      const hashtags = videoData.hashtags || [];
      const description = videoData.description || '';
      const extractedHashtags = [...hashtags, ...(description.match(/#\w+/g) || []).map(t => t.slice(1))];
      
      // Update hashtag interests
      extractedHashtags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        if (!newInterests.hashtags[tagLower]) {
          newInterests.hashtags[tagLower] = 0;
        }
        // Weight by completion rate and watch duration
        newInterests.hashtags[tagLower] += completionRate * (watchDuration / 60); // normalize by minutes
      });

      // Update creator interests
      const creator = videoData.creator || videoData.username;
      if (creator) {
        if (!newInterests.creators[creator]) {
          newInterests.creators[creator] = 0;
        }
        newInterests.creators[creator] += completionRate;
      }

      // Update category interests
      const category = videoData.category || 'general';
      if (!newInterests.categories[category]) {
        newInterests.categories[category] = 0;
      }
      newInterests.categories[category] += completionRate;

      // Update total watch time
      newInterests.watchTime += watchDuration;

      return newInterests;
    });
  }, []);

  // Record watch event
  const recordWatch = useCallback((videoId, videoData, watchDuration = 0, completionRate = 0) => {
    if (!user?.id) return;

    const watchEvent = {
      videoId,
      timestamp: new Date().toISOString(),
      watchDuration, // in seconds
      completionRate, // 0-1
      videoData: {
        hashtags: videoData.hashtags || [],
        category: videoData.category || 'general',
        creator: videoData.creator || videoData.username,
        description: videoData.description || ''
      }
    };

    setWatchHistory(prev => {
      // Remove existing entry for this video if exists
      const filtered = prev.filter(item => item.videoId !== videoId);
      return [watchEvent, ...filtered].slice(0, 1000); // Keep last 1000 watches
    });

    // Update interests based on watch behavior
    updateInterests(videoData, watchDuration, completionRate);
  }, [updateInterests, user?.id]);

  // Get top interests
  const getTopInterests = useCallback((type = 'hashtags', limit = 10) => {
    const interests = userInterests[type] || {};
    return Object.entries(interests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, value]) => ({ key, score: value }));
  }, [userInterests]);

  // Check if video was watched
  const isWatched = useCallback((videoId) => {
    return watchHistory.some(item => item.videoId === videoId);
  }, [watchHistory]);

  // Get watch history for a video
  const getWatchData = useCallback((videoId) => {
    return watchHistory.find(item => item.videoId === videoId);
  }, [watchHistory]);

  // Clear watch history
  const clearHistory = useCallback(() => {
    setWatchHistory([]);
    setUserInterests({
      hashtags: {},
      categories: {},
      creators: {},
      watchTime: 0
    });
    if (user?.id && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`watchHistory_${user.id}`);
      window.localStorage.removeItem(`userInterests_${user.id}`);
    }
  }, [user?.id]);

  const value = {
    watchHistory,
    userInterests,
    recordWatch,
    getTopInterests,
    isWatched,
    getWatchData,
    clearHistory
  };

  return (
    <WatchHistoryContext.Provider value={value}>
      {children}
    </WatchHistoryContext.Provider>
  );
};
