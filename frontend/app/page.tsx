"use client";

import { useState, useEffect } from "react";
import { useSocket } from "../components/SocketContext";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { socket } = useSocket();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [players, setPlayers] = useState<{ id: string; name: string; ready: boolean }[]>([]);
  const [isInRoom, setIsInRoom] = useState(false);
  const [readyStatus, setReadyStatus] = useState({
    allReady: false,
    readyCount : 0,
    totalPlayers: 0
  });

  const joinRoom = () => {
    console.log("🎮 Attempting to join room:", roomId, "with username:", username);
    console.log("🔌 Socket available:", !!socket);
    
    if (roomId && username && socket) {
      console.log("📡 Emitting join_room event...");
      socket.emit("join_room", roomId, username);
      setIsInRoom(true);
      sessionStorage.setItem('poker-username', username);
    } else {
      console.log("❌ Cannot join room - missing:", { roomId, username, socket: !!socket });
    }
  };

  const toggleReady = () => {
    if (roomId && socket) {
      socket.emit("toggle_ready", roomId);
    }
  };

  const router = useRouter();

  useEffect(() => {
    if (readyStatus.allReady && readyStatus.totalPlayers > 1) {
      const timer = setTimeout(() => {
        router.push(`/lobby/${roomId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [readyStatus.allReady, readyStatus.totalPlayers, roomId, router]);

  useEffect(() => {
    if (!socket) return;
  
    socket.on("room_update", (data) => {
      setPlayers(data || []);
    });
  
    socket.on("ready_status", (status) => {
      setReadyStatus(status)
    });
  
    return () => {
      socket.off("room_update");
      socket.off("ready_status");
    };
  }, [socket]);

    
  return (
    <main className="p-4">
      <h1 className="text-xl mb-2">🎮 Join Poker Room</h1>

      <input
        placeholder="Room ID"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        className="border px-2 py-1 mr-2"
      />
      <input
        placeholder="Your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border px-2 py-1 mr-2"
      />
      <button onClick={joinRoom} className="bg-blue-500 text-white px-4 py-1">
        Join
      </button>

      {isInRoom && (
        <div className="mt-4">
          <button 
            onClick={toggleReady} 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            🎯 Toggle Ready
          </button>
          <div className="mt-2 text-sm">
            {readyStatus.readyCount > 0 && !readyStatus.allReady && (
              <p className="text-yellow-600">Waiting for all players... ({readyStatus.readyCount}/{readyStatus.totalPlayers})</p>
            )}
            {readyStatus.allReady && (
              <p className="text-green-600 font-semibold">All players ready. Starting</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <h2 className="font-semibold">👥 Players in room:</h2>
        <ul className="list-disc ml-6">
          {players && players.map((p) => (
            <li key={p.id} className={p.ready ? "text-green-600 font-semibold" : ""}>
              {p.name} {p.ready && "✅ Ready"}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
} 