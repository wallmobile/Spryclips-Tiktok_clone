const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { sendErrorResponse } = require('../utils/errorHandler');
const AppError = require('../utils/errorHandler').AppError;

const authMiddleware = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then from Authorization header
    let token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return sendErrorResponse(res, new AppError({
        message: 'Authentication required',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        userMessage: 'Please sign in to continue.'
      }), req);
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return sendErrorResponse(res, new AppError({
        message: 'Server configuration error',
        statusCode: 500,
        code: 'SERVER_ERROR',
        userMessage: 'Something went wrong on our side. Please try again in a moment.'
      }), req);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      // If token is expired, try to refresh it using refresh token
      if (tokenError.name === 'TokenExpiredError') {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        
        if (refreshToken) {
          try {
            const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
            
            if (tokenDoc && tokenDoc.isValid()) {
              // Generate new access token
              const newAccessToken = jwt.sign(
                { userId: tokenDoc.user },
                process.env.JWT_SECRET,
                { expiresIn: '3d' }
              );
              
              // Set new access token in cookie
              res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days
              });
              
              // Use the new token
              decoded = jwt.verify(newAccessToken, process.env.JWT_SECRET);
            } else {
              return sendErrorResponse(res, new AppError({
                message: 'Token expired',
                statusCode: 401,
                code: 'UNAUTHORIZED',
                userMessage: 'Your session has expired. Please sign in again.'
              }), req);
            }
          } catch (refreshError) {
            return sendErrorResponse(res, new AppError({
              message: 'Token refresh failed',
              statusCode: 401,
              code: 'UNAUTHORIZED',
              userMessage: 'Your session has expired. Please sign in again.'
            }), req);
          }
        } else {
          return sendErrorResponse(res, new AppError({
            message: 'Token expired',
            statusCode: 401,
            code: 'UNAUTHORIZED',
            userMessage: 'Your session has expired. Please sign in again.'
          }), req);
        }
      } else {
        return sendErrorResponse(res, new AppError({
          message: 'Invalid token',
          statusCode: 401,
          code: 'UNAUTHORIZED',
          userMessage: 'Please sign in to continue.'
        }), req);
      }
    }
    
    if (!decoded || !decoded.userId) {
      return sendErrorResponse(res, new AppError({
        message: 'Invalid token',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        userMessage: 'Please sign in to continue.'
      }), req);
    }

    // Optimized query - only fetch essential fields for auth check
    const user = await User.findById(decoded.userId)
      .select('username email role accountStatus isSelfDeactivated deactivatedAt')
      .lean();
    
    if (!user) {
      // User doesn't exist - clear all cookies to force fresh login
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      
      // Also revoke any refresh tokens for this non-existent user
      try {
        await RefreshToken.updateMany(
          { user: decoded.userId },
          { revoked: true, revokedAt: new Date() }
        );
      } catch (e) {
        // Silently ignore cleanup errors
      }
      
      return sendErrorResponse(res, new AppError({
        message: 'User not found',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        userMessage: 'Please sign in to continue.'
      }), req);
    }

    // Check if account is active
    // Allow logout and verify endpoints even for deactivated accounts (for cleanup and status checks)
    // Check multiple path variations (Express routers can have different path formats)
    const originalUrl = req.originalUrl || req.url || '';
    const path = req.path || '';
    const baseUrl = req.baseUrl || '';
    
    // Check account status (logging removed for performance - only in development)
    if (user.accountStatus !== 'active' && process.env.NODE_ENV !== 'production') {
      console.log('Auth middleware - Checking paths for deactivated account:', {
        originalUrl,
        path,
        baseUrl,
        accountStatus: user.accountStatus
      });
    }
    
    // Match logout endpoint in various formats (case-insensitive)
    const isLogoutEndpoint = 
      originalUrl.toLowerCase().includes('/logout') || 
      path.toLowerCase().includes('/logout') || 
      originalUrl.toLowerCase().endsWith('/logout') || 
      path.toLowerCase().endsWith('/logout') ||
      path.toLowerCase() === '/logout' ||
      originalUrl.toLowerCase() === '/api/auth/logout' ||
      (baseUrl + path).toLowerCase().includes('/logout');
    
    // Match verify endpoint in various formats (case-insensitive)
    const isVerifyEndpoint = 
      originalUrl.toLowerCase().includes('/verify') || 
      path.toLowerCase().includes('/verify') || 
      originalUrl.toLowerCase().endsWith('/verify') || 
      path.toLowerCase().endsWith('/verify') ||
      path.toLowerCase() === '/verify' ||
      originalUrl.toLowerCase() === '/api/auth/verify' ||
      (baseUrl + path).toLowerCase().includes('/verify');
    
    if (user.accountStatus !== 'active') {
      // SIMPLIFIED: Just check if the URL contains 'logout' or 'verify' anywhere
      // This is more lenient and will catch all variations
      const urlString = (originalUrl + path + baseUrl).toLowerCase();
      const containsLogout = urlString.includes('logout');
      const containsVerify = urlString.includes('verify');
      
      // Allow logout and verify even for deactivated accounts
      if (containsLogout || containsVerify || isLogoutEndpoint || isVerifyEndpoint) {
        // Attach user to request but don't block - let the endpoint handle it
        req.user = user;
        // Only log in development
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Allowing ${containsLogout ? 'logout' : 'verify'} for deactivated account: ${user._id}`);
        }
        return next();
      }
      
      // If we reach here, the endpoint is blocked
      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Blocking request for deactivated account: ${user._id}`);
      }
      
      // User-friendly messages based on account status
      let userMessage = 'Your account access has been temporarily restricted. Our support team can help you restore access.';
      
      // Provide specific, friendly message for self-deactivated accounts
      if (user.accountStatus === 'suspended' && user.isSelfDeactivated) {
        const deactivatedDays = user.deactivatedAt 
          ? Math.floor((new Date() - new Date(user.deactivatedAt)) / (1000 * 60 * 60 * 24))
          : 0;
        
        if (deactivatedDays > 30) {
          userMessage = 'Your account was deactivated more than 30 days ago. To restore your account, please reach out to our support team. We\'re here to help!';
        } else {
          userMessage = 'Your account is currently deactivated. To reactivate it, please contact our support team. We\'ll be happy to assist you!';
        }
      } else if (user.accountStatus === 'suspended') {
        userMessage = 'Your account access has been temporarily restricted. Please contact our support team for assistance. We\'re here to help!';
      } else if (user.accountStatus === 'banned') {
        userMessage = 'Your account has been restricted. If you believe this is an error, please contact our support team for review.';
      }
      
      return sendErrorResponse(res, new AppError({
        message: 'Account suspended',
        statusCode: 403,
        code: 'FORBIDDEN',
        userMessage: userMessage
      }), req);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendErrorResponse(res, new AppError({
        message: 'Invalid token',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        userMessage: 'Please sign in to continue.'
      }), req);
    }
    if (error.name === 'TokenExpiredError') {
      return sendErrorResponse(res, new AppError({
        message: 'Token expired',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        userMessage: 'Your session has expired. Please sign in again.'
      }), req);
    }
    console.error('Auth middleware error:', error);
    return sendErrorResponse(res, new AppError({
      message: 'Authentication failed',
      statusCode: 401,
      code: 'UNAUTHORIZED',
      userMessage: 'Please sign in to continue.'
    }), req);
  }
};

module.exports = authMiddleware;
