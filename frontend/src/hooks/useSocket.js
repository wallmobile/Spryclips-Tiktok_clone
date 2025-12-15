/**
 * Socket.IO Hook for Real-time Communication
 * 
 * Recent Changes:
 * - Enhanced socket URL resolution with runtime config support
 * - Added support for window.APP_CONFIG for dynamic socket URL
 * - Improved authentication token handling for socket connections
 * - Added support for anonymous socket connections
 * - Enhanced connection state management
 * - Added live stream WebSocket support
 */

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { refreshSession } from '../config/axios';

// Use relative path in production (nginx proxies), localhost in dev
const getSocketURL = () => {
  // Priority 1: Runtime config from window.APP_CONFIG (set in public/config.js)
  if (typeof window !== 'undefined' && window.APP_CONFIG && 'API_URL' in window.APP_CONFIG) {
    const url = window.APP_CONFIG.API_URL || '';
    console.log('[useSocket] Using window.APP_CONFIG.API_URL:', url === '' ? '(empty string - same origin)' : url);
    return url || window.location?.origin || '';
  }
  
  // Priority 2: Build-time env variable
  if (process.env.REACT_APP_API_URL) {
    console.log('[useSocket] Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Priority 3: Auto-detect based on current location
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin)) {
      console.log('[useSocket] Development mode detected, using localhost:5000');
      return 'http://localhost:5000';
    }
    console.log('[useSocket] Production mode detected, using same origin:', origin);
    return origin; // same origin in production
  }
  
  // Fallback
  console.log('[useSocket] Using fallback: localhost:5000');
  return 'http://localhost:5000';
};

const API_URL = getSocketURL();

const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const establishConnection = async () => {
      try {
        // If user is present, try to refresh session and include token in handshake.
        let token = null;
        if (user) {
          try {
            const refreshResponse = await refreshSession();
            token = refreshResponse?.accessToken || null;
          } catch (err) {
            console.warn('refreshSession failed (socket auth will proceed without token):', err?.message || err);
            token = null;
          }
        }

        // Establish socket connection. If token is null, the server will allow anonymous socket.
        socketRef.current = io(API_URL, {
          auth: {
            token
          },
          transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
          console.log('Socket connected', socket.id);
          setIsConnected(true);
          // Only subscribe to notifications when authenticated
          if (socket.userId || user) {
            socket.emit('subscribe:notifications');
          }
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
        });
      } catch (error) {
        console.error('Failed to establish socket connection:', error);
        setIsConnected(false);
      }
    };

    establishConnection();

    return () => {
      isMounted = false;
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  return { 
    socket: socketRef.current, 
    isConnected 
  };
};

export { useSocket };

export const useNotifications = (onNotification) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('notification', (notification) => {
      if (onNotification) {
        onNotification(notification);
      }
    });

    return () => {
      if (socket) {
        socket.off('notification');
      }
    };
  }, [socket, onNotification]);
};

export const useLiveStream = (streamId, onMessage) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !streamId) return;

    socket.emit('join:livestream', streamId);

    socket.on('livestream:message', (message) => {
      if (onMessage) {
        onMessage(message);
      }
    });

    socket.on('livestream:update', (update) => {
      console.log('Live stream update:', update);
    });

    return () => {
      if (socket) {
        socket.emit('leave:livestream', streamId);
        socket.off('livestream:message');
        socket.off('livestream:update');
      }
    };
  }, [socket, streamId, onMessage]);
};

