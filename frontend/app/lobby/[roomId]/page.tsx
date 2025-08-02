'use client';
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/components/SocketContext";

type GameState = {
    hands: { [playerId: string]: string[] };
    community: string[];
    pot: number;
    phase: string;
    revealed: number;
    currentPlayer: string | null;
    currentPlayerIndex: number;
    bets: { [playerID: string]: number};
    folded: { [playerID: string]: boolean};
    currentBet: number;
    buyIn: number;
};

export default function LobbyPage() {
    console.log("LobbyPage rendered");
    const { socket, socketId } = useSocket();
    const params = useParams();
    const roomId = params.roomId as string;
    const [game, setGame] = useState<GameState | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [players, setPlayers] = useState<{ id: string; name: string; ready?: boolean, chips: number}[]>([]);

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
    }, [socket, roomId])

    useEffect(() => {
        if (!socket) {
            return
        };

        const handleRoomUpdate = (playerList: { id: string , name: string , ready?: boolean, chips:number }[]) => {
            console.log("handleRoom Received:", playerList)
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
        const name = sessionStorage.getItem('poker-username');
        console.log("Read from sessionStorage:", name);
        setUsername(name);

    }, []);

    useEffect(() => {
        if (!socket) {
            return
        };
        const handleGameState = (gameState: GameState) => {
            console.log("Game state:", gameState)
            setGame(gameState);
        };
        socket.on("game_state", handleGameState);
        return () => {
            socket.off("game_state", handleGameState);
        };
    }, [socket] )

    console.log("username:", username, "game.currentPlayer:", game?.currentPlayer);
    console.log("players: ", players)

    return (
        <main className="p-8 flex flex-col items-center">
            <h1 className="text-xl mb-4 font-bold">Poker Lobby!</h1>
            <p>Room ID: <span className="font-mono">{roomId}</span></p>
            {game ? (
                <div className="bg-black-100 rounded p-4 w-full max-w-md mb-4">
                    <h2 className="font-semibold mb-2">Game Started!</h2>

                    <p>
                        <strong> </strong>{}
                        
                    </p>
                    <p>
                        <strong>{username} hand: </strong>{" "}
                        {socketId && game.hands[socketId]?.join(", ") || "Unknown"}
                    </p>
                    <p>
                        <strong>Community cards:</strong>{" "}
                        {game && game.revealed > 0
                            ? game.community.slice(0, game.revealed).join(", ")
                            : "None Yet"}
                    </p>
                    <p>
                        <strong>Pot:</strong> {game.pot}
                    </p>
                    
                    <ul>
                        {Array.isArray(players) && players.map((p) => (
                            <li key={p.id}>
                                <strong>{p.name}</strong> ({p.chips} chips) {game.folded[p.id] ? "(Folded)": `Bet: ${game.bets[p.id] || 0}`}
                            </li>
                        ))}
                    </ul>
                    <p>
                        <strong>Game Phase: </strong> {game.phase}
                    </p>
                    <p>
                        <strong>Current player:</strong> {game.currentPlayer}
                    </p>
                    {socketId && socket && username && game.currentPlayer === username && !game.folded[socketId] && (
                        <div className="flex gap-2 mt-4">
                            {(game.bets[socketId] || 0) < game.currentBet ? (
                                <button
                                    className="px-4 py-2 bg-green-500 text-white rounded"
                                    onClick={() => socket.emit("player_action", roomId, "call")}
                                >
                                    Call {game.currentBet - game.bets[socketId] || 0}
                                </button>
                            ): (
                                <button
                                    className="px-4 py-2 bg-green-500 text-white rounded"
                                    onClick={() => socket.emit("player_action", roomId, "check")}
                                >
                                    Check
                                </button>
                            )}
                            <button
                                className="px-4 py-2 bg-green-500 text-white rounded"
                                onClick={() => socket.emit("player_action", roomId, "bet")}
                            >
                                Bet 10
                            </button>
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded"
                                onClick={() => socket.emit("player_action", roomId, "fold")}
                            >
                                Fold

                            </button>
                        </div>
                    )}

                </div>
            ) : (
                <p className="text-blue-700">Waiting for the game to start...</p>
            )}
        </main>
    );
}