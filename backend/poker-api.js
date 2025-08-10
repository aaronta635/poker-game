const express = require('express');
const { getHandScore, getCombs, getCardValue, getCardSuit, evaluateHands } = require('./index.js');

const router = express.Router();

// Store active games in memory (in production, use a database)
const activeGames = {};

// Game simulation functions
function createDeck() {
  const suits = ['♣️', '♠️', '♥️', '♦️'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  let deck = [];
  for (let s of suits) for (let v of values) deck.push(s + v);
  return deck.sort(() => Math.random() - 0.5);
}

function createGame(numPlayers = 2) {
  const deck = createDeck();
  const gameId = Math.random().toString(36).substr(2, 9);
  
  const game = {
    gameId,
    players: [],
    hands: {},
    community: [],
    pot: 0,
    phase: 'pre-flop',
    revealed: 0,
    currentBet: 0,
    bets: {},
    folded: {},
    currentPlayerIndex: 0,
    deck,
    isComplete: false,
    winner: null
  };

  // Create players and deal hole cards
  for (let i = 0; i < numPlayers; i++) {
    const playerId = `player_${i}`;
    game.players.push({ 
      id: playerId, 
      name: `Player ${i}`,
      chips: 1000 
    });
    game.hands[playerId] = [deck.pop(), deck.pop()];
    game.bets[playerId] = 0;
    game.folded[playerId] = false;
  }
  
  // Deal community cards (face down initially)
  game.community = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
  
  // Set revealed cards based on phase
  game.revealed = getRevealedCards(game.phase);
  
  // Store game
  activeGames[gameId] = game;
  
  return game;
}

function getRevealedCards(phase) {
  switch(phase) {
    case 'pre-flop': return 0;
    case 'flop': return 3;
    case 'turn': return 4;
    case 'river': return 5;
    case 'showdown': return 5;
    default: return 0;
  }
}

function advancePhase(game) {
  if (game.phase === 'pre-flop') {
    game.phase = 'flop';
    game.revealed = 3;
  } else if (game.phase === 'flop') {
    game.phase = 'turn';
    game.revealed = 4;
  } else if (game.phase === 'turn') {
    game.phase = 'river';
    game.revealed = 5;
  } else if (game.phase === 'river') {
    game.phase = 'showdown';
    game.revealed = 5;
    
    // Determine winner using your existing logic
    const mockRooms = {};
    mockRooms[game.gameId] = game.players;
    
    try {
      const winners = evaluateHands(game, game.gameId, mockRooms);
      game.winner = winners;
      game.isComplete = true;
    } catch (error) {
      console.error('Error evaluating hands:', error);
      // Fallback: random winner
      const activePlayers = game.players.filter(p => !game.folded[p.id]);
      game.winner = [activePlayers[0]];
      game.isComplete = true;
    }
  }
  
  // Reset for new phase
  game.bets = {};
  game.currentBet = 0;
  game.currentPlayerIndex = 0;
}

function allPlayersActed(game) {
  const activePlayers = game.players.filter(p => !game.folded[p.id]);
  if (activePlayers.length <= 1) return true; // If only 1 or 0 players left, consider all acted
  return activePlayers.every(p => game.bets[p.id] !== undefined);
}

function allPlayersCalled(game) {
  const activePlayers = game.players.filter(p => !game.folded[p.id]);
  if (activePlayers.length <= 1) return true; // If only 1 or 0 players left, consider all called
  return activePlayers.every(p => (game.bets[p.id] || 0) === game.currentBet);
}

// API Endpoints

// 1. Create new game
router.post('/game/new', (req, res) => {
  try {
    const { numPlayers = 2 } = req.body;
    
    if (numPlayers < 2 || numPlayers > 10) {
      return res.status(400).json({ error: 'Number of players must be between 2 and 10' });
    }
    
    const game = createGame(numPlayers);
    
    res.json({
      gameId: game.gameId,
      numPlayers: numPlayers,
      phase: game.phase,
      currentPlayer: game.currentPlayerIndex,
      players: game.players.map(p => ({ id: p.id, name: p.name, chips: p.chips }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get player's private information
router.get('/game/:gameId/player/:playerId', (req, res) => {
  try {
    const { gameId, playerId } = req.params;
    const game = activeGames[gameId];
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (!game.hands[playerId]) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const player = game.players.find(p => p.id === playerId);
    
    res.json({
      playerId,
      hand: game.hands[playerId],
      chips: player.chips,
      currentBet: game.bets[playerId] || 0,
      folded: game.folded[playerId] || false,
      isCurrentPlayer: game.players[game.currentPlayerIndex]?.id === playerId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get public game state
router.get('/game/:gameId/state', (req, res) => {
  try {
    const { gameId } = req.params;
    const game = activeGames[gameId];
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({
      gameId: game.gameId,
      phase: game.phase,
      pot: game.pot,
      currentBet: game.currentBet,
      currentPlayer: game.currentPlayerIndex,
      currentPlayerName: game.players[game.currentPlayerIndex]?.name,
      communityCards: game.community.slice(0, game.revealed),
      isComplete: game.isComplete,
      winner: game.winner,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        bet: game.bets[p.id] || 0,
        folded: game.folded[p.id] || false,
        inGame: !game.folded[p.id]
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Make action
router.post('/game/:gameId/action', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, action, amount } = req.body;
    
    const game = activeGames[gameId];
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.isComplete) {
      return res.status(400).json({ error: 'Game is already complete' });
    }
    
    const currentPlayer = game.players[game.currentPlayerIndex];
    
    if (currentPlayer.id !== playerId) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    const player = game.players.find(p => p.id === playerId);
    
    // Process the action
    switch(action) {
      case 'fold':
        game.folded[playerId] = true;
        break;
        
      case 'check':
        if (game.currentBet > (game.bets[playerId] || 0)) {
          return res.status(400).json({ error: 'Cannot check, must call or fold' });
        }
        game.bets[playerId] = game.bets[playerId] || 0;
        break;
        
      case 'call':
        const callAmount = game.currentBet - (game.bets[playerId] || 0);
        if (callAmount > player.chips) {
          return res.status(400).json({ error: 'Not enough chips to call' });
        }
        player.chips -= callAmount;
        game.pot += callAmount;
        game.bets[playerId] = game.currentBet;
        break;
        
      case 'bet':
      case 'raise':
        if (!amount || amount <= game.currentBet) {
          return res.status(400).json({ error: 'Bet amount must be higher than current bet' });
        }
        const betAmount = amount - (game.bets[playerId] || 0);
        if (betAmount > player.chips) {
          return res.status(400).json({ error: 'Not enough chips to bet' });
        }
        player.chips -= betAmount;
        game.pot += betAmount;
        game.bets[playerId] = amount;
        game.currentBet = amount;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Check if only one player remains (game should end)
    const activePlayers = game.players.filter(p => !game.folded[p.id]);
    
    if (activePlayers.length === 1) {
      // Game ends - only one player left
      game.isComplete = true;
      game.winner = activePlayers;
      game.phase = 'complete';
      
      // Award pot to winner
      const winner = activePlayers[0];
      winner.chips += game.pot;
      game.pot = 0;
      
      return res.json({
        success: true,
        action: action,
        amount: amount || 0,
        gameEnded: true,
        winner: game.winner,
        newState: {
          phase: game.phase,
          pot: game.pot,
          currentBet: game.currentBet,
          currentPlayer: game.currentPlayerIndex,
          isComplete: game.isComplete,
          winner: game.winner
        }
      });
    }
    
    // Advance to next player
    let nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    
    // Skip folded players
    while (game.folded[game.players[nextPlayerIndex].id] && nextPlayerIndex !== game.currentPlayerIndex) {
      nextPlayerIndex = (nextPlayerIndex + 1) % game.players.length;
    }
    
    game.currentPlayerIndex = nextPlayerIndex;
    
    // Check if phase should advance (only if game isn't complete)
    if (!game.isComplete && (game.currentBet === 0 ? allPlayersActed(game) : allPlayersCalled(game))) {
      advancePhase(game);
    }
    
    res.json({
      success: true,
      action: action,
      amount: amount || 0,
      newState: {
        phase: game.phase,
        pot: game.pot,
        currentBet: game.currentBet,
        currentPlayer: game.currentPlayerIndex,
        isComplete: game.isComplete,
        winner: game.winner
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Evaluate hand strength
router.post('/hands/evaluate', (req, res) => {
  try {
    const { holeCards, communityCards } = req.body;
    
    if (!holeCards || !communityCards) {
      return res.status(400).json({ error: 'holeCards and communityCards are required' });
    }
    
    if (holeCards.length !== 2) {
      return res.status(400).json({ error: 'holeCards must contain exactly 2 cards' });
    }
    
    if (communityCards.length < 3 || communityCards.length > 5) {
      return res.status(400).json({ error: 'communityCards must contain 3-5 cards' });
    }
    
    const allCards = [...holeCards, ...communityCards];
    const combinations = getCombs(allCards, 5);
    
    let bestScore = 0;
    let bestHand = null;
    
    for (let combo of combinations) {
      const score = getHandScore(combo);
      if (score > bestScore) {
        bestScore = score;
        bestHand = combo;
      }
    }
    
    res.json({
      holeCards,
      communityCards,
      bestHand,
      score: bestScore,
      handType: getHandType(bestScore),
      allPossibleHands: combinations.length
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function getHandType(score) {
  if (score >= 8000) return 'Straight Flush';
  if (score >= 7000) return 'Four of a Kind';
  if (score >= 6000) return 'Full House';
  if (score >= 5000) return 'Flush';
  if (score >= 4000) return 'Straight';
  if (score >= 3000) return 'Three of a Kind';
  if (score >= 2000) return 'Two Pair';
  if (score >= 1000) return 'One Pair';
  return 'High Card';
}

// 6. Simulate complete game (for batch training)
router.post('/simulate/batch', (req, res) => {
  try {
    const { numGames = 100, numPlayers = 2 } = req.body;
    
    if (numGames > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 games per batch' });
    }
    
    const results = [];
    
    for (let i = 0; i < numGames; i++) {
      const game = createGame(numPlayers);
      
      // Simulate random actions until game completes
      while (!game.isComplete && game.phase !== 'showdown') {
        const currentPlayer = game.players[game.currentPlayerIndex];
        
        if (game.folded[currentPlayer.id]) {
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
          continue;
        }
        
        // Random action for simulation
        const actions = ['fold', 'call', 'check', 'bet'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        try {
          // Simulate action (simplified)
          if (randomAction === 'fold') {
            game.folded[currentPlayer.id] = true;
          } else if (randomAction === 'bet' && game.currentBet === 0) {
            game.currentBet = 50;
            game.bets[currentPlayer.id] = 50;
            game.pot += 50;
          } else {
            game.bets[currentPlayer.id] = game.currentBet;
          }
          
          game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
          
          // Check if should advance phase
          if (allPlayersCalled(game)) {
            advancePhase(game);
          }
        } catch (error) {
          // Skip on error
          break;
        }
      }
      
      // Finalize game
      if (!game.isComplete && game.phase === 'showdown') {
        advancePhase(game);
      }
      
      results.push({
        gameId: i,
        winner: game.winner?.[0]?.id || 'unknown',
        finalPot: game.pot,
        hands: game.hands,
        community: game.community,
        phases: ['pre-flop', 'flop', 'turn', 'river', 'showdown']
      });
      
      // Clean up
      delete activeGames[game.gameId];
    }
    
    res.json({ 
      batchSize: numGames,
      games: results,
      summary: {
        totalGames: results.length,
        avgPot: results.reduce((sum, game) => sum + game.finalPot, 0) / results.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Get all active games (for debugging)
router.get('/games', (req, res) => {
  const gamesList = Object.keys(activeGames).map(gameId => ({
    gameId,
    phase: activeGames[gameId].phase,
    players: activeGames[gameId].players.length,
    pot: activeGames[gameId].pot,
    isComplete: activeGames[gameId].isComplete
  }));
  
  res.json({ activeGames: gamesList.length, games: gamesList });
});

// 8. Delete game (cleanup)
router.delete('/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  
  if (activeGames[gameId]) {
    delete activeGames[gameId];
    res.json({ success: true, message: 'Game deleted' });
  } else {
    res.status(404).json({ error: 'Game not found' });
  }
});

module.exports = router;
