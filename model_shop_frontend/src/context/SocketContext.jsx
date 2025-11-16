// model_shop_frontend/src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null); // Mặc định null để tránh undefined

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Sử dụng '/' để Vite proxy tự động xử lý /socket.io
    const socketUrl = import.meta.env.DEV ? '/' : (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10, // Tăng retry
      reconnectionDelay: 2000, // Delay 2s
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket.IO connect_error:', err.message);
      setSocket(null); // Reset nếu fail
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setSocket(null);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext); // Trả về null nếu chưa connect