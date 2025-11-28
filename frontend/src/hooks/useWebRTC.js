import { useEffect, useRef, useState, useCallback } from 'react';

// STUN/TURN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

/**
 * Hook for WebRTC live streaming as broadcaster (host)
 */
export const useBroadcaster = (socket, roomId, localStream) => {
  const peerConnectionsRef = useRef(new Map()); // viewerId -> RTCPeerConnection
  const [viewerCount, setViewerCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);

  // Create peer connection for a viewer
  const createPeerConnection = useCallback((viewerId, viewerSocketId) => {
    if (!localStream) {
      console.error('[Broadcaster] No local stream available');
      return null;
    }

    console.log('[Broadcaster] Creating peer connection for viewer:', viewerId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks to the connection
    localStream.getTracks().forEach(track => {
      console.log('[Broadcaster] Adding track:', track.kind);
      pc.addTrack(track, localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[Broadcaster] Sending ICE candidate to viewer');
        socket.emit('webrtc:ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetId: viewerSocketId
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[Broadcaster] Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Clean up failed connection
        peerConnectionsRef.current.delete(viewerId);
        setViewerCount(peerConnectionsRef.current.size);
      }
    };

    peerConnectionsRef.current.set(viewerId, { pc, socketId: viewerSocketId });
    setViewerCount(peerConnectionsRef.current.size);
    
    return pc;
  }, [socket, roomId, localStream]);

  // Handle viewer requesting to connect
  const handleViewerJoin = useCallback(async (viewerId, viewerSocketId) => {
    const pc = createPeerConnection(viewerId, viewerSocketId);
    if (!pc) return;

    try {
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer to viewer
      socket.emit('webrtc:offer', {
        roomId,
        offer: pc.localDescription,
        targetId: viewerSocketId
      });

      console.log('[Broadcaster] Sent offer to viewer:', viewerId);
    } catch (error) {
      console.error('[Broadcaster] Error creating offer:', error);
    }
  }, [socket, roomId, createPeerConnection]);

  // Handle answer from viewer
  const handleAnswer = useCallback(async (viewerId, answer) => {
    const peerData = peerConnectionsRef.current.get(viewerId);
    if (!peerData) {
      console.error('[Broadcaster] No peer connection for viewer:', viewerId);
      return;
    }

    try {
      await peerData.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[Broadcaster] Set remote description for viewer:', viewerId);
    } catch (error) {
      console.error('[Broadcaster] Error setting remote description:', error);
    }
  }, []);

  // Handle ICE candidate from viewer
  const handleIceCandidate = useCallback(async (viewerId, candidate) => {
    const peerData = peerConnectionsRef.current.get(viewerId);
    if (!peerData) return;

    try {
      await peerData.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[Broadcaster] Error adding ICE candidate:', error);
    }
  }, []);

  // Handle viewer leaving
  const handleViewerLeave = useCallback((viewerId) => {
    const peerData = peerConnectionsRef.current.get(viewerId);
    if (peerData) {
      peerData.pc.close();
      peerConnectionsRef.current.delete(viewerId);
      setViewerCount(peerConnectionsRef.current.size);
      console.log('[Broadcaster] Viewer left:', viewerId);
    }
  }, []);

  // Start broadcasting
  const startBroadcasting = useCallback(() => {
    if (!socket || !roomId) return;

    socket.emit('live:join', { roomId, role: 'host' });
    setIsStreaming(true);
    console.log('[Broadcaster] Started broadcasting to room:', roomId);
  }, [socket, roomId]);

  // Stop broadcasting
  const stopBroadcasting = useCallback(() => {
    // Close all peer connections
    peerConnectionsRef.current.forEach(({ pc }) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    
    if (socket && roomId) {
      socket.emit('live:leave', { roomId });
    }
    
    setIsStreaming(false);
    setViewerCount(0);
    console.log('[Broadcaster] Stopped broadcasting');
  }, [socket, roomId]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Viewer wants to connect
    socket.on('live:viewer-request', ({ viewerId, viewerSocketId }) => {
      handleViewerJoin(viewerId, viewerSocketId);
    });

    // Receive answer from viewer
    socket.on('webrtc:answer', ({ answer, fromId, fromUserId }) => {
      handleAnswer(fromUserId, answer);
    });

    // Receive ICE candidate from viewer
    socket.on('webrtc:ice-candidate', ({ candidate, fromId, fromUserId }) => {
      handleIceCandidate(fromUserId, candidate);
    });

    // Viewer left
    socket.on('live:viewer-left', ({ viewerId }) => {
      handleViewerLeave(viewerId);
    });

    // Viewer count update from server
    socket.on('live:viewer-count', ({ count }) => {
      setViewerCount(count);
    });

    return () => {
      socket.off('live:viewer-request');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('live:viewer-left');
      socket.off('live:viewer-count');
    };
  }, [socket, handleViewerJoin, handleAnswer, handleIceCandidate, handleViewerLeave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBroadcasting();
    };
  }, [stopBroadcasting]);

  return {
    viewerCount,
    isStreaming,
    startBroadcasting,
    stopBroadcasting
  };
};

/**
 * Hook for WebRTC live streaming as viewer
 */
export const useViewer = (socket, roomId) => {
  const peerConnectionRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log('[Viewer] Creating peer connection');
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('[Viewer] Received track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setConnectionState('connected');
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          roomId,
          candidate: event.candidate,
          targetId: socket.hostSocketId // Will be set after joining
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[Viewer] Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        setError('Connection failed. Please try again.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Viewer] ICE connection state:', pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket, roomId]);

  // Handle offer from broadcaster
  const handleOffer = useCallback(async (offer, hostSocketId) => {
    try {
      const pc = peerConnectionRef.current || createPeerConnection();
      
      // Store host socket ID for ICE candidates
      if (socket) {
        socket.hostSocketId = hostSocketId;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[Viewer] Set remote description from host');

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', {
        roomId,
        answer: pc.localDescription,
        targetId: hostSocketId
      });

      console.log('[Viewer] Sent answer to host');
      setConnectionState('connecting');
    } catch (error) {
      console.error('[Viewer] Error handling offer:', error);
      setError('Failed to connect to stream');
    }
  }, [socket, roomId, createPeerConnection]);

  // Handle ICE candidate from broadcaster
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[Viewer] Error adding ICE candidate:', error);
    }
  }, []);

  // Join stream as viewer
  const joinStream = useCallback(() => {
    if (!socket || !roomId) return;

    setConnectionState('connecting');
    setError(null);
    
    // Create peer connection first
    createPeerConnection();
    
    // Join the room
    socket.emit('live:join', { roomId, role: 'viewer' });
    console.log('[Viewer] Joining stream:', roomId);
  }, [socket, roomId, createPeerConnection]);

  // Leave stream
  const leaveStream = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socket && roomId) {
      socket.emit('live:leave', { roomId });
    }

    setRemoteStream(null);
    setConnectionState('disconnected');
    console.log('[Viewer] Left stream');
  }, [socket, roomId]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle joined confirmation
    socket.on('live:joined', ({ role, viewerCount }) => {
      console.log('[Viewer] Joined as:', role, 'Viewers:', viewerCount);
    });

    // Handle offer from host
    socket.on('webrtc:offer', ({ offer, fromId, fromUserId }) => {
      console.log('[Viewer] Received offer from host');
      handleOffer(offer, fromId);
    });

    // Handle ICE candidate from host
    socket.on('webrtc:ice-candidate', ({ candidate, fromId }) => {
      handleIceCandidate(candidate);
    });

    // Host went offline
    socket.on('live:host-offline', () => {
      setError('Host disconnected');
      setConnectionState('disconnected');
    });

    // Stream ended
    socket.on('live:ended', () => {
      setError('Stream has ended');
      leaveStream();
    });

    // Error
    socket.on('live:error', ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off('live:joined');
      socket.off('webrtc:offer');
      socket.off('webrtc:ice-candidate');
      socket.off('live:host-offline');
      socket.off('live:ended');
      socket.off('live:error');
    };
  }, [socket, handleOffer, handleIceCandidate, leaveStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveStream();
    };
  }, [leaveStream]);

  return {
    remoteStream,
    connectionState,
    error,
    joinStream,
    leaveStream
  };
};

export default { useBroadcaster, useViewer };
