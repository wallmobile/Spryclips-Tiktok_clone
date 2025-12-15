/**
 * WebRTC Live Stream WebSocket Handlers
 * 
 * Recent Changes:
 * - Implemented WebRTC-based peer-to-peer live streaming
 * - Added support for host, viewer, and guest roles
 * - Enhanced room management with activeRooms Map
 * - Added WebRTC signaling handlers (offer, answer, ICE candidates)
 * - Implemented guest connection request/accept/reject flow
 * - Added real-time chat and reaction features
 * - Improved disconnect handling and cleanup
 */

const LiveStream = require('../models/LiveStream');
const User = require('../models/User');
const LiveChat = require('../models/LiveChat');

// Store active connections: roomId -> { host: socketId, viewers: Set, guests: Map }
const activeRooms = new Map();

// Store WebRTC peer connections: socketId -> { roomId, peerConnection, role }
const peerConnections = new Map();

// Store guest connection requests: roomId -> Map<guestId, { socketId, user, timestamp }>
const guestRequests = new Map();

let ioInstance;

/**
 * Initialize live stream WebSocket handlers
 */
const initializeLiveStreamHandlers = (io) => {
  ioInstance = io;
  
  io.on('connection', (socket) => {
    console.log(`[LiveStream] User connected: ${socket.userId}`);

    // ==================== JOIN LIVE ROOM ====================
    socket.on('live:join', async (data) => {
      try {
        const { roomId: providedRoomId, role } = data; // role: 'host', 'viewer', 'guest'

        if (!providedRoomId) {
          return socket.emit('live:error', { message: 'Room ID is required' });
        }

        // Accept either the Mongo _id or the public roomId field. Find the live stream by either.
        const liveStream = await LiveStream.findOne({ 
          $or: [ { _id: providedRoomId }, { roomId: providedRoomId } ],
          status: 'live'
        }).populate('streamer', 'username profile');

        if (!liveStream) {
          return socket.emit('live:error', { message: 'Live stream not found or not active' });
        }

        // Check per-stream bans
        if (socket.userId) {
          const bannedEntry = (liveStream.bannedUsers || []).find(b => b.user?.toString() === socket.userId?.toString());
          if (bannedEntry) {
            const now = new Date();
            if (!bannedEntry.bannedUntil || new Date(bannedEntry.bannedUntil) > now) {
              return socket.emit('live:error', { message: 'You are banned from this stream' });
            }
          }
        }

        const canonicalRoomId = liveStream._id.toString();

        // Initialize room if it doesn't exist (keyed by canonical Mongo _id)
        if (!activeRooms.has(canonicalRoomId)) {
          activeRooms.set(canonicalRoomId, {
            host: null,
            viewers: new Set(),
            guests: new Map(),
            stream: liveStream
          });
        }

        const room = activeRooms.get(canonicalRoomId);

        // Handle different roles
        if (role === 'host') {
          // Verify host ownership
          if (socket.userId && liveStream.streamer._id.toString() !== socket.userId) {
            return socket.emit('live:error', { message: 'Not authorized as host' });
          }
          room.host = socket.id;
          socket.join(`live:${canonicalRoomId}:host`);
          socket.emit('live:joined', { roomId: canonicalRoomId, role: 'host' });

          // Notify all viewers that host is online
          ioInstance.to(`live:${canonicalRoomId}:viewers`).emit('live:host-online', { roomId: canonicalRoomId });
        } else if (role === 'viewer') {
          room.viewers.add(socket.id);
          socket.join(`live:${canonicalRoomId}:viewers`);
          
          // Update viewer count
          liveStream.viewers = room.viewers.size;
          await liveStream.save();

          socket.emit('live:joined', { 
            roomId: canonicalRoomId, 
            role: 'viewer',
            viewerCount: liveStream.viewers,
            hostSocketId: room.host // Send host socket ID to viewer
          });

          // Broadcast updated viewer count to host
          ioInstance.to(`live:${canonicalRoomId}:host`).emit('live:viewer-count', { 
            count: liveStream.viewers 
          });

          // Notify host that a new viewer wants to connect (for WebRTC)
          if (room.host) {
            const hostSocket = ioInstance.sockets.sockets.get(room.host);
            if (hostSocket) {
              console.log(`[LiveStream] Notifying host ${room.host} of viewer ${socket.id} (${socket.userId})`);
              hostSocket.emit('live:viewer-request', {
                viewerId: socket.userId,
                viewerSocketId: socket.id
              });
            }
          }
        } else if (role === 'guest') {
          // Guest connections are handled separately via guest:request
          return socket.emit('live:error', { message: 'Use guest:request to join as guest' });
        }

        // Store socket info using canonical room id
        socket.roomId = canonicalRoomId;
        socket.role = role;

        console.log(`[LiveStream] ${socket.userId} joined room ${canonicalRoomId} as ${role}`);
      } catch (error) {
        console.error('[LiveStream] Error joining room:', error);
        socket.emit('live:error', { message: 'Failed to join room', error: error.message });
      }
    });

    // ==================== LEAVE LIVE ROOM ====================
    socket.on('live:leave', async () => {
      try {
        const { roomId, role } = socket;

        if (!roomId) return;

        const room = activeRooms.get(roomId);
        if (!room) return;

        if (role === 'host') {
          room.host = null;
          // Notify viewers that host left
          ioInstance.to(`live:${roomId}:viewers`).emit('live:host-offline', { roomId });
        } else if (role === 'viewer') {
          room.viewers.delete(socket.id);

          // Notify host that viewer left (for WebRTC cleanup)
          if (room.host) {
            const hostSocket = ioInstance.sockets.sockets.get(room.host);
            if (hostSocket) {
              console.log(`[LiveStream] Notifying host ${room.host} of viewer ${socket.id} (${socket.userId})`);
              hostSocket.emit('live:viewer-request', {
                viewerId: socket.userId,
                viewerSocketId: socket.id
              });
            }
          }

          // Update viewer count
          const liveStream = await LiveStream.findById(roomId);
          if (liveStream) {
            liveStream.viewers = Math.max(0, room.viewers.size);
            await liveStream.save();

            // Broadcast updated viewer count to host
            ioInstance.to(`live:${roomId}:host`).emit('live:viewer-count', { 
              count: liveStream.viewers 
            });
          }
        } else if (role === 'guest') {
          room.guests.delete(socket.id);
          // Notify host and viewers that guest left
          ioInstance.to(`live:${roomId}:host`).emit('live:guest-left', { 
            guestId: socket.userId 
          });
          ioInstance.to(`live:${roomId}:viewers`).emit('live:guest-left', { 
            guestId: socket.userId 
          });
        }

        socket.leave(`live:${roomId}:host`);
        socket.leave(`live:${roomId}:viewers`);
        delete socket.roomId;
        delete socket.role;

        console.log(`[LiveStream] ${socket.userId} left room ${roomId}`);
      } catch (error) {
        console.error('[LiveStream] Error leaving room:', error);
      }
    });

    // ==================== WEBRTC SIGNALING: OFFER ====================
    socket.on('webrtc:offer', (data) => {
      try {
        const { roomId, offer, targetId } = data;
        const room = activeRooms.get(roomId);
        
        if (!room) {
          return socket.emit('webrtc:error', { message: 'Room not found' });
        }

        // Forward offer to target (host or guest)
        const targetSocket = ioInstance.sockets.sockets.get(targetId);
        console.log(`[WebRTC] Offer from ${socket.id} -> target ${targetId} (room ${roomId})`);
        if (targetSocket) {
          targetSocket.emit('webrtc:offer', {
            offer,
            fromId: socket.id,
            fromUserId: socket.userId
          });
        } else {
          console.warn('[WebRTC] Target socket not found for offer:', targetId);
        }
      } catch (error) {
        console.error('[WebRTC] Error handling offer:', error);
        socket.emit('webrtc:error', { message: 'Failed to send offer' });
      }
    });

    // ==================== WEBRTC SIGNALING: ANSWER ====================
    socket.on('webrtc:answer', (data) => {
      try {
        const { roomId, answer, targetId } = data;
        const room = activeRooms.get(roomId);
        
        if (!room) {
          return socket.emit('webrtc:error', { message: 'Room not found' });
        }

        // Forward answer to target
        const targetSocket = ioInstance.sockets.sockets.get(targetId);
        console.log(`[WebRTC] Answer from ${socket.id} -> target ${targetId} (room ${roomId})`);
        if (targetSocket) {
          targetSocket.emit('webrtc:answer', {
            answer,
            fromId: socket.id,
            fromUserId: socket.userId
          });
        } else {
          console.warn('[WebRTC] Target socket not found for answer:', targetId);
        }
      } catch (error) {
        console.error('[WebRTC] Error handling answer:', error);
        socket.emit('webrtc:error', { message: 'Failed to send answer' });
      }
    });

    // ==================== WEBRTC SIGNALING: ICE CANDIDATE ====================
    socket.on('webrtc:ice-candidate', (data) => {
      try {
        const { roomId, candidate, targetId } = data;
        const room = activeRooms.get(roomId);
        
        if (!room) {
          return socket.emit('webrtc:error', { message: 'Room not found' });
        }

        // Forward ICE candidate to target
        const targetSocket = ioInstance.sockets.sockets.get(targetId);
        console.log(`[WebRTC] ICE from ${socket.id} -> target ${targetId} (room ${roomId})`);
        if (targetSocket) {
          targetSocket.emit('webrtc:ice-candidate', {
            candidate,
            fromId: socket.id,
            fromUserId: socket.userId
          });
        } else {
          console.warn('[WebRTC] Target socket not found for ICE candidate:', targetId);
        }
      } catch (error) {
        console.error('[WebRTC] Error handling ICE candidate:', error);
        socket.emit('webrtc:error', { message: 'Failed to send ICE candidate' });
      }
    });

    // ==================== GUEST CONNECTION REQUEST ====================
    socket.on('guest:request', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          return socket.emit('guest:error', { message: 'Room ID is required' });
        }

        const room = activeRooms.get(roomId);
        if (!room || !room.host) {
          return socket.emit('guest:error', { message: 'Room not found or host not online' });
        }

        // Check if already a guest
        if (room.guests.has(socket.id)) {
          return socket.emit('guest:error', { message: 'Already connected as guest' });
        }

        // Store guest request
        if (!guestRequests.has(roomId)) {
          guestRequests.set(roomId, new Map());
        }
        
        const requests = guestRequests.get(roomId);
        requests.set(socket.userId, {
          socketId: socket.id,
          user: socket.user,
          timestamp: new Date()
        });

        // Notify host
        const hostSocket = ioInstance.sockets.sockets.get(room.host);
        if (hostSocket) {
          hostSocket.emit('guest:request-received', {
            guestId: socket.userId,
            guestSocketId: socket.id,
            guest: {
              _id: socket.user._id,
              username: socket.user.username,
              profile: socket.user.profile
            },
            timestamp: new Date()
          });
        }

        socket.emit('guest:request-sent', { roomId });
        console.log(`[Guest] ${socket.userId} requested to join room ${roomId}`);
      } catch (error) {
        console.error('[Guest] Error requesting connection:', error);
        socket.emit('guest:error', { message: 'Failed to send request' });
      }
    });

    // ==================== HOST ACCEPTS GUEST ====================
    socket.on('guest:accept', async (data) => {
      try {
        const { roomId, guestId } = data;
        
        const room = activeRooms.get(roomId);
        if (!room || room.host !== socket.id) {
          return socket.emit('guest:error', { message: 'Not authorized as host' });
        }

        const requests = guestRequests.get(roomId);
        if (!requests || !requests.has(guestId)) {
          return socket.emit('guest:error', { message: 'Guest request not found' });
        }

        const guestRequest = requests.get(guestId);
        const guestSocket = ioInstance.sockets.sockets.get(guestRequest.socketId);
        
        if (!guestSocket) {
          requests.delete(guestId);
          return socket.emit('guest:error', { message: 'Guest disconnected' });
        }

        // Add guest to room
        room.guests.set(guestSocket.id, {
          userId: guestId,
          socketId: guestSocket.id
        });
        
        guestSocket.roomId = roomId;
        guestSocket.role = 'guest';
        guestSocket.join(`live:${roomId}:guests`);

        // Remove request
        requests.delete(guestId);

        // Notify guest
        guestSocket.emit('guest:accepted', {
          roomId,
          hostSocketId: socket.id,
          hostUserId: socket.userId
        });

        // Notify host
        socket.emit('guest:accepted-host', {
          guestId,
          guestSocketId: guestSocket.id
        });

        // Notify viewers that guest joined
        ioInstance.to(`live:${roomId}:viewers`).emit('live:guest-joined', {
          guestId,
          guest: guestRequest.user
        });

        // Update live stream guests
        const liveStream = await LiveStream.findById(roomId);
        if (liveStream && !liveStream.guests.includes(guestId)) {
          liveStream.guests.push(guestId);
          await liveStream.save();
        }

        console.log(`[Guest] Host accepted guest ${guestId} in room ${roomId}`);
      } catch (error) {
        console.error('[Guest] Error accepting guest:', error);
        socket.emit('guest:error', { message: 'Failed to accept guest' });
      }
    });

    // ==================== HOST REJECTS GUEST ====================
    socket.on('guest:reject', (data) => {
      try {
        const { roomId, guestId } = data;
        
        const room = activeRooms.get(roomId);
        if (!room || room.host !== socket.id) {
          return socket.emit('guest:error', { message: 'Not authorized as host' });
        }

        const requests = guestRequests.get(roomId);
        if (!requests || !requests.has(guestId)) {
          return socket.emit('guest:error', { message: 'Guest request not found' });
        }

        const guestRequest = requests.get(guestId);
        const guestSocket = ioInstance.sockets.sockets.get(guestRequest.socketId);
        
        // Remove request
        requests.delete(guestId);

        // Notify guest
        if (guestSocket) {
          guestSocket.emit('guest:rejected', { roomId });
        }

        console.log(`[Guest] Host rejected guest ${guestId} in room ${roomId}`);
      } catch (error) {
        console.error('[Guest] Error rejecting guest:', error);
        socket.emit('guest:error', { message: 'Failed to reject guest' });
      }
    });

    // ==================== LIVE CHAT MESSAGE ====================
    socket.on('live:chat', async (data) => {
      try {
        const { roomId: providedRoomId, message, clientId } = data;

        if (!providedRoomId || !message) {
          return socket.emit('live:error', { message: 'Room ID and message required' });
        }

        // Accept either the Mongo _id or the public roomId
        const liveStream = await LiveStream.findOne({
          $or: [{ _id: providedRoomId }, { roomId: providedRoomId }]
        });

        if (!liveStream || liveStream.status !== 'live') {
          return socket.emit('live:error', { message: 'Stream not live' });
        }

        const canonicalRoomId = liveStream._id.toString();

        // Save chat message
        const chatMessage = new LiveChat({
          stream: canonicalRoomId,
          user: socket.userId,
          message: message.trim(),
          type: 'text'
        });

        await chatMessage.save();
        await chatMessage.populate('user', 'username profile');

        // Broadcast to all in room (use canonical room id)
        ioInstance.to(`live:${canonicalRoomId}:host`)
          .to(`live:${canonicalRoomId}:viewers`)
          .to(`live:${canonicalRoomId}:guests`)
          .emit('live:chat', {
            message: chatMessage,
            timestamp: new Date(),
            clientId: clientId || null
          });
      } catch (error) {
        console.error('[LiveStream] Error sending chat:', error);
        socket.emit('live:error', { message: 'Failed to send message' });
      }
    });

    // ==================== LIVE REACTION (HEARTS) ====================
    socket.on('live:reaction', (data) => {
      try {
        const { roomId, type } = data; // type: 'heart', 'fire', etc.
        
        if (!roomId) {
          return socket.emit('live:error', { message: 'Room ID required' });
        }

        // Broadcast reaction to host, viewers and guests
        ioInstance.to(`live:${roomId}:host`)
          .to(`live:${roomId}:viewers`)
          .to(`live:${roomId}:guests`)
          .emit('live:reaction', {
            userId: socket.userId,
            user: socket.user,
            type: type || 'heart',
            timestamp: new Date()
          });
      } catch (error) {
        console.error('[LiveStream] Error sending reaction:', error);
        socket.emit('live:error', { message: 'Failed to send reaction' });
      }
    });

    // ==================== DISCONNECT ====================
    socket.on('disconnect', async () => {
      try {
        const { roomId, role } = socket;
        
        if (roomId) {
          await handleDisconnect(socket, roomId, role);
        }
      } catch (error) {
        console.error('[LiveStream] Error handling disconnect:', error);
      }
    });
  });
};

/**
 * Handle socket disconnect
 */
const handleDisconnect = async (socket, roomId, role) => {
  const room = activeRooms.get(roomId);
  if (!room) return;

  if (role === 'host') {
    // Host disconnected - end stream
    room.host = null;
    ioInstance.to(`live:${roomId}:viewers`).emit('live:ended', { roomId });
    
    // Update stream status
    const liveStream = await LiveStream.findById(roomId);
    if (liveStream) {
      liveStream.status = 'ended';
      liveStream.endTime = new Date();
      await liveStream.save();
    }
    
    // Clean up room
    activeRooms.delete(roomId);
    guestRequests.delete(roomId);
  } else if (role === 'viewer') {
    room.viewers.delete(socket.id);
    
    const liveStream = await LiveStream.findById(roomId);
    if (liveStream) {
      liveStream.viewers = Math.max(0, room.viewers.size);
      await liveStream.save();
      
      io.to(`live:${roomId}:host`).emit('live:viewer-count', { 
        count: liveStream.viewers 
      });
    }
  } else if (role === 'guest') {
    room.guests.delete(socket.id);
    
    io.to(`live:${roomId}:host`).emit('live:guest-left', { 
      guestId: socket.userId 
    });
    io.to(`live:${roomId}:viewers`).emit('live:guest-left', { 
      guestId: socket.userId 
    });
  }

  console.log(`[LiveStream] ${socket.userId} disconnected from room ${roomId}`);
};

/**
 * Get active room info
 */
const getRoomInfo = (roomId) => {
  const room = activeRooms.get(roomId);
  if (!room) return null;
  
  return {
    roomId,
    host: room.host,
    viewerCount: room.viewers.size,
    guestCount: room.guests.size,
    guests: Array.from(room.guests.values())
  };
};

/**
 * Get pending guest requests for a room
 */
const getGuestRequests = (roomId) => {
  const requests = guestRequests.get(roomId);
  if (!requests) return [];
  
  return Array.from(requests.entries()).map(([userId, request]) => ({
    userId,
    socketId: request.socketId,
    user: request.user,
    timestamp: request.timestamp
  }));
};

module.exports = {
  initializeLiveStreamHandlers,
  getRoomInfo,
  getGuestRequests,
  activeRooms
};

