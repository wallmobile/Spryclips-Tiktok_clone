/**
 * Standardized error response utility
 */

const logger = require('./logger');

const DEFAULT_ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE'
};

const DEFAULT_USER_MESSAGES = {
  400: 'We could not process your request. Please check the information and try again.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to complete this action.',
  404: 'We could not find what you were looking for.',
  408: 'The request took too long. Please try again.',
  409: 'This action could not be completed because of a conflict.',
  422: 'Some of the information provided is invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again in a moment.',
  503: 'The service is temporarily unavailable. Please try again later.'
};

const getDefaultErrorCode = (statusCode = 500) => {
  const code = DEFAULT_ERROR_CODES[statusCode];
  if (code) {
    return code;
  }
  if (statusCode >= 500) {
    return 'SERVER_ERROR';
  }
  if (statusCode >= 400 && statusCode < 500) {
    return 'CLIENT_ERROR';
  }
  return 'UNEXPECTED_ERROR';
};

const getDefaultUserMessage = (statusCode = 500, errorCode, fallbackMessage) => {
  if (typeof fallbackMessage === 'string' && fallbackMessage.trim().length > 0) {
    return fallbackMessage;
  }
  const message = DEFAULT_USER_MESSAGES[statusCode];
  if (message) {
    return message;
  }
  if (statusCode >= 500) {
    return DEFAULT_USER_MESSAGES[500];
  }
  if (statusCode >= 400) {
    return DEFAULT_USER_MESSAGES[400];
  }
  return 'We ran into an unexpected issue. Please try again.';
};

class AppError extends Error {
  constructor(messageOrConfig, statusCode = 500, isOperational = true, details = undefined, code, userMessage) {
    if (typeof messageOrConfig === 'object' && messageOrConfig !== null && !(messageOrConfig instanceof Error)) {
      const {
        message = 'Internal server error',
        statusCode: status = 500,
        isOperational: operational = true,
        details: errorDetails,
        code: explicitCode,
        userMessage: explicitUserMessage,
        meta,
        cause
      } = messageOrConfig;

      super(message);

      this.statusCode = typeof status === 'number' ? status : 500;
      this.isOperational = Boolean(operational);
      this.details = errorDetails;
      this.code = explicitCode || getDefaultErrorCode(this.statusCode);
      this.userMessage = explicitUserMessage || getDefaultUserMessage(this.statusCode, this.code, message);

      if (meta) {
        this.meta = meta;
      }
      if (cause) {
        this.cause = cause;
      }
    } else {
      const fallbackMessage = typeof messageOrConfig === 'string' && messageOrConfig.trim().length > 0
        ? messageOrConfig
        : 'Internal server error';

      super(fallbackMessage);

      this.statusCode = typeof statusCode === 'number' ? statusCode : 500;
      this.isOperational = Boolean(isOperational);
      this.details = details;
      this.code = code || getDefaultErrorCode(this.statusCode);
      this.userMessage = userMessage || getDefaultUserMessage(this.statusCode, this.code, fallbackMessage);
    }

    if (!this.userMessage || this.userMessage.trim().length === 0) {
      this.userMessage = getDefaultUserMessage(this.statusCode, this.code, this.message);
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Standardized error response format
 */
const sendErrorResponse = (res, error, req = null) => {
  const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  const errorCode = error?.code || getDefaultErrorCode(statusCode);

  const computedUserMessage = (() => {
    if (typeof error?.userMessage === 'string' && error.userMessage.trim().length > 0) {
      return error.userMessage;
    }
    if (statusCode >= 500) {
      return getDefaultUserMessage(statusCode, errorCode, undefined);
    }
    if (typeof error?.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
    return getDefaultUserMessage(statusCode, errorCode, undefined);
  })();

  if (computedUserMessage && computedUserMessage !== error?.userMessage) {
    error.userMessage = computedUserMessage;
  }

  const requestId = req?.requestId || res?.locals?.requestId;

  const responsePayload = {
    success: false,
    message: computedUserMessage,
    userMessage: computedUserMessage,
    errorCode,
    requestId,
    ...(error?.details ? { details: error.details } : {})
  };

  const debugPayload = {
    error: error?.name,
    message: error?.message,
    stack: error?.stack,
    code: errorCode,
    requestId,
    timestamp: new Date().toISOString(),
    path: req?.originalUrl,
    method: req?.method,
    ip: req?.ip,
    user: req?.user?._id
  };

  if (process.env.NODE_ENV === 'development') {
    responsePayload.debug = debugPayload;
  } else if (statusCode >= 500) {
    responsePayload.message = DEFAULT_USER_MESSAGES[500];
    responsePayload.userMessage = DEFAULT_USER_MESSAGES[500];
  }

  logger.error('Application error', debugPayload);

  res.status(statusCode).json(responsePayload);
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle Mongoose errors
 */
const handleMongooseError = (error) => {
  if (error?.name === 'ValidationError') {
    const messages = Object.values(error.errors || {}).map((e) => e.message);
    return new AppError({
      message: 'Validation failed',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      isOperational: true,
      userMessage: 'Some fields need your attention. Please review the highlighted information and try again.',
      details: messages,
      cause: error
    });
  }
  if (error?.name === 'CastError') {
    return new AppError({
      message: 'Invalid ID format',
      statusCode: 400,
      code: 'INVALID_ID',
      isOperational: true,
      userMessage: 'We could not find the requested resource. Please verify the link and try again.',
      details: {
        path: error.path,
        value: error.value
      },
      cause: error
    });
  }
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'resource';
    return new AppError({
      message: `${field} already exists`,
      statusCode: 409,
      code: 'DUPLICATE_RESOURCE',
      isOperational: true,
      userMessage: 'This information is already in use. Please choose something different.',
      details: {
        field,
        value: error.keyValue ? error.keyValue[field] : undefined
      },
      cause: error
    });
  }
  return error;
};

/**
 * Handle JWT errors
 */
const handleJWTError = (error) => {
  if (error?.name === 'JsonWebTokenError') {
    return new AppError({
      message: 'Invalid token',
      statusCode: 401,
      code: 'INVALID_TOKEN',
      isOperational: true,
      userMessage: 'Your session is not valid. Please sign in again.',
      cause: error
    });
  }
  if (error?.name === 'TokenExpiredError') {
    return new AppError({
      message: 'Token expired',
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      isOperational: true,
      userMessage: 'Your session has expired. Please sign in again.',
      cause: error
    });
  }
  return error;
};

module.exports = {
  AppError,
  sendErrorResponse,
  asyncHandler,
  handleMongooseError,
  handleJWTError
};

