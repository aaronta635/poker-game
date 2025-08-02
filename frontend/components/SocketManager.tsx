'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export default function SocketManager() {
  useEffect(() => {
    socket = io('http://localhost:3001');

    socket.on('connect', () => {
      console.log('🔌 Connected:', socket.id);
      socket.emit('join-room', 'test-room');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return null;
}
