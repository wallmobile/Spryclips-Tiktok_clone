import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { WatchHistoryContext } from './WatchHistoryContext';

const RecommendationContext = createContext();

const EMPTY_WATCH_HISTORY = Object.freeze([]);
const DEFAULT_INTERESTS = Object.freeze({
  hashtags: {},
  categories: {},
  creators: {},
  watchTime: 0
});

export const useRecommendation = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendation must be used within RecommendationProvider');
  }
  return context;
};

export const RecommendationProvider = ({ children }) => {
  const { user } = useAuth();
  const watchHistoryContext = useContext(WatchHistoryContext);

  const watchHistory = watchHistoryContext?.watchHistory ?? EMPTY_WATCH_HISTORY;
  const userInterests = watchHistoryContext?.userInterests ?? DEFAULT_INTERESTS;
  const [blockedContent, setBlockedContent] = useState([]);
  const [contentFilters, setContentFilters] = useState({
    mature: false,
    violence: false,
    profanity: false,
    ageRestriction: 'all'
  });

  // Load blocked content and filters from localStorage
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const storedBlocked = window.localStorage.getItem(`blockedContent_${user.id}`);
    const storedFilters = window.localStorage.getItem(`contentFilters_${user.id}`);
    
    if (storedBlocked) {
      try {
        setBlockedContent(JSON.parse(storedBlocked));
      } catch (e) {
        console.error('Error loading blocked content:', e);
      }
    }
    
    if (storedFilters) {
      try {
        setContentFilters(JSON.parse(storedFilters));
      } catch (e) {
        console.error('Error loading content filters:', e);
      }
    }
  }, [user?.id]);

  // Save blocked content and filters
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(`blockedContent_${user.id}`, JSON.stringify(blockedContent));
    window.localStorage.setItem(`contentFilters_${user.id}`, JSON.stringify(contentFilters));
  }, [blockedContent, contentFilters, user?.id]);

  // Extract hashtags from description
  const extractHashtags = useCallback((text) => {
    if (!text) return [];
    const matches = text.match(/#\w+/g) || [];
    return matches.map(tag => tag.slice(1).toLowerCase());
  }, []);

  // Extract category from video data
  const extractCategory = useCallback((video) => {
    const description = (video.description || '').toLowerCase();
    const hashtags = extractHashtags(video.description || '');
    
    // Category detection based on keywords and hashtags
    if (hashtags.includes('dance') || description.includes('dance')) return 'dance';
    if (hashtags.includes('comedy') || description.includes('funny') || description.includes('comedy')) return 'comedy';
    if (hashtags.includes('music') || description.includes('music') || description.includes('song')) return 'music';
    if (hashtags.includes('food') || description.includes('food') || description.includes('recipe')) return 'food';
    if (hashtags.includes('fitness') || description.includes('workout') || description.includes('gym')) return 'fitness';
    if (hashtags.includes('fashion') || description.includes('outfit') || description.includes('style')) return 'fashion';
    if (hashtags.includes('travel') || description.includes('travel')) return 'travel';
    if (hashtags.includes('pets') || description.includes('dog') || description.includes('cat')) return 'pets';
    if (hashtags.includes('gaming') || description.includes('game')) return 'gaming';
    return 'general';
  }, [extractHashtags]);

  // Calculate video score for recommendations
  const calculateVideoScore = useCallback((video, interests) => {
    let score = 0;
    
    // Base score from video engagement
    const engagement = (video.likes || 0) + (video.comments || 0) * 2 + (video.shares || 0) * 3;
    score += Math.log10(engagement + 1) * 10;
    
    // Recency boost (newer videos get slight boost)
    if (video.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceCreation) * 0.5;
    }
    
    // Interest matching
    const videoHashtags = extractHashtags(video.description || '');
    const videoCategory = extractCategory(video);
    const videoCreator = video.username || video.channel || '';
    
    // Hashtag matching
    videoHashtags.forEach(tag => {
      const tagScore = interests.hashtags[tag] || 0;
      score += tagScore * 5;
    });
    
    // Category matching
    const categoryScore = interests.categories[videoCategory] || 0;
    score += categoryScore * 3;
    
    // Creator matching
    if (videoCreator) {
      const creatorScore = interests.creators[videoCreator] || 0;
      score += creatorScore * 4;
    }
    
    // Diversity bonus (reduce score if user watched similar content recently)
    const recentWatches = watchHistory.slice(0, 10);
    const similarityPenalty = recentWatches.filter(w => {
      const wHashtags = w.videoData?.hashtags || [];
      const commonHashtags = videoHashtags.filter(t => wHashtags.includes(t));
      return commonHashtags.length > 2 || w.videoData?.creator === videoCreator;
    }).length;
    
    score -= similarityPenalty * 2;
    
    return Math.max(0, score);
  }, [watchHistory, extractHashtags, extractCategory]);

  // Detect trending videos
  const getTrendingVideos = useCallback((allVideos) => {
    if (!allVideos || allVideos.length === 0) return [];

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const videosWithTrendingScore = allVideos.map(video => {
      const createdAt = video.createdAt ? new Date(video.createdAt).getTime() : now;
      const isRecent = createdAt > oneDayAgo;
      const isThisWeek = createdAt > oneWeekAgo;
      
      // Calculate trending score
      const engagement = (video.likes || 0) + (video.comments || 0) * 2 + (video.shares || 0) * 3 + (video.views || 0) * 0.1;
      const timeDecay = isRecent ? 2 : (isThisWeek ? 1.5 : 1);
      const trendingScore = engagement * timeDecay;
      
      return {
        ...video,
        trendingScore,
        category: extractCategory(video),
        hashtags: extractHashtags(video.description || '')
      };
    });

    return videosWithTrendingScore
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, 50);
  }, [extractCategory, extractHashtags]);

  // Get personalized recommendations
  const getPersonalizedRecommendations = useCallback((allVideos, limit = 20) => {
    if (!user || !allVideos || allVideos.length === 0) {
      return allVideos.slice(0, limit);
    }

    // Filter out blocked content
    const filtered = allVideos.filter(video => {
      // Check if video or creator is blocked
      if (blockedContent.includes(video.id) || blockedContent.includes(video.username)) {
        return false;
      }
      
      // Content filtering
      if (contentFilters.mature && video.ageRestriction === '18+') {
        return false;
      }
      
      // Check for inappropriate content (basic keyword detection)
      const description = (video.description || '').toLowerCase();
      if (contentFilters.profanity) {
        const profanityWords = ['badword1', 'badword2']; // Add actual profanity list
        if (profanityWords.some(word => description.includes(word))) {
          return false;
        }
      }
      
      return true;
    });

    // Calculate scores for all videos
    const videosWithScores = filtered.map(video => ({
      ...video,
      score: calculateVideoScore(video, userInterests),
      category: extractCategory(video),
      hashtags: extractHashtags(video.description || '')
    }));

    // Sort by score (highest first)
    const sorted = videosWithScores.sort((a, b) => b.score - a.score);

    // Add some diversity: mix high-scoring videos with some trending videos
    const recommendations = [];
    const used = new Set();
    
    // Add top scored videos (60%)
    const topCount = Math.floor(limit * 0.6);
    for (let i = 0; i < Math.min(topCount, sorted.length); i++) {
      if (!used.has(sorted[i].id)) {
        recommendations.push(sorted[i]);
        used.add(sorted[i].id);
      }
    }
    
    // Add trending videos (30%)
    const trendingCount = Math.floor(limit * 0.3);
    const trending = getTrendingVideos(allVideos).slice(0, trendingCount);
    for (let i = 0; i < trending.length && recommendations.length < limit; i++) {
      if (!used.has(trending[i].id)) {
        recommendations.push(trending[i]);
        used.add(trending[i].id);
      }
    }
    
    // Fill remaining with random diverse content (10%)
    const remaining = filtered.filter(v => !used.has(v.id));
    const randomCount = limit - recommendations.length;
    const shuffled = remaining.sort(() => Math.random() - 0.5);
    recommendations.push(...shuffled.slice(0, randomCount));

    return recommendations;
  }, [user, blockedContent, contentFilters, calculateVideoScore, userInterests, extractCategory, extractHashtags, getTrendingVideos]);

  // Get trending hashtags
  const getTrendingHashtags = useCallback((allVideos) => {
    if (!allVideos || allVideos.length === 0) return [];

    const hashtagCounts = {};
    const hashtagEngagement = {};
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    allVideos.forEach(video => {
      const createdAt = video.createdAt ? new Date(video.createdAt).getTime() : now;
      const isRecent = createdAt > oneWeekAgo;
      const weight = isRecent ? 2 : 1;
      
      const hashtags = extractHashtags(video.description || '');
      const engagement = (video.likes || 0) + (video.comments || 0) * 2 + (video.shares || 0) * 3;
      
      hashtags.forEach(tag => {
        if (!hashtagCounts[tag]) {
          hashtagCounts[tag] = 0;
          hashtagEngagement[tag] = 0;
        }
        hashtagCounts[tag] += weight;
        hashtagEngagement[tag] += engagement * weight;
      });
    });

    return Object.entries(hashtagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        engagement: hashtagEngagement[tag],
        score: count * 0.4 + Math.log10(hashtagEngagement[tag] + 1) * 10
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [extractHashtags]);

  // Block content
  const blockContent = useCallback((contentId) => {
    setBlockedContent(prev => {
      if (!prev.includes(contentId)) {
        return [...prev, contentId];
      }
      return prev;
    });
  }, []);

  // Unblock content
  const unblockContent = useCallback((contentId) => {
    setBlockedContent(prev => prev.filter(id => id !== contentId));
  }, []);

  // Update content filters
  const updateContentFilters = useCallback((filters) => {
    setContentFilters(prev => ({ ...prev, ...filters }));
  }, []);

  // Update trending data periodically
  useEffect(() => {
    const updateTrending = () => {
      // This would normally fetch from API
      // For now, we'll use the videos passed to getPersonalizedRecommendations
    };

    const interval = setInterval(updateTrending, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const value = {
    getPersonalizedRecommendations,
    getTrendingVideos,
    getTrendingHashtags,
    blockContent,
    unblockContent,
    updateContentFilters,
    contentFilters,
    blockedContent
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};
