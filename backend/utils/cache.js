/**
 * Caching utility
 * In production, this would use Redis
 * For now, uses in-memory cache with TTL
 */

class Cache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  /**
   * Get value from cache
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }
}

// Singleton instance
const cache = new Cache();

// Cache key generators
const cacheKeys = {
  user: (userId) => `user:${userId}`,
  video: (videoId) => `video:${videoId}`,
  videoList: (params) => `videos:${JSON.stringify(params)}`,
  userVideos: (userId) => `user:videos:${userId}`,
  comments: (videoId) => `comments:${videoId}`,
  search: (query) => `search:${query}`
};

module.exports = {
  cache,
  cacheKeys
};

