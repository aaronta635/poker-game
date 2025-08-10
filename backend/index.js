// backend/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(express.json()); // This parses JSON request bodies
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST"],
  },
});
const pokerAPI = require('./poker-api');

// Add this line with your other app.use statements
app.use('/api/poker', pokerAPI);

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
    chips: 500,
    acted: {}

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

function allActiveActed(roomId) {
  const game = games[roomId];
  const players = rooms[roomId];
  if (!game || !players) return false;
  
  const activePlayers = players.filter(p => !game.folded[p.id]);
  
  console.log("Active players count:", activePlayers.length);
  console.log("Players who acted count:", Object.keys(game.acted).length);
  console.log("Active player IDs:", activePlayers.map(p => p.id));
  console.log("Acted player IDs:", Object.keys(game.acted));
  
  return activePlayers.length > 0 && 
         activePlayers.every(p => game.acted[p.id]);
}

function getCardValue(card) {
  // Find the rank (10, or any single letter/number) at the end of the string
  const match = card.match(/(10|[2-9]|[JQKA])$/);
  if (!match) return NaN;
  
  const rank = match[1]; // Just the rank: 'K', 'A', '10', etc.
  const values = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11 };
  return values[rank] || parseInt(rank);
}

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

function evaluateHands(game, roomId) {
  const players = rooms[roomId];
  const communityCards = game.community;
  const playerHands = game.hands;

  for (let player of players) {
    const holeCards = playerHands[player.id]

    const allCards = [...holeCards, ...communityCards];
    let allCombs = getCombs(allCards, 5);

    let bestScore = 0;
    let score = 0
    for (let combs of allCombs) {
      score = getHandScore(combs);
      if (score > bestScore) {
        bestScore = score;
      };
    
    }
    player.bestScore = bestScore;

  }
  const highestScore = Math.max(...players.map(p => p.bestScore));
  const winners = players.filter(p => p.bestScore === highestScore);

  return winners;
}

function getHandScore(cards) {

  const values = cards.map(card => getCardValue(card)).sort((a, b) => a - b);
  const suits = cards.map(card => getCardSuit(card));

  function isFlush(suits) {
    const first_suit = suits[0];
    for (let suit of suits) {
      if (suit !== first_suit) {
        return false;
      };
    };
    return true
  };

  function isStraight(values) {
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i-1] + 1) {
        return false
      }
    }
    return true
  }

  function isOnePair(values) {
    const valuesCounts = {}
    let pairs = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] in valuesCounts) {
        valuesCounts[values[i]] += 1;
      } else {
        valuesCounts[values[i]] = 1;
      };
    };
    for (let value in valuesCounts) {
      if (valuesCounts[value] === 2) {
        pairs += 1;
      } 
    }
    return pairs === 1;  // One unique pair
  }

  function isTwoPair(values) {
    const valuesCounts = {}
    let pairs = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] in valuesCounts) {
        valuesCounts[values[i]] += 1;
      } else {
        valuesCounts[values[i]] = 1;
      };
    };
    for (let value in valuesCounts) {
      if (valuesCounts[value] === 2) {
        pairs += 1;
      } 
    }
    return pairs === 2;  // Two unique pair
  }

  function isTOAK(values) {
    const valuesCounts = {}
    for ( let i = 0; i < values.length; i++) {
      if (values[i] in valuesCounts) {
        valuesCounts[values[i]] += 1;
      } else {
        valuesCounts[values[i]] = 1;
      };
    };
    for ( let i = 0; i < values.length; i++) {
      if (valuesCounts[values[i]] === 3) {
        return true
      };
    };
    return false
  };

  function isFOAK(values) {
    const valuesCounts = {}
    for ( let i = 0; i < values.length; i++) {
      if (values[i] in valuesCounts) {
        valuesCounts[values[i]] += 1;
      } else {
        valuesCounts[values[i]] = 1;
      };
    };
    for (let i = 0; i < values.length; i++) {
      if (valuesCounts[values[i]] === 4) {
        return true
      };
    };
    return false
  };

  function isStraightFlush(values, suits) {
    if ((isStraight(values) === true) && (isFlush(suits) === true)) {
      return true
    };
    return false
  };

  function isFullHouse(values) {
    const valuesCounts = {}
    for (let i = 0; i < values.length; i++) {
      if (values[i] in valuesCounts) {
        valuesCounts[values[i]] += 1;
      } else {
        valuesCounts[values[i]] = 1;
      };
    };

    if ((valuesCounts[values[0]] === 3) && (valuesCounts[values[values.length-1]] === 2)) {
      return true
    };
    if ((valuesCounts[values[0]] === 2) && (valuesCounts[values[values.length-1]] === 3)) {
      return true
    };
    return false
  }

  if (isStraightFlush(values, suits)) {
    return 8000 + values[values.length - 1]; // Straight Flush
  }
  if (isFOAK(values)) {
    return 7000 + values[values.length - 1]; // Four of a Kind
  }
  if (isFullHouse(values)) {
    return 6000 + values[values.length - 1]; // Full House
  }
  if (isFlush(suits)) {
    return 5000 + values[values.length - 1]; // Flush
  }
  if (isStraight(values)) {
    return 4000 + values[values.length - 1]; // Straight
  }
  if (isTOAK(values)) {
    return 3000 + values[values.length - 1]; // Three of a Kind
  }
  if (isTwoPair(values)) {
    return 2000 + values[values.length - 1]; // Two Pair
  }
  if (isOnePair(values)) {
    return 1000 + values[values.length - 1]; // One Pair
  }
  
  return values[values.length - 1]; // High Card
};


