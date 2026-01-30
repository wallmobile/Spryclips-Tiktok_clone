/**
 * Centralized Logging Utility
 * Provides structured logging with different log levels
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel = logLevels[process.env.LOG_LEVEL?.toUpperCase()] ?? logLevels.INFO;

/**
 * Format log message with timestamp and level
 */
const formatLogMessage = (level, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata,
  };
  return JSON.stringify(logEntry);
};

/**
 * Write log to file
 */
const writeToFile = (level, message, metadata) => {
  const logFile = path.join(logsDir, 'app.log');
  const formatted = formatLogMessage(level, message, metadata);
  
  try {
    fs.appendFileSync(logFile, `${formatted}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

/**
 * Logger class
 */
class Logger {
  error(message, metadata = {}) {
    if (currentLogLevel >= logLevels.ERROR) {
      const formatted = formatLogMessage('ERROR', message, metadata);
      console.error(formatted);
      writeToFile('ERROR', message, metadata);
    }
  }

  warn(message, metadata = {}) {
    if (currentLogLevel >= logLevels.WARN) {
      const formatted = formatLogMessage('WARN', message, metadata);
      console.warn(formatted);
      writeToFile('WARN', message, metadata);
    }
  }

  info(message, metadata = {}) {
    if (currentLogLevel >= logLevels.INFO) {
      const formatted = formatLogMessage('INFO', message, metadata);
      console.log(formatted);
      writeToFile('INFO', message, metadata);
    }
  }

  debug(message, metadata = {}) {
    if (currentLogLevel >= logLevels.DEBUG) {
      const formatted = formatLogMessage('DEBUG', message, metadata);
      console.debug(formatted);
      writeToFile('DEBUG', message, metadata);
    }
  }

  /**
   * Log HTTP request
   */
  request(req, res, responseTime) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.id,
    });
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message, error, metadata = {}) {
    this.error(message, {
      ...metadata,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    });
  }
}

// Export singleton instance
module.exports = new Logger();
