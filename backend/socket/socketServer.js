/**
 * Socket.IO Server Configuration
 * 
 * Recent Changes:
 * - Enhanced authentication middleware to support anonymous connections
 * - Added support for WebRTC-based live streaming handlers
 * - Improved CORS configuration with environment-based allowed origins
 * - Added backward compatibility for legacy live stream events
 * - Enhanced error handling for authentication failures
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { initializeLiveStreamHandlers } = require('../websocket/liveStreamHandler');

let io;

const initializeSocket = (server) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : [process.env.FRONTEND_URL || 'http://localhost:3000'];

  io = socketIO(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      // If a token is provided, verify it and attach the user to the socket.
      // If no token is provided, allow the connection as an anonymous socket
      // (useful for public viewers). Handlers must handle socket.user possibly being null.
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow anonymous connection
        socket.userId = null;
        socket.user = null;
        return next();
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Server misconfiguration'));
      }

      const decoded = jwt.verify(token, jwtSecret);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      // If token invalid, treat as anonymous rather than rejecting connection
      console.warn('Socket auth failed, connecting as anonymous:', error?.message || error);
      socket.userId = null;
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId} (socket id ${socket.id})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle notification subscription
    socket.on('subscribe:notifications', () => {
      socket.join(`notifications:${socket.userId}`);
    });

    // Handle message room join
    socket.on('join:conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Handle live stream join (legacy - kept for backward compatibility)
    socket.on('join:livestream', (streamId) => {
      socket.join(`livestream:${streamId}`);
    });

    // Handle live chat message (legacy - kept for backward compatibility)
    socket.on('livestream:message', (data) => {
      io.to(`livestream:${data.streamId}`).emit('livestream:message', {
        ...data,
        user: socket.user,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  // Initialize WebRTC-based live streaming handlers
  initializeLiveStreamHandlers(io);

  return io;
};

const closeSocket = () => {
  if (io) {
    io.removeAllListeners();
    io.close();
    io = undefined;
  }
};

// Helper functions to emit events
const emitNotification = (userId, notification) => {
  if (io) {
    io.to(`notifications:${userId}`).emit('notification', notification);
  }
};

const emitMessage = (conversationId, message) => {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message', message);
  }
};

const emitLiveStreamUpdate = (streamId, update) => {
  if (io) {
    io.to(`livestream:${streamId}`).emit('livestream:update', update);
  }
};

module.exports = {
  initializeSocket,
  emitNotification,
  emitMessage,
  emitLiveStreamUpdate,
  getIO: () => io,
  closeSocket
};

