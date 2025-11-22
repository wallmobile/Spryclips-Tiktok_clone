const { body, param, query, validationResult } = require('express-validator');

/**
 * Sanitize string input to prevent XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

/**
 * Sanitize HTML content (for descriptions, bios, etc.)
 */
const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return html;
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

/**
 * Validation middleware for common fields
 */
const commonValidators = {
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .escape(),

  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  objectId: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),

  description: body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .customSanitizer(sanitizeHTML),

  bio: body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters')
    .customSanitizer(sanitizeHTML),

  text: body('text')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Text must be between 1 and 1000 characters')
    .customSanitizer(sanitizeHTML)
};

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  sanitizeString,
  sanitizeHTML,
  commonValidators,
  handleValidationErrors
};

