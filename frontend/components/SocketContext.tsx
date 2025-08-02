'use client'
import React, { createContext, useContext, useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";

const SocketContext = createContext<{ socket: Socket | null, socketId: string | null }>({ socket: null, socketId: null });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔌 Attempting to connect to socket...");
    const socketIo = io("http://localhost:3001");
    setSocket(socketIo);

    socketIo.on("connect", () => {
      console.log("✅ Socket connected with ID:", socketIo.id);
      setSocketId(socketIo.id ?? null);
    });

    socketIo.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    socketIo.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    return () => {
      socketIo.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socketId }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);