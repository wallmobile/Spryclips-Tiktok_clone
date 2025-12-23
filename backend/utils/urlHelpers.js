const { PUBLIC_URL } = require('./config');

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
      const protocol = process.env.PROTOCOL || 'http:';
      return `${protocol}${trimmed}`;
    }
    return trimmed;
  }
  
  // Data or blob URL
  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  
  // Make relative URL absolute
  const baseUrl = process.env.API_URL || process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : PUBLIC_URL);
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = trimmed.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
};

module.exports = {
  ensureAbsoluteUrl
};
