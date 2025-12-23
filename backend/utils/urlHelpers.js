const { PUBLIC_URL } = require('./config');

/**
 * Get the base URL for the application
 * @returns {string} The base URL
 */
const getBaseUrl = () => {
  // Explicit environment variables take precedence
  if (process.env.API_URL) return process.env.API_URL;
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  
  // Production default
  if (process.env.NODE_ENV === 'production') {
    return 'https://spryclips.com';
  }
  
  // Development default
  return PUBLIC_URL;
};

/**
 * Ensure URL is absolute
 * Converts relative URLs to absolute URLs using the appropriate base URL
 * 
 * @param {string} url - The URL to normalize
 * @returns {string} - The absolute URL or empty string if invalid
 */
const ensureAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  
  // Already absolute
  if (/^(https?:)?\/\//i.test(trimmed)) {
    if (/^\/\//.test(trimmed)) {
      // Use HTTPS by default for security, fall back to HTTP only if explicitly set
      const protocol = process.env.PROTOCOL || 'https:';
      return `${protocol}${trimmed}`;
    }
    return trimmed;
  }
  
  // Data or blob URL
  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  
  // Make relative URL absolute
  const baseUrl = getBaseUrl();
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = trimmed.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

module.exports = {
  ensureAbsoluteUrl,
  getBaseUrl
};
