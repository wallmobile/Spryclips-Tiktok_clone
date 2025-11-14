const rateLimit = require('express-rate-limit');

// Strict rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Moderate rate limiter for general routes
const generalLimiter =
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
          success: false,
          message: 'Too many requests, please try again later'
        },
        standardHeaders: true,
        legacyHeaders: false,
      })
    : (req, res, next) => next(); // In non-production environments, disable rate limiting for smoother local testing

// Strict rate limiter for upload routes
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    success: false,
    message: 'Too many uploads, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  generalLimiter,
  uploadLimiter,
  passwordResetLimiter
};

