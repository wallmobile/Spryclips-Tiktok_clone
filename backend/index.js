const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Log startup info
console.log('🔧 Starting application...');
console.log(`📁 Working directory: ${__dirname}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Handle uncaught exceptions (but don't exit immediately in development)
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // In development, log but don't exit to allow nodemon to restart
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections (but don't exit immediately in development)
process.on('unhandledRejection', (reason, promise) => {
  // Ignore Redis connection errors - they're handled by the queue
  if (reason && typeof reason === 'object') {
    const errorMsg = reason.message || String(reason);
    const errorCode = reason.code || '';
    
    // Suppress Redis connection errors
    if (errorCode === 'ECONNREFUSED' || 
        errorMsg.includes('ECONNREFUSED') || 
        errorMsg.includes('Redis') ||
        errorMsg.includes('6379')) {
      // Already handled by videoProcessing.js, just return
      return;
    }
  }
  
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In development, log but don't exit to allow nodemon to restart
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

const app = express();

app.disable('x-powered-by');

const requestId = require('./middleware/requestId');
app.use(requestId);

// Trust proxy for secure cookies when behind a proxy (e.g., production load balancers)
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const validateEnvironment = () => {
  const missingVars = [];
  const isProduction = process.env.NODE_ENV === 'production';

  if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is missing from .env file!');
    console.error('💡 Please add JWT_SECRET=your-random-secret-string to .env file');
    if (isProduction) {
      missingVars.push('JWT_SECRET');
    } else {
      // Generate a random secret for development
      const randomSecret = require('crypto').randomBytes(32).toString('hex');
      process.env.JWT_SECRET = randomSecret;
      console.warn('⚠️ JWT_SECRET not configured. Using temporary development secret.');
      console.warn('💡 Add JWT_SECRET to .env file for persistent configuration.');
    }
  } else {
    console.log('✅ JWT_SECRET: Configured');
  }

  if (!process.env.MONGODB_URI) {
    if (isProduction) {
      missingVars.push('MONGODB_URI');
    } else {
      const defaultUri = 'mongodb://localhost:27017/tiktok-clone';
      process.env.MONGODB_URI = defaultUri;
      console.warn(`MONGODB_URI not configured. Using default local instance at ${defaultUri}.`);
    }
  }

  if (isProduction && !process.env.FRONTEND_URL && !process.env.ALLOWED_ORIGINS) {
    missingVars.push('FRONTEND_URL or ALLOWED_ORIGINS');
  }

  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnvironment();

const getAllowedOrigins = () => {
  const productionOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);

  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? productionOrigins
    : ['http://localhost:3000', 'http://localhost:3001'];

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    console.error('No allowed origins configured for production. Set ALLOWED_ORIGINS or FRONTEND_URL.');
    process.exit(1);
  }

  return allowedOrigins;
};

const allowedOrigins = getAllowedOrigins();

// Log allowed origins on startup
console.log('🌐 Allowed CORS origins:', allowedOrigins);
console.log('🔒 CORS credentials:', true);

const buildContentSecurityPolicy = () => {
  const styleSrc = ["'self'", "https://fonts.googleapis.com"];
  const scriptSrc = ["'self'"];
  const connectSrc = new Set(["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "data:", "blob:"]);

  if (process.env.NODE_ENV !== 'production') {
    styleSrc.push("'unsafe-inline'");
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
    connectSrc.add('http://localhost:5000');
    connectSrc.add('ws://localhost:5000');
    connectSrc.add('ws://localhost:3000');
    connectSrc.add('http://localhost:3000');
    connectSrc.add('http://localhost:3001');
    connectSrc.add('ws://localhost:3001');
  } else {
    // In production, allow inline styles for dynamic content
    styleSrc.push("'unsafe-inline'");
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  }

  allowedOrigins.forEach(origin => {
    connectSrc.add(origin);
    try {
      const url = new URL(origin);
      const wsOrigin = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`;
      connectSrc.add(wsOrigin);
    } catch (error) {
      console.warn(`Invalid origin provided in configuration: ${origin}`);
    }
  });

  return {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc,
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc,
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: Array.from(connectSrc),
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"]
    }
  };
};

// Security middleware - Helmet.js
app.use(helmet({
  contentSecurityPolicy: buildContentSecurityPolicy(),
  crossOriginEmbedderPolicy: false, // Allow embedding for video players
  crossOriginResourcePolicy: {
    policy: process.env.NODE_ENV === 'production' ? 'same-site' : 'cross-origin'
  }
}));

// Compression with optimized settings
app.use(compression({
  level: 6, // Balanced compression (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression for all other requests
    return compression.filter(req, res);
  }
}));

// Prevent HTTP parameter pollution
app.use(hpp({
  whitelist: ['hashtags', 'tags', 'categories']
}));

// Sanitize user input
app.use(mongoSanitize());
app.use(xssClean());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origin for debugging
    console.warn(`⚠️ CORS blocked origin: ${origin}`);
    console.warn(`   Allowed origins:`, allowedOrigins);
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Cookie parser
app.use(cookieParser());