function nextPhase(roomId) {
  const game = games[roomId]

  if (!game) return

  console.log(`Advancing from ${game.phase} to next phase`);


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
    
    const winners = evaluateHands(game, roomId);
    // After: const winners = evaluateHands(game, roomId);
    console.log("Game winners:", winners);
    console.log("Pot before distribution:", game.pot);

    // Distribute pot to winners
    const potPerWinner = Math.floor(game.pot / winners.length);
    console.log("Pot per winner:", potPerWinner);

    const players = rooms[roomId];
    winners.forEach(winner => {
      const player = players.find(p => p.id === winner.id);
      if (player) {
        console.log(`${player.name} chips before: ${player.chips}`);
        player.chips += potPerWinner;
        console.log(`${player.name} chips after: ${player.chips}`);
      }
    });

    io.to(roomId).emit("game_winners", winners);
    io.to(roomId).emit("room_update", rooms[roomId]); // Update chips
  };
    // Reset pot
  game.bets = {};
  game.currentBet = 0;
  game.acted = {}; // ADD THIS: Reset acted tracker
  game.currentPlayerIndex = 0;
  game.currentPlayer = rooms[roomId][0]?.name || null;

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

    if (!game || !players) {
      console.log("Game not started");
      return;
    }
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
        // After applying the action (bet/call/check/fold) and BEFORE deciding next step:
    // After applying the action and BEFORE deciding next step:
    game.acted[player.id] = true;
    console.log(`${player.name} acted. Players who acted:`, Object.keys(game.acted));

    // Decide next step based on whether a bet exists
    if ((game.currentBet || 0) === 0) {
      // No bet on table: advance only when all active players have acted (checked)
      if (allActiveActed(roomId)) {
        console.log("All players checked - advancing phase");
        nextPhase(roomId);
      } else {
        console.log("Not all players have checked - advancing turn");
        advanceTurn(roomId);
      }
    } else {
      // There is a bet: advance only when all active players have called
      if (allActiveCalled(roomId)) {
        console.log("All players called - advancing phase");
        nextPhase(roomId);
      } else {
        console.log("Not all players have called - advancing turn");
        advanceTurn(roomId);
      }
    }
    io.to(roomId).emit("game_state", games[roomId]);
    io.to(roomId).emit("room_update", rooms[roomId])
  });

  socket.on("get_room_state", (roomId) => {
    socket.emit("room_update", rooms[roomId]);
  });

  socket.on("start_new_game", (roomId) => {
    console.log("Starting new game for room:", roomId);
    if (rooms[roomId] && games[roomId]) {
      // Reset game state but keep player chips
      delete games[roomId]; // Delete old game
      startGame(roomId); // Create new game
      console.log("New game created:", games[roomId]);
      io.to(roomId).emit("game_started", games[roomId]);
    }
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

module.exports = {
  getHandScore,
  getCombs,
  getCardValue,
  getCardSuit,
  evaluateHands
};