import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    // Connect to Socket.IO with token in auth payload
    const socketClient = io(socketUrl, {
      auth: { token }
    });

    socketClient.on('connect', () => {
      console.log('Socket.IO Client Connected:', socketClient.id);
    });

    socketClient.on('connect_error', (err) => {
      console.error('Socket.IO Client Connection Error:', err.message);
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
