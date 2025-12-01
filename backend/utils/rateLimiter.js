const rateLimit = require('express-rate-limit');

// Strict rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // More attempts in development
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: (req) => {
    // Skip rate limiting in development for localhost
    return process.env.NODE_ENV !== 'production' && (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip?.includes('127.0.0.1'));
  }
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
        skip: (req) => {
          // Skip forgot-password route completely (no rate limiting at all)
          // Check multiple possible path formats (with/without /api prefix)
          const path = req.path || req.originalUrl || '';
          if (path.includes('/forgot-password') || path.includes('forgot-password')) {
            return true;
          }
          return false;
        }
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

// Rate limiter for password reset (sending code to email) - VERY LENIENT
// Note: Database tracks failed attempts per email, so rate limiter is minimal
const passwordResetLimiter = 
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50, // Allow 50 email requests per hour in production (very lenient)
        message: {
          success: false,
          message: 'Too many password reset requests. Please try again after 1 hour.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful email sends
        skip: (req) => {
          // Skip for localhost/development IPs even in production
          return req.ip === '::1' || req.ip === '127.0.0.1' || req.ip?.includes('127.0.0.1') || req.ip?.includes('localhost');
        }
      })
    : (req, res, next) => next(); // Skip rate limiting completely in development

// Rate limiter for code verification attempts (15 attempts per 10 hours)
const codeVerificationLimiter = 
  process.env.NODE_ENV === 'production'
    ? rateLimit({
        windowMs: 10 * 60 * 60 * 1000, // 10 hours (maximum cooldown as requested)
        max: 15, // Allow 15 code verification attempts per 10 hours
        message: {
          success: false,
          message: 'Too many verification attempts. Please try again after 10 hours.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful verifications
      })
    : (req, res, next) => next(); // Skip rate limiting in development (tracking handled by database)

module.exports = {
  authLimiter,
  generalLimiter,
  uploadLimiter,
  passwordResetLimiter,
  codeVerificationLimiter
};