// Request logging
const requestLogger = require('./middleware/requestLogger');
const seedSampleData = require('./utils/seedSampleData');
app.use(requestLogger);

// Body parser middleware - increased limit for large base64 images (banners can be 2-3MB base64)
app.use(express.json({ limit: '50mb' })); // Increased limit for large base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// PUBLIC UPLOADS DIRECTORY CONFIGURATION
// In production, Nginx will serve files directly from /home/reactmaster/uploads
// In development, we serve from the configured uploads directory
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const PROCESSED_DIR = process.env.PROCESSED_DIR || path.join(__dirname, 'processed');

// Serve uploaded files and processed videos
// NOTE: In production with Nginx, these routes won't be hit as Nginx serves files directly
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/processed', express.static(PROCESSED_DIR));

console.log(`📁 Serving uploads from: ${UPLOADS_DIR}`);

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok-clone';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Ensure admin user exists (non-blocking)
    const ensureAdminUser = require('./utils/ensureAdminUser');
    ensureAdminUser().catch(err => {
      console.warn('⚠️ Admin user initialization failed:', err.message);
    });
    
    // Seed sample data (non-blocking)
    seedSampleData().catch(err => {
      console.warn('⚠️ Sample data seeding failed:', err.message);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.warn('⚠️ Server will continue without database. Some features may not work.');
    console.warn('💡 Make sure MongoDB is running or set SKIP_DB_CONNECT=true in .env');
    // Don't exit in development - let server start anyway
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

if (process.env.SKIP_DB_CONNECT === 'true') {
  console.warn('⚠️ MongoDB connection skipped due to SKIP_DB_CONNECT flag.');
} else {
  connectDB();
}

// Rate limiting
const { generalLimiter } = require('./utils/rateLimiter');
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Documentation
const { swaggerSpec, swaggerUi } = require('./utils/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Base API route - Welcome message
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Spryclips API',
    version: '1.0.0',
    endpoints: {
      documentation: '/api-docs',
      auth: '/api/auth',
      videos: '/api/videos',
      users: '/api/users',
      upload: '/api/upload',
      search: '/api/search',
      analytics: '/api/analytics',
      live: '/api/live',
      more: 'See /api-docs for complete API documentation'
    },
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// API Versioning - v1 routes
app.use('/api/v1', require('./routes/v1'));

// Legacy routes (backward compatibility - redirect to v1)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/process', require('./routes/process-video'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/products', require('./routes/products'));
app.use('/api/creator-academy', require('./routes/creator-academy'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/video-features', require('./routes/video-features'));
app.use('/api/music', require('./routes/music'));
app.use('/api/search', require('./routes/search'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/drafts', require('./routes/drafts'));
app.use('/api/video-interactions', require('./routes/video-interactions'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/monetization', require('./routes/monetization'));
app.use('/api/partnerships', require('./routes/partnerships'));
app.use('/api/business', require('./routes/business'));
app.use('/api/live', require('./routes/live'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/hashtags', require('./routes/hashtags'));
app.use('/api/verification', require('./routes/verification'));
app.use('/api/2fa', require('./routes/2fa'));
app.use('/api/effects', require('./routes/effects'));
app.use('/api/video-qa', require('./routes/video-qa'));
app.use('/api/collaborations', require('./routes/collaborations'));
app.use('/api/more', require('./routes/more'));
app.use('/api/cdn-issues', require('./routes/cdn-issues'));
app.use('/api/video-views', require('./routes/video-views'));
app.use('/api/admin/monetization', require('./routes/admin-monetization'));
app.use('/api/admin', require('./routes/admin'));

// 404 handler
const { AppError, sendErrorResponse, handleMongooseError, handleJWTError } = require('./utils/errorHandler');
// If running in production and a frontend build exists, serve it and inject
// a small script that sets `window.__APP_ENV = 'production'` so the
// frontend runtime config can reliably detect production.
if (process.env.NODE_ENV === 'production') {
  try {
    const frontendBuildPath = process.env.FRONTEND_BUILD_DIR || path.join(__dirname, '../frontend/build');
    if (fs.existsSync(frontendBuildPath)) {
      app.use(express.static(frontendBuildPath));

      app.get('*', (req, res, next) => {
        // Let API and uploads/processed routes go through
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/processed')) {
          return next();
        }

        const indexPath = path.join(frontendBuildPath, 'index.html');
        fs.readFile(indexPath, 'utf8', (err, data) => {
          if (err) return next();
          // Inject before closing </head>
          const injected = data.replace('</head>', "  <script>window.__APP_ENV = 'production';</script></head>");
          res.send(injected);
        });
      });
    } else {
      console.warn('⚠️ Frontend build directory not found at', frontendBuildPath);
    }
  } catch (err) {
    console.warn('⚠️ Error setting up frontend static serving:', err.message);
  }
}

app.use((req, res, next) => {
  next(new AppError({
    message: 'Route not found',
    statusCode: 404,
    code: 'NOT_FOUND',
    isOperational: true,
    userMessage: 'We could not find what you were looking for.',
    details: {
      path: req.originalUrl,
      method: req.method
    }
  }));
});

// Global error handler
app.use((err, req, res, next) => {
  let error = err;

  if (error?.name === 'SyntaxError' && 'body' in error) {
    error = new AppError({
      message: 'Invalid JSON payload',
      statusCode: 400,
      code: 'INVALID_JSON',
      isOperational: true,
      userMessage: 'We could not understand the data sent. Please check your input and try again.',
      details: {
        body: error.body
      },
      cause: error
    });
  }

  if (error?.name === 'ValidationError' || error?.name === 'CastError' || error?.code === 11000) {
    error = handleMongooseError(error);
  }

  if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
    error = handleJWTError(error);
  }

  if (error?.message === 'Not allowed by CORS') {
    error = new AppError({
      message: 'Origin not allowed',
      statusCode: 403,
      code: 'CORS_NOT_ALLOWED',
      isOperational: true,
      userMessage: 'This application is not available from your current origin.',
      details: {
        origin: req.headers.origin
      },
      cause: error
    });
  }

  if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      error = new AppError({
        message: 'File too large',
        statusCode: 400,
        code: 'UPLOAD_FILE_TOO_LARGE',
        isOperational: true,
        userMessage: 'The file you selected is too large. Please choose a smaller file.',
        details: {
          field: error.field,
          limit: error.limit
        },
        cause: error
      });
    } else {
      error = new AppError({
        message: error.message || 'Upload failed',
        statusCode: 400,
        code: 'UPLOAD_ERROR',
        isOperational: true,
        userMessage: 'We could not process the upload right now. Please try again.',
        details: {
          field: error.field,
          multerCode: error.code
        },
        cause: error
      });
    }
  }

  if (!(error instanceof AppError)) {
    const statusCode =
      typeof error?.statusCode === 'number'
        ? error.statusCode
        : typeof error?.status === 'number'
          ? error.status
          : 500;

    error = new AppError({
      message: error?.message || 'Internal server error',
      statusCode,
      isOperational: false,
      details: error?.details,
      code: statusCode >= 500 ? 'SERVER_ERROR' : undefined,
      cause: error
    });
  }

  sendErrorResponse(res, error, req);
});

const PORT = process.env.PORT || 5000;
const { initializeSocket, closeSocket } = require('./socket/socketServer');

const isTestEnv = process.env.NODE_ENV === 'test';

let server;

if (!isTestEnv) {
  try {
    console.log('🚀 Starting server...');
    server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`📚 Docs: http://localhost:${PORT}/api-docs`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
        console.error(`💡 Try: lsof -ti:${PORT} | xargs kill (Mac/Linux) or netstat -ano | findstr :${PORT} (Windows)`);
        // In development, don't exit - let nodemon handle it
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', error);
        // In development, don't exit - let nodemon handle it
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      }
    });

    server.on('listening', () => {
      console.log('✅ Server is listening and ready to accept connections');
    });

    initializeSocket(server);

    // Cleanup stuck processing videos - run every 10 minutes
    // Only setup cleanup if MongoDB is connected
    const setupCleanupJob = () => {
      try {
        const Video = require('./models/Video');
        const cleanupStuckVideos = async () => {
          try {
            if (mongoose.connection.readyState !== 1) {
              return; // Skip if MongoDB not connected
            }
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
            
            const stuckVideos = await Video.updateMany(
              {
                status: 'processing',
                updatedAt: { $lt: thirtyMinutesAgo }
              },
              {
                $set: {
                  status: 'failed',
                  processingError: 'Video processing timed out after 30 minutes. Please try uploading again or retry processing.'
                }
              }
            );

            if (stuckVideos.modifiedCount > 0) {
              console.log(`🧹 Cleaned up ${stuckVideos.modifiedCount} stuck processing video(s)`);
            }
          } catch (error) {
            console.error('❌ Error cleaning up stuck videos:', error.message);
          }
        };

        // Run cleanup immediately, then every 10 minutes
        cleanupStuckVideos();
        setInterval(cleanupStuckVideos, 10 * 60 * 1000); // Every 10 minutes
        console.log('🧹 Stuck video cleanup job started (runs every 10 minutes)');
      } catch (error) {
        console.warn('⚠️ Could not setup cleanup job:', error.message);
      }
    };

    // Setup cleanup job when MongoDB connects
    if (mongoose.connection.readyState === 1) {
      setupCleanupJob();
    } else {
      mongoose.connection.once('connected', () => {
        setupCleanupJob();
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack:', error.stack);
    // In development, don't exit - let nodemon handle it
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
} else {
  server = app;
}

const shutdown = async () => {
  closeSocket();

  if (isTestEnv) {
    return;
  }
  if (!server || typeof server.close !== 'function') {
    return;
  }
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err && err.message !== 'Server is not running.') {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

module.exports = { app, server, shutdown };
