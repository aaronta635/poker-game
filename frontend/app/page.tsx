"use client";

import { useState, useEffect } from "react";
import { useSocket } from "../components/SocketContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SpadeIcon as Spades, Heart, Diamond, Club, Users, Lock, Play, Crown } from "lucide-react";

export default function HomePage() {
  const { socket } = useSocket();
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [players, setPlayers] = useState<{ id: string; name: string; ready: boolean }[]>([]);
  const [isInRoom, setIsInRoom] = useState(false);
  const [readyStatus, setReadyStatus] = useState({
    allReady: false,
    readyCount: 0,
    totalPlayers: 0
  });

  const router = useRouter();

  // ... [Keep all your existing useEffect hooks and functions] ...

  const joinRoom = () => {
    console.log("🎮 Attempting to join room:", roomId, "with username:", username);
    
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
      setReadyStatus(status);
    });
  
    return () => {
      socket.off("room_update");
      socket.off("ready_status");
    };
  }, [socket]);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Navigation Header */}
      <header className="border-b border-slate-700 bg-slate-800/90 flex-shrink-0">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Spades className="h-6 w-6 text-rose-400" />
                <Heart className="h-6 w-6 text-red-400" />
                <Diamond className="h-6 w-6 text-red-400" />
                <Club className="h-6 w-6 text-rose-400" />
              </div>
              <h1 className="text-2xl font-bold text-white font-yourmate">Gong's Poker</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Home
              </Button>
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                How to Play
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-yourmate">
              Welcome to <span className="text-rose-400">Gong's Poker</span>
            </h2>
            <p className="text-lg text-slate-300 mb-4 max-w-2xl mx-auto">
              Join poker rooms, play with friends, and experience real-time multiplayer poker
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-700 text-slate-200">
                <Users className="h-4 w-4 mr-1" />
                Multiplayer Rooms
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-700 text-slate-200">
                <Play className="h-4 w-4 mr-1" />
                Real-time Play
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-slate-700 text-slate-200">
                <Crown className="h-4 w-4 mr-1" />
                AI Training API
              </Badge>
            </div>
          </div>

          {/* Room Management Section */}
          <div className="max-w-3xl mx-auto mb-8">
            <Tabs defaultValue="join" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800 border border-slate-600 h-16">
                <TabsTrigger
                  value="join"
                  className="text-base py-3 data-[state=active]:bg-rose-500 data-[state=active]:text-white text-slate-300 h-full flex items-center justify-center"
                >
                  Join Room
                </TabsTrigger>
                <TabsTrigger
                  value="status"
                  className="text-base py-3 data-[state=active]:bg-rose-500 data-[state=active]:text-white text-slate-300 h-full flex items-center justify-center"
                >
                  Room Status
                </TabsTrigger>
              </TabsList>

              {/* Join Room Tab */}
              <TabsContent value="join">
                <Card className="shadow-lg bg-slate-800 border-slate-600">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2 text-white font-yourmate">
                      <Play className="h-5 w-5 text-rose-400" />
                      Join Poker Room
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Enter room details to join an existing poker game
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="room-id" className="text-sm font-medium text-slate-300">
                          Room ID *
                        </Label>
                        <Input
                          id="room-id"
                          placeholder="Enter room ID"
                          value={roomId}
                          onChange={(e) => setRoomId(e.target.value)}
                          className="text-sm py-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium text-slate-300">
                          Your Name *
                        </Label>
                        <Input
                          id="username"
                          placeholder="Enter your name"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="text-sm py-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={joinRoom}
                      className="w-full text-base py-4 bg-rose-500 hover:bg-rose-600 text-white border-0 transition-colors duration-200"
                      size="lg"
                      disabled={!roomId || !username}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Join Room
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Room Status Tab */}
              <TabsContent value="status">
                <Card className="shadow-lg bg-slate-800 border-slate-600">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2 text-white font-yourmate">
                      <Users className="h-5 w-5 text-rose-400" />
                      Room Status
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Ready up and view other players in the room
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isInRoom ? (
                      <>
                        {/* Ready Button */}
                        <Button
                          onClick={toggleReady}
                          className="w-full text-base py-4 bg-green-500 hover:bg-green-600 text-white border-0 transition-colors duration-200"
                          size="lg"
                        >
                          🎯 Toggle Ready
                        </Button>

                        {/* Ready Status */}
                        <div className="text-center p-4 bg-slate-700 rounded-lg">
                          {readyStatus.readyCount > 0 && !readyStatus.allReady && (
                            <p className="text-yellow-300 font-medium">
                              ⏳ Waiting for all players... ({readyStatus.readyCount}/{readyStatus.totalPlayers})
                            </p>
                          )}
                          {readyStatus.allReady && (
                            <p className="text-green-300 font-semibold animate-pulse">
                              ✅ All players ready! Starting game...
                            </p>
                          )}
                          {readyStatus.readyCount === 0 && (
                            <p className="text-slate-400">
                              No players ready yet
                            </p>
                          )}
                        </div>

                        {/* Players List */}
                        <div className="space-y-2">
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Players in Room ({players.length})
                          </h3>
                          {players.length > 0 ? (
                            <div className="space-y-2">
                              {players.map((p) => (
                                <div
                                  key={p.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    p.ready
                                      ? "bg-green-500/20 border-green-400 text-green-200"
                                      : "bg-slate-700 border-slate-600 text-slate-200"
                                  }`}
                                >
                                  <span className="font-medium">{p.name}</span>
                                  {p.ready ? (
                                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-400">
                                      ✅ Ready
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-slate-600 text-slate-400 border-slate-500">
                                      Waiting
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 text-center italic p-4 bg-slate-700 rounded-lg">
                              No players in room yet...
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-8 bg-slate-700 rounded-lg">
                        <Users className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-400 text-lg">
                          Join a room first to see player status
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-3 bg-slate-800/90 flex-shrink-0">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          <p className="font-yourmate">&copy; 2024 Gong's Poker. Built with Next.js and Socket.io</p>
        </div>
      </footer>
    </div>
  );
}