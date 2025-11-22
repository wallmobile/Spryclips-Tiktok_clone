const { randomUUID } = require('crypto');

/**
 * Ensure every request has a traceable identifier.
 * Accepts inbound correlation headers and sets `req.requestId`.
 */
const requestId = (req, res, next) => {
  const headerRequestId =
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    req.headers['x-requestid'];

  const id =
    (typeof headerRequestId === 'string' && headerRequestId.trim().length > 0
      ? headerRequestId.trim()
      : randomUUID());

  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  if (!res.locals) {
    res.locals = {};
  }
  res.locals.requestId = id;

  next();
};

module.exports = requestId;


