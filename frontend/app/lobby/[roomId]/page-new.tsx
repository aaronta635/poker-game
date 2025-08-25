"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "../../../components/SocketContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PokerCard } from "@/components/ui/poker-card";
import { Settings, Users, Eye } from "lucide-react";

type GameState = {
  hands: { [playerId: string]: string[] };
  community: string[];
  pot: number;
  phase: string;
  revealed: number;
  currentPlayer: string | null;
  currentPlayerIndex: number;
  bets: { [playerID: string]: number };
  folded: { [playerID: string]: boolean };
  current_bet: number;
  buyIn: number;
};

// Helper function to convert backend card format to display format
const convertCardToDisplay = (card: string): string => {
  if (!card) return "🂠";

  // Backend format is like "♠️A", "♥️K", etc.
  return card;
};

// Helper function to get player positions around the table
const getPlayerPosition = (index: number, totalPlayers: number): string => {
  if (totalPlayers <= 2) return index === 0 ? "top" : "right";
  if (totalPlayers === 3) {
    const positions = ["top", "left", "right"];
    return positions[index] || "top";
  }
  // For 4+ players, distribute around the table
  const positions = ["top", "left", "right"];
  return positions[index % 3] || "top";
};

export default function LobbyPage() {
  console.log("LobbyPage rendered");
  const { socket, socketId } = useSocket();
  const params = useParams();
  const roomId = params.roomId as string;
  const [game, setGame] = useState<GameState | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [players, setPlayers] = useState<
    { id: string; name: string; ready?: boolean; chips: number }[]
  >([]);
  const [winners, setWinners] = useState<
    { id: string; name: string; bestScore: number }[] | null
  >(null);
  const [countdown, setCountdown] = useState(0);

  // Emit join_lobby when entering the lobby
  useEffect(() => {
    if (socket && roomId) {
      socket.emit("join_lobby", roomId);
    }
  }, [socket, roomId]);

  useEffect(() => {
    if (socket && roomId) {
      socket.emit("get_room_state", roomId);
    }
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleRoomUpdate = (
      playerList: { id: string; name: string; ready?: boolean; chips: number }[]
    ) => {
      console.log("handleRoom Received:", playerList);
      setPlayers(playerList);
    };
    socket.on("room_update", handleRoomUpdate);
    return () => {
      socket.off("room_update", handleRoomUpdate);
    };
  }, [socket]);

  // Listen for game_started event
  useEffect(() => {
    if (!socket) return;
    const handleGameStarted = (gameState: GameState) => {
      setGame(gameState);
      setWinners(null);
      setCountdown(0);
    };
    socket.on("game_started", handleGameStarted);
    return () => {
      socket.off("game_started", handleGameStarted);
    };
  }, [socket]);

  useEffect(() => {
    console.log("player states updated:", players);
  }, [players]);

  useEffect(() => {
    const name = sessionStorage.getItem("poker-username");
    console.log("Read from sessionStorage:", name);
    setUsername(name);
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const handleGameState = (gameState: GameState) => {
      console.log("Game state:", gameState);
      setGame(gameState);
    };
    socket.on("game_state", handleGameState);
    return () => {
      socket.off("game_state", handleGameState);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on("game_winners", (winners) => {
      console.log("Game winners: ", winners);
      setWinners(winners);
    });

    return () => {
      socket.off("game_winners");
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    socket.on("game_winners", () => {
      // Show winners and start countdown
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    return () => {
      socket.off("game_winners");
    };
  }, [socket]);

  console.log(
    "username:",
    username,
    "game.currentPlayer:",
    game?.currentPlayer
  );
  console.log("players: ", players);

  // Convert backend data to UI format
  const currentPlayer = socketId && players.find((p) => p.id === socketId);
  const otherPlayers = players.filter((p) => p.id !== socketId);

  // Get current player's cards
  const currentPlayerCards = game && socketId ? game.hands[socketId] || [] : [];

  // Get community cards with revealed state
  const communityCards = game
    ? game.community
        .slice(0, 5)
        .map((card, index) =>
          index < game.revealed ? convertCardToDisplay(card) : "🂠"
        )
    : ["🂠", "🂠", "🂠", "🂠", "🂠"];

  // Check if current player is active (their turn)
  const isCurrentPlayerTurn =
    game && username && game.currentPlayer === username;
  const canAct =
    isCurrentPlayerTurn &&
    socketId &&
    !game?.folded[socketId] &&
    !winners &&
    countdown === 0;

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 flex items-center justify-center">
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Poker Lobby</h1>
          <p className="text-gray-300 mb-4">
            Room ID: <span className="font-mono text-blue-300">{roomId}</span>
          </p>
          <p className="text-blue-300">Waiting for the game to start...</p>
          <div className="mt-4">
            <div className="text-white text-sm">Players in lobby:</div>
            <div className="mt-2 space-y-1">
              {players.map((player) => (
                <div key={player.id} className="text-gray-300 text-sm">
                  {player.name} ({player.chips} chips)
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Discord-style gradient background with city skyline */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800">
        {/* City skyline silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/40 to-transparent">
          <div className="absolute bottom-0 left-10 w-16 h-24 bg-black/30 rounded-t-sm"></div>
          <div className="absolute bottom-0 left-32 w-12 h-20 bg-black/25 rounded-t-sm"></div>
          <div className="absolute bottom-0 left-48 w-20 h-28 bg-black/35 rounded-t-sm"></div>
          <div className="absolute bottom-0 right-20 w-14 h-22 bg-black/30 rounded-t-sm"></div>
          <div className="absolute bottom-0 right-40 w-18 h-26 bg-black/25 rounded-t-sm"></div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-6">
        {/* Top action buttons */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="bg-gray-700/80 hover:bg-gray-600/80 text-white border border-gray-500/50 backdrop-blur-sm"
            >
              <Eye className="w-4 h-4 mr-2" />
              ROOM: {roomId}
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              PHASE: {game.phase.toUpperCase()}
            </Button>
          </div>

          {/* Top right controls */}
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-full"
            >
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-black text-sm">😊</span>
              </div>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-full"
            >
              <span className="text-lg">?</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-full"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Winners Display */}
        {winners && countdown > 0 && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="bg-green-500/90 backdrop-blur-sm rounded-lg p-8 text-center border-4 border-yellow-400">
              <h2 className="text-3xl font-bold text-white mb-4">
                🎉 Game Over! 🎉
              </h2>
              {winners.length === 1 ? (
                <h3 className="text-2xl text-white mb-2">
                  Winner: {winners[0].name}!
                </h3>
              ) : (
                <h3 className="text-2xl text-white mb-2">
                  Tie between: {winners.map((w) => w.name).join(", ")}!
                </h3>
              )}
              <p className="text-white mb-2">
                Winning score: {winners[0].bestScore}
              </p>
              <p className="text-white mb-4">
                Pot won: ${Math.floor(game.pot / winners.length)} chips each
              </p>
              <p className="text-yellow-200 text-xl font-bold">
                Next hand starting in {countdown} seconds...
              </p>
            </div>
          </div>
        )}

        {/* Main game area */}
        <div className="flex justify-center items-center min-h-[500px] relative">
          {/* Poker table - oval shape */}
          <div className="relative">
            {/* Table shadow/base */}
            <div className="w-[700px] h-[450px] bg-gray-800/60 rounded-full blur-sm absolute top-2 left-2"></div>

            {/* Main table */}
            <div className="w-[700px] h-[450px] bg-gradient-to-br from-green-500 to-green-600 rounded-full border-4 border-gray-300/80 shadow-2xl relative">
              {/* Inner table border */}
              <div className="absolute inset-4 border-2 border-white/20 rounded-full"></div>

              {/* Community Cards */}
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                <div className="flex gap-2">
                  {communityCards.map((card, index) => (
                    <PokerCard
                      key={index}
                      card={card}
                      isRevealed={card !== "🂠"}
                      size="sm"
                      className="transform hover:scale-105 transition-transform"
                    />
                  ))}
                </div>
              </div>

              {/* Pot Display */}
              <div className="absolute top-40 left-1/2 transform -translate-x-1/2">
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                  <div className="text-center">
                    <div className="text-gray-600 text-sm font-semibold">
                      POT
                    </div>
                    <div className="text-gray-800 text-2xl font-bold">
                      ${game.pot}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Players around the table */}
            {otherPlayers.map((player, index) => {
              const position = getPlayerPosition(index, otherPlayers.length);
              const positions: Record<string, string> = {
                left: "-left-20 top-1/2 transform -translate-y-1/2",
                top: "top-0 left-1/2 transform -translate-x-1/2 -translate-y-24",
                right: "-right-20 top-1/2 transform -translate-y-1/2",
              };

              const isActivePlayer = game.currentPlayer === player.name;
              const isFolded = game.folded[player.id];

              return (
                <div
                  key={player.id}
                  className={`absolute ${positions[position]}`}
                >
                  <div
                    className={`flex ${
                      position === "top"
                        ? "flex-row items-center gap-3"
                        : "flex-col items-center"
                    }`}
                  >
                    {/* Avatar with turn indicator */}
                    <div
                      className={`relative ${
                        isActivePlayer
                          ? "ring-4 ring-yellow-400 rounded-full"
                          : ""
                      }`}
                    >
                      <Avatar className="w-16 h-16 border-4 border-white/80 shadow-lg">
                        <AvatarFallback className="bg-gray-700 text-white font-bold text-lg">
                          {player.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {isActivePlayer && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex ${
                        position === "top"
                          ? "flex-col items-start"
                          : "flex-col items-center"
                      } ${position === "top" ? "" : "mt-2"}`}
                    >
                      {/* Player cards */}
                      <div className="flex gap-1 mb-1">
                        <PokerCard
                          card={isFolded ? "folded" : "🂠"}
                          isRevealed={false}
                          size="sm"
                          className={isFolded ? "opacity-50 grayscale" : ""}
                        />
                        <PokerCard
                          card={isFolded ? "folded" : "🂠"}
                          isRevealed={false}
                          size="sm"
                          className={isFolded ? "opacity-50 grayscale" : ""}
                        />
                      </div>

                      {/* Player info */}
                      <div className="bg-gray-800/80 backdrop-blur-sm rounded px-2 py-1">
                        <div className="text-white font-semibold text-xs">
                          {player.name}
                        </div>
                        <div className="text-gray-300 text-[10px]">
                          ${player.chips}
                        </div>
                        {game.bets[player.id] > 0 && !isFolded && (
                          <div className="text-yellow-400 text-[10px] font-bold">
                            Bet: ${game.bets[player.id]}
                          </div>
                        )}
                        {isFolded && (
                          <div className="text-red-400 text-[10px] font-bold">
                            FOLDED
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settings panel on the right */}
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <Card className="bg-gray-800/80 backdrop-blur-sm border-gray-600/50 p-4 w-64">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">CURRENT BET</span>
                  <span className="text-white font-bold">
                    ${game.current_bet}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">BUY IN</span>
                  <span className="text-white font-bold">${game.buyIn}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">PLAYERS</span>
                  <span className="text-white font-bold">{players.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">PHASE</span>
                  <span className="text-white font-bold">
                    {game.phase.toUpperCase()}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Current Player Section */}
        {currentPlayer && (
          <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2">
            <div className="flex flex-col items-center">
              {/* Current player info and avatar */}
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`relative ${
                    isCurrentPlayerTurn
                      ? "ring-4 ring-yellow-400 rounded-full"
                      : ""
                  }`}
                >
                  <Avatar className="w-20 h-20 border-4 border-white/80 shadow-lg">
                    <AvatarFallback className="bg-gray-700 text-white font-bold text-xl">
                      {currentPlayer.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isCurrentPlayerTurn && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                {/* Current player info text */}
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="text-white font-semibold text-sm">
                    {currentPlayer.name}
                  </div>
                  <div className="text-gray-300 text-xs">
                    ${currentPlayer.chips}
                  </div>
                  {game.bets[currentPlayer.id] > 0 && (
                    <div className="text-yellow-400 text-xs font-bold">
                      Bet: ${game.bets[currentPlayer.id]}
                    </div>
                  )}
                </div>
              </div>

              {/* Current player cards */}
              <div className="flex gap-3 mb-6">
                {currentPlayerCards.map((card, cardIndex) => (
                  <PokerCard
                    key={cardIndex}
                    card={card}
                    isRevealed={true}
                    size="md"
                    className="transform hover:scale-110 transition-transform shadow-2xl"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {canAct && socket && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="bg-red-600/80 hover:bg-red-500/80 text-white border-red-400/50 backdrop-blur-sm px-8 py-3"
                onClick={() => socket.emit("player_action", roomId, "fold")}
              >
                FOLD
              </Button>

              {socketId && (game.bets[socketId] || 0) < game.current_bet ? (
                <Button
                  variant="outline"
                  className="bg-blue-600/80 hover:bg-blue-500/80 text-white border-blue-400/50 backdrop-blur-sm px-8 py-3"
                  onClick={() => socket.emit("player_action", roomId, "call")}
                >
                  CALL ${game.current_bet - (game.bets[socketId] || 0)}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="bg-green-600/80 hover:bg-green-500/80 text-white border-green-400/50 backdrop-blur-sm px-8 py-3"
                  onClick={() => socket.emit("player_action", roomId, "check")}
                >
                  CHECK
                </Button>
              )}

              <Button
                variant="default"
                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3"
                onClick={() => socket.emit("player_action", roomId, "bet")}
              >
                RAISE (+$10)
              </Button>
            </div>
          </div>
        )}

        {/* Room branding */}
        <div className="absolute bottom-6 right-6">
          <div className="bg-blue-600/20 backdrop-blur-sm rounded-lg p-2 border border-blue-400/30">
            <div className="text-blue-300 text-xs font-semibold">
              Poker Night - Room {roomId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
