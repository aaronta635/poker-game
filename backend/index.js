// backend/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST"],
  },
});

// Store room states (optional, can be replaced later with DB)
const rooms = {};
const games = {};
const lobbyStatus = {};

function startGame(roomId) {

  const suits = ['♣️', '♠️', '♥️', '♦️'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const BUY_IN = 500

  let deck = [];

  for (let s of suits) for (let v of values) 
    deck.push(s + v)
  
  deck = deck.sort(() => Math.random() - 0.5)

  const hands = {};
  for (const player of rooms[roomId]) {
    hands[player.id] = [deck.pop(), deck.pop()];
  }

  const community = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()]

  games[roomId] = {
    deck, 
    hands,
    community,
    pot: 0,
    phase: 'pre-flop',
    revealed: 0,
    currentPlayerIndex: 0,
    currentPlayer: rooms[roomId][0]?.name || null,
    buyIn: BUY_IN,
    current_bet: 0,
    bets: {},
    folded: {},
    chips: 500

  };
}

function advanceTurn(roomId) {
  const game = games[roomId];
  const players = rooms[roomId];
  console.log(game);
  console.log("Players:" ,players);
  if (!game || !players || players.length == 0) {
    return
  };
  let nextIndex = (game.currentPlayerIndex + 1) % players.length;

  //Skip folded players
  let looped = false;
  while (
    players.length > 0 &&
    game.folded &&
    players[nextIndex] && 
    game.folded[players[nextIndex].id]
  ) {
    nextIndex = (nextIndex + 1) % players.length;
    if (nextIndex === game.currentPlayerIndex) {
      looped = true;
      break; 
    };
      
  };
  
  // Only update if we didn't loop all the way
  if (!looped && players[nextIndex]) {
    console.log(game.currentPlayer);
    game.currentPlayerIndex = nextIndex
    game.currentPlayer = players[nextIndex].name;
  }
    
}

function allActiveCalled(roomId) {
  const game = games[roomId]
  const players = rooms[roomId]

  if (!game || ! players) return;

  return players
    .filter(p => !game.folded[p.id])
    .every(p => (game.bets[p.id]|| 0) === game.currentBet);
}

function getCardValue(card) {
  const value = card.slice(1);
  const values = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
  return values[value] || parseInt(value);
};

function getCardSuit(card) {
  return card[0];
};

function getCombs(cards, r) {
  const combinations = [];

  function backtrack(start, currentComb) {
    if (currentComb.length == r) {
      combinations.push([...currentComb]); 
      return;
    };

    for (let i = start; i < cards.length; i++) {
      currentComb.push(cards[i]);
      backtrack(i+1, currentComb);
      currentComb.pop();

    };
  };
  backtrack(0, []);
  return combinations
};

function evaluateHand(playerCards, communityCards) {
  
}



function nextPhase(roomId) {
  const game = games[roomId]

  if (!game) return

  if (game.phase == 'pre-flop') {
    game.phase = 'flop';
    game.revealed = 3;
  } else if (game.phase == 'flop') {
    game.phase = 'turn';
    game.revealed = 4;
  } else if (game.phase == 'turn') {
    game.phase = 'river';
    game.revealed = 5;
  } else if (game.phase == 'river') {
    game.phase = 'showdown'
  }
  game.bets = {};
  game.currentBet = 0;
}

const checkAllReady = (roomId) => {
  const room = rooms[roomId]
  if (room && room.length > 0) {
    return room.every(player => player.ready)
  }
  return false
}

const buyIn = 500;

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);


  socket.on("join_room", (roomId, username) => {
    socket.join(roomId);
    console.log(`${username} joined room ${roomId}`);

    // Add user to room state
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, name: username, ready: false, chips: buyIn });

    // Emit updated player list to everyone in the room
    io.to(roomId).emit("room_update", rooms[roomId]);

    const allReady = checkAllReady(roomId);
    io.to(roomId).emit("ready_status", {
      allReady: allReady,
      readyCount: rooms[roomId].filter(p => p.ready).length,
      totalPlayers: rooms[roomId].length
    })

  });

  socket.on("toggle_ready", (roomId) => {
    const room = rooms[roomId];
    if (room) {
      const player = room.find(p => p.id === socket.id);
      if (player) {
        player.ready = !player.ready;
        console.log(`${player.name} is now ${player.ready ? 'ready' : 'not ready'}`);

        const allReady = checkAllReady(roomId)
        console.log("Emmiting room_update", rooms[roomId]);
        io.to(roomId).emit("room_update", rooms[roomId]);

        io.to(roomId).emit("ready_status", {
          allReady: allReady,
          readyCount: room.filter(p => p.ready).length,
          totalPlayers: room.length
        });
        if (allReady) {
          console.log(`Room ${roomId} has started`);
        }
      }
    }
  });

  socket.on("join_lobby", (roomId) => {
    if (!lobbyStatus[roomId]) lobbyStatus[roomId] = new Set();
    lobbyStatus[roomId].add(socket.id);

    // Check if all players are in the lobby
    const allInLobby = rooms[roomId] && rooms[roomId].every(p => lobbyStatus[roomId].has(p.id));
    if (allInLobby) {
      startGame(roomId);
      io.to(roomId).emit("game_started", games[roomId]);
      // Optionally, clear the lobbyStatus for this room
      delete lobbyStatus[roomId];
    }
  });


  socket.on("player_action", (roomId, action) => {
    const game = games[roomId];
    const players = rooms[roomId];
    const playerIndex = game.currentPlayerIndex;
    const player = players[playerIndex];

    if (socket.id !== player.id) {
      return
    };

    if (action == "bet") {
      const betAmount = (game.currentBet || 0) + 10;
      const toAdd = betAmount - (game.bets[player.id] || 0);
      if (player.chips < toAdd) {
        return
      };
      console.log("Before bet:", player.chips)
      player.chips -= toAdd;
      console.log("After bet:", player.chips)
      game.pot += toAdd
 
      game.bets[player.id] = betAmount;
      game.currentBet = betAmount;
 
    } else if (action == "call") {
      const callAmount = game.currentBet;
      const toAdd = callAmount - (game.bets[player.id] || 0);
      if (player.chips < toAdd) return;
      console.log("Players: ", players)
      console.log("Before bet:", player.chips)
      player.chips -= toAdd;
      console.log("After bet:", player.chips)
      game.pot += toAdd;
      game.bets[player.id] = callAmount;

    } else if (action == "fold") {
      game.folded[player.id] = true

    } else if (action == "check") {
      if ((game.bets[player.id] || 0) !== game.currentBet) {
        return
      };

    }

    advanceTurn(roomId);

    if ((allActiveCalled)(roomId)) {
      nextPhase(roomId)
    };

    io.to(roomId).emit("game_state", games[roomId]);
    io.to(roomId).emit("room_update", rooms[roomId])
  });

  socket.on("get_room_state", (roomId) => {
    socket.emit("room_update", rooms[roomId]);
  });


  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    // Clean up from all rooms
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
      io.to(roomId).emit("room_update", rooms[roomId]);
    }
  });
});

server.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
