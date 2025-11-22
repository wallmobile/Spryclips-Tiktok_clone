/**
 * Standardized API response utility
 */

/**
 * Send success response
 */
const getRequestId = (res) => res?.locals?.requestId || res?.req?.requestId;

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    requestId: getRequestId(res)
  });
};

/**
 * Send paginated response
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || 0,
      totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
    },
    requestId: getRequestId(res)
  });
};

/**
 * Send error response
 */
const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
    requestId: getRequestId(res)
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendPaginated,
  sendError
};

