/**
 * Structured logging utility
 * In production, this would integrate with Winston or similar
 */

const logLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

const log = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };

  // In production, send to logging service
  // For now, use console with structured format
  const logMethod = level === 'error' ? console.error :
                   level === 'warn' ? console.warn :
                   level === 'info' ? console.info :
                   console.log;

  logMethod(JSON.stringify(logEntry));
};

const logger = {
  error: (message, meta) => log(logLevels.ERROR, message, meta),
  warn: (message, meta) => log(logLevels.WARN, message, meta),
  info: (message, meta) => log(logLevels.INFO, message, meta),
  debug: (message, meta) => log(logLevels.DEBUG, message, meta)
};

module.exports = logger;

