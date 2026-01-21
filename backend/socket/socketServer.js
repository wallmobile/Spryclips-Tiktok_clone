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
    : [process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://spryclips.com' : 'http://localhost:3000')];

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

    // Join user's personal room (only if authenticated)
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`User ${socket.userId} joined personal room`);
    }

    // Handle notification subscription
    socket.on('subscribe:notifications', () => {
      if (socket.userId) {
        socket.join(`notifications:${socket.userId}`);
      }
    });

    // Handle message room join
    socket.on('join:conversation', (conversationId) => {
      console.log(`User ${socket.userId} joined conversation:${conversationId}`);
      socket.join(`conversation:${conversationId}`);
    });

    // Handle message room leave
    socket.on('leave:conversation', (conversationId) => {
      console.log(`User ${socket.userId} left conversation:${conversationId}`);
      socket.leave(`conversation:${conversationId}`);
    });

    // ==================== MESSAGE HANDLERS ====================
    
    // Handle typing indicator
    socket.on('message:typing', (data) => {
      const { conversationId, isTyping } = data;
      if (!socket.userId || !conversationId) return;
      
      // Broadcast typing status to other participants in the conversation
      socket.to(`conversation:${conversationId}`).emit('message:typing', {
        conversationId,
        userId: socket.userId,
        username: socket.user?.username || 'User',
        isTyping
      });
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

    // ==================== CALL SIGNALING HANDLERS ====================
    
    // Handle call initiation
    socket.on('call:initiate', (data) => {
      try {
        const { callId, callType, targetUserId, offer } = data;
        
        // Check if caller is authenticated
        if (!socket.userId) {
          socket.emit('call:error', { 
            callId, 
            message: 'You must be logged in to make calls' 
          });
          return;
        }
        
        // Convert targetUserId to string for comparison
        const targetUserIdStr = String(targetUserId);
        console.log(`[Call] User ${socket.userId} initiating ${callType} call to ${targetUserIdStr}`);
        
        // Find target user's socket (compare as strings)
        const targetSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId && String(s.userId) === targetUserIdStr);
        
        if (!targetSocket) {
          console.log(`[Call] Target user ${targetUserIdStr} not found online. Available users:`, 
            Array.from(io.sockets.sockets.values())
              .filter(s => s.userId)
              .map(s => s.userId)
          );
          socket.emit('call:error', { 
            callId, 
            message: 'User is not online' 
          });
          return;
        }
        
        // Send call request to target
        targetSocket.emit('call:incoming', {
          callId,
          callType,
          caller: {
            id: socket.userId,
            username: socket.user?.username,
            displayName: socket.user?.profile?.displayName || socket.user?.username,
            avatar: socket.user?.profile?.avatar
          },
          offer
        });
        
        console.log(`[Call] Call request sent to ${targetUserId}`);
      } catch (error) {
        console.error('[Call] Error initiating call:', error);
        socket.emit('call:error', { 
          callId: data?.callId, 
          message: 'Failed to initiate call' 
        });
      }
    });
    
    // Handle call answer
    socket.on('call:answer', (data) => {
      try {
        const { callId, answer, targetUserId } = data;
        
        if (!socket.userId) {
          return;
        }
        
        const targetUserIdStr = String(targetUserId);
        console.log(`[Call] User ${socket.userId} answering call ${callId}`);
        
        const targetSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId && String(s.userId) === targetUserIdStr);
        
        if (targetSocket) {
          targetSocket.emit('call:accepted', {
            callId,
            answer
          });
          console.log(`[Call] Answer sent to ${targetUserIdStr}`);
        } else {
          console.log(`[Call] Target user ${targetUserIdStr} not found when answering call`);
        }
      } catch (error) {
        console.error('[Call] Error answering call:', error);
      }
    });
    
    // Handle call rejection
    socket.on('call:reject', (data) => {
      try {
        const { callId, targetUserId } = data;
        
        if (!socket.userId) {
          return;
        }
        
        const targetUserIdStr = String(targetUserId);
        console.log(`[Call] User ${socket.userId} rejecting call ${callId}`);
        
        const targetSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId && String(s.userId) === targetUserIdStr);
        
        if (targetSocket) {
          targetSocket.emit('call:rejected', { callId });
          console.log(`[Call] Rejection sent to ${targetUserIdStr}`);
        }
      } catch (error) {
        console.error('[Call] Error rejecting call:', error);
      }
    });
    
    // Handle call end
    socket.on('call:end', (data) => {
      try {
        const { callId, targetUserId } = data;
        
        if (!socket.userId) {
          return;
        }
        
        const targetUserIdStr = String(targetUserId);
        console.log(`[Call] User ${socket.userId} ending call ${callId}`);
        
        const targetSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId && String(s.userId) === targetUserIdStr);
        
        if (targetSocket) {
          targetSocket.emit('call:ended', { callId });
          console.log(`[Call] End notification sent to ${targetUserIdStr}`);
        }
      } catch (error) {
        console.error('[Call] Error ending call:', error);
      }
    });
    
    // Handle ICE candidate forwarding
    socket.on('call:ice-candidate', (data) => {
      try {
        const { callId, candidate, targetUserId } = data;
        
        if (!socket.userId) {
          return;
        }
        
        const targetUserIdStr = String(targetUserId);
        
        const targetSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId && String(s.userId) === targetUserIdStr);
        
        if (targetSocket) {
          targetSocket.emit('call:ice-candidate', {
            callId,
            candidate
          });
        }
      } catch (error) {
        console.error('[Call] Error forwarding ICE candidate:', error);
      }
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

