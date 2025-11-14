const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error'));
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
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

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

    // Handle live stream join
    socket.on('join:livestream', (streamId) => {
      socket.join(`livestream:${streamId}`);
    });

    // Handle live chat message
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

