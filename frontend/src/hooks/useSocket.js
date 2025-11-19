import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { refreshSession } from '../config/axios';

const API_URL = "https://spryclips.com";
//process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const establishConnection = async () => {
      if (!user) {
        return;
      }

      try {
        const refreshResponse = await refreshSession();
        const token = refreshResponse?.accessToken;

        if (!token || !isMounted) {
          return;
        }

        socketRef.current = io(API_URL, {
          auth: {
            token
          },
          transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
          console.log('Socket connected');
          socket.emit('subscribe:notifications');
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });
      } catch (error) {
        console.error('Failed to refresh token for socket connection:', error);
      }
    };

    establishConnection();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  return socketRef.current;
};

export const useNotifications = (onNotification) => {
  const socket = useSocket();

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
  const socket = useSocket();

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

