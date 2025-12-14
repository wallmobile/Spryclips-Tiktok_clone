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

    const user = await User.findById(decoded.userId).select('-password');
    
    // Debug: Log profile data when fetching user
    if (req.path === '/api/auth/verify') {
      console.log('🔍 Auth middleware - User profile check:', {
        userId: user?._id,
        hasProfile: !!user?.profile,
        hasBanner: !!user?.profile?.banner,
        bannerLength: user?.profile?.banner ? user.profile.banner.length : 0
      });
    }
    
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
    if (user.accountStatus !== 'active') {
      return sendErrorResponse(res, new AppError({
        message: 'Account suspended',
        statusCode: 403,
        code: 'FORBIDDEN',
        userMessage: 'Your account has been suspended. Please contact support for assistance.'
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
