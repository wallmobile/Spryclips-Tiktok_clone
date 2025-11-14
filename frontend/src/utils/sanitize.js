import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
};

/**
 * Sanitize text input (removes HTML tags)
 */
export const sanitizeText = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize user input for display
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return sanitizeText(input);
};

