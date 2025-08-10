// Test cases for poker hand detection functions
const { getHandScore, getCombs, getCardValue, getCardSuit, evaluateHands } = require('./index.js');

console.log("=== Testing Poker Hand Detection ===");

// Test cases for different poker hands
const testCases = [
  {
    name: "High Card",
    cards: ["♠A", "♥K", "♦Q", "♣J", "♠9"],
    expected: "High Card"
  },
  {
    name: "One Pair",
    cards: ["♠A", "♥A", "♦Q", "♣J", "♠9"],
    expected: "One Pair"
  },
  {
    name: "Two Pair",
    cards: ["♠A", "♥A", "♦K", "♣K", "♠9"],
    expected: "Two Pair"
  },
  {
    name: "Three of a Kind",
    cards: ["♠A", "♥A", "♦A", "♣J", "♠9"],
    expected: "Three of a Kind"
  },
  {
    name: "Straight",
    cards: ["♠A", "♥K", "♦Q", "♣J", "♠10"],
    expected: "Straight"
  },
  {
    name: "Flush",
    cards: ["♠A", "♠K", "♠Q", "♠J", "♠9"],
    expected: "Flush"
  },
  {
    name: "Full House",
    cards: ["♠A", "♥A", "♦A", "♣K", "♠K"],
    expected: "Full House"
  },
  {
    name: "Four of a Kind",
    cards: ["♠A", "♥A", "♦A", "♣A", "♠9"],
    expected: "Four of a Kind"
  },
  {
    name: "Straight Flush",
    cards: ["♠A", "♠K", "♠Q", "♠J", "♠10"],
    expected: "Straight Flush"
  }
];

// Test individual functions
console.log("\n=== Testing Individual Functions ===");

// Test getCardValue
console.log("Testing getCardValue:");
console.log("A =", getCardValue("♠A"));
console.log("K =", getCardValue("♥K"));
console.log("Q =", getCardValue("♦Q"));
console.log("J =", getCardValue("♣J"));
console.log("10 =", getCardValue("♠10"));
console.log("9 =", getCardValue("♥9"));

// Test getCardSuit
console.log("\nTesting getCardSuit:");
console.log("♠A suit =", getCardSuit("♠A"));
console.log("♥K suit =", getCardSuit("♥K"));
console.log("♦Q suit =", getCardSuit("♦Q"));
console.log("♣J suit =", getCardSuit("♣J"));

// Test getCombs
console.log("\nTesting getCombs:");
const testCards = ["♠A", "♥K", "♦Q"];
const combinations = getCombs(testCards, 2);
console.log("Combinations of", testCards, "choose 2:", combinations);

// Test getHandScore
console.log("\n=== Testing getHandScore ===");
testCases.forEach(testCase => {
  const score = getHandScore(testCase.cards);
  console.log(`${testCase.name}: Score = ${score}`);
});

// Test evaluateHands with different scenarios
console.log("\n=== Testing evaluateHands ===");

// Mock the rooms object for testing
const originalRooms = require('./index.js').rooms || {};

// Scenario 1: Player 1 has better hand
const testGame1 = {
  hands: {
    "player1": ["♠A", "♥A"], // Pair of Aces
    "player2": ["♠K", "♥K"]  // Pair of Kings
  },
  community: ["♠Q", "♣J", "♦10", "♥9", "♣8"]
};

// Set up mock room data
const mockRooms = {
  "test-room-1": [
    { id: "player1", name: "Player 1" },
    { id: "player2", name: "Player 2" }
  ]
};

// Temporarily replace the rooms object
const originalEvaluateHands = evaluateHands;
const mockEvaluateHands = (game, roomId) => {
  // Mock the rooms lookup
  const players = mockRooms[roomId] || [];
  const communityCards = game.community;
  const playerHands = game.hands;

  console.log(`\n--- Testing ${roomId} ---`);
  console.log("Community cards:", communityCards);

  for (let player of players) {
    const holeCards = playerHands[player.id];
    console.log(`${player.name} hole cards:`, holeCards);
    
    const allCards = [...holeCards, ...communityCards];
    console.log(`${player.name} all cards:`, allCards);
    
    let allCombs = getCombs(allCards, 5);
    console.log(`${player.name} has ${allCombs.length} possible 5-card combinations`);

    let bestScore = 0;
    let bestHand = null;
    for (let combs of allCombs) {
      const score = getHandScore(combs);
      if (score > bestScore) {
        bestScore = score;
        bestHand = combs;
      }
    }
    player.bestScore = bestScore;
    console.log(`${player.name} best hand:`, bestHand, "Score:", bestScore);
  }

  const highestScore = Math.max(...players.map(p => p.bestScore));
  const winners = players.filter(p => p.bestScore === highestScore);
  
  return winners;
};

console.log("Scenario 1: Player 1 should win (better pair)");
const winners1 = mockEvaluateHands(testGame1, "test-room-1");
console.log("Winners:", winners1);

// Scenario 2: Tie game
const testGame2 = {
  hands: {
    "player1": ["♠A", "♥A"], // Pair of Aces
    "player2": ["♠A", "♦A"]  // Also pair of Aces
  },
  community: ["♠Q", "♣J", "♦10", "♥9", "♣8"]
};

mockRooms["test-room-2"] = [
  { id: "player1", name: "Player 1" },
  { id: "player2", name: "Player 2" }
];

console.log("\nScenario 2: Should be a tie");
const winners2 = mockEvaluateHands(testGame2, "test-room-2");
console.log("Winners:", winners2);

// Scenario 3: Three players with different pairs (no straight possible)
const testGame3 = {
  hands: {
    "player1": ["♠A", "♥A"], // Pair of Aces
    "player2": ["♠K", "♥K"], // Pair of Kings
    "player3": ["♠Q", "♥Q"]  // Pair of Queens
  },
  community: ["♠2", "♣3", "♦4", "♥5", "♣6"] // No straight possible
};

mockRooms["test-room-3"] = [
  { id: "player1", name: "Player 1" },
  { id: "player2", name: "Player 2" },
  { id: "player3", name: "Player 3" }
];

console.log("\nScenario 3: Player 1 should win (highest pair)");
const winners3 = mockEvaluateHands(testGame3, "test-room-3");
console.log("Winners:", winners3);

// Scenario 4: Straight vs Pair
const testGame4 = {
  hands: {
    "player1": ["♠A", "♥K"], // Can make straight
    "player2": ["♠Q", "♥Q"]  // Pair of Queens
  },
  community: ["♠J", "♣10", "♦9", "♥8", "♣7"]
};

mockRooms["test-room-4"] = [
  { id: "player1", name: "Player 1" },
  { id: "player2", name: "Player 2" }
];

console.log("\nScenario 4: Player 1 should win (straight vs pair)");
const winners4 = mockEvaluateHands(testGame4, "test-room-4");
console.log("Winners:", winners4);

console.log("\n=== Testing Complete ===");