# 🃏 Poker Game & AI Training API

A full-featured poker game built with **Node.js**, **Express**, **React**, and **Socket.io**. Includes both a real-time multiplayer poker game and a comprehensive REST API for AI training and poker simulations.

## 🎮 Features

### Real-Time Poker Game
- **Multiplayer Texas Hold'em** with real-time updates
- **Complete poker mechanics**: betting, calling, raising, folding, checking
- **Hand evaluation**: All poker hands from high card to straight flush
- **Winner detection** with pot distribution
- **Phase progression**: Pre-flop → Flop → Turn → River → Showdown

### AI Training API
- **RESTful API** for poker game simulation
- **Hand evaluation** endpoint for AI decision making
- **Batch simulation** for training data generation
- **Complete game state management** for AI agents
- **Action validation** and game rule enforcement

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd poker-project
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

3. **Install frontend dependencies:**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the backend server:**
```bash
cd backend
node index.js
```
Server runs on `http://localhost:3001`

2. **Start the frontend (new terminal):**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:3000`

3. **Access the game:**
   - Open `http://localhost:3000` in your browser
   - Create or join a room
   - Wait for players to ready up and start playing!

## 🤖 AI Training API

### Base URL
```
http://localhost:3001/api/poker
```

### Core Endpoints

#### 1. Create New Game
```http
POST /api/poker/game/new
Content-Type: application/json

{
    "numPlayers": 2
}
```

**Response:**
```json
{
    "gameId": "abc123",
    "numPlayers": 2,
    "phase": "pre-flop",
    "currentPlayer": 0,
    "players": [...]
}
```

#### 2. Get Game State
```http
GET /api/poker/game/{gameId}/state
```

**Response:**
```json
{
    "gameId": "abc123",
    "phase": "pre-flop",
    "pot": 100,
    "currentBet": 50,
    "currentPlayer": 1,
    "communityCards": ["♠A", "♥K", "♦Q"],
    "isComplete": false,
    "winner": null,
    "players": [...]
}
```

#### 3. Get Player Private Info
```http
GET /api/poker/game/{gameId}/player/{playerId}
```

**Response:**
```json
{
    "playerId": "player_0",
    "hand": ["♠A", "♥K"],
    "chips": 950,
    "currentBet": 50,
    "folded": false,
    "isCurrentPlayer": true
}
```

#### 4. Make Action
```http
POST /api/poker/game/{gameId}/action
Content-Type: application/json

{
    "playerId": "player_0",
    "action": "bet",
    "amount": 100
}
```

**Actions:** `"fold"`, `"check"`, `"call"`, `"bet"`, `"raise"`

**Response:**
```json
{
    "success": true,
    "action": "bet",
    "amount": 100,
    "gameEnded": false,
    "newState": {
        "phase": "pre-flop",
        "pot": 150,
        "currentBet": 100,
        "currentPlayer": 1,
        "isComplete": false
    }
}
```

#### 5. Evaluate Hand Strength
```http
POST /api/poker/hands/evaluate
Content-Type: application/json

{
    "holeCards": ["♠A", "♥K"],
    "communityCards": ["♠Q", "♣J", "♦10", "♥9", "♣8"]
}
```

**Response:**
```json
{
    "bestHand": ["♠A", "♥K", "♠Q", "♣J", "♦10"],
    "score": 4014,
    "handType": "Straight",
    "allPossibleHands": 21
}
```

#### 6. Batch Simulation
```http
POST /api/poker/simulate/batch
Content-Type: application/json

{
    "numGames": 100,
    "numPlayers": 2
}
```

**Response:**
```json
{
    "batchSize": 100,
    "games": [
        {
            "gameId": 0,
            "winner": "player_1",
            "finalPot": 150,
            "hands": {...},
            "community": [...]
        }
    ],
    "summary": {
        "totalGames": 100,
        "avgPot": 125.5
    }
}
```

## 🧠 AI Training Examples

### Python Example
```python
import requests
import json

# Create a new game
response = requests.post('http://localhost:3001/api/poker/game/new', 
                        json={'numPlayers': 2})
game_data = response.json()
game_id = game_data['gameId']

# Get game state
state = requests.get(f'http://localhost:3001/api/poker/game/{game_id}/state').json()
current_player = f"player_{state['currentPlayer']}"

# Make an action
action_response = requests.post(
    f'http://localhost:3001/api/poker/game/{game_id}/action',
    json={
        'playerId': current_player,
        'action': 'bet',
        'amount': 50
    }
)

# Evaluate hand strength for decision making
hand_eval = requests.post(
    'http://localhost:3001/api/poker/hands/evaluate',
    json={
        'holeCards': ['♠A', '♥K'],
        'communityCards': ['♠Q', '♣J', '♦10']
    }
)
hand_strength = hand_eval.json()['score']
```

### JavaScript Example
```javascript
// Create game and make actions
async function playPokerGame() {
    // Create new game
    const gameResponse = await fetch('http://localhost:3001/api/poker/game/new', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({numPlayers: 2})
    });
    const game = await gameResponse.json();
    
    // Make an action
    const actionResponse = await fetch(`http://localhost:3001/api/poker/game/${game.gameId}/action`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            playerId: 'player_0',
            action: 'bet',
            amount: 50
        })
    });
    
    return actionResponse.json();
}
```

## 🃏 Poker Hand Rankings

The API uses numeric scores for hand evaluation:

| Hand Type | Score Range | Example |
|-----------|-------------|---------|
| **Straight Flush** | 8000+ | `8014` (A-K-Q-J-10 suited) |
| **Four of a Kind** | 7000+ | `7014` (Four Aces) |
| **Full House** | 6000+ | `6014` (AAA KK) |
| **Flush** | 5000+ | `5014` (A-K-Q-J-9 suited) |
| **Straight** | 4000+ | `4014` (A-K-Q-J-10) |
| **Three of a Kind** | 3000+ | `3014` (Three Aces) |
| **Two Pair** | 2000+ | `2014` (AA KK) |
| **One Pair** | 1000+ | `1014` (Pair of Aces) |
| **High Card** | 1-999 | `14` (Ace high) |

Higher scores always beat lower scores.

## 🎯 Game Flow for AI

1. **Create game** → Get `gameId`
2. **Loop until game complete:**
   - Get current game state
   - Check whose turn it is
   - Get player's private hand info
   - Evaluate hand strength (optional)
   - Make action decision
   - Submit action
   - Check if game ended
3. **Analyze results** for learning

## 🛠️ Technical Architecture

### Backend (`/backend`)
- **Express.js** server with Socket.io for real-time game
- **REST API** for AI training (`poker-api.js`)
- **Poker engine** with hand evaluation algorithms
- **Game state management** in memory

### Frontend (`/frontend`)
- **Next.js** React application
- **Socket.io client** for real-time updates
- **Responsive UI** for poker gameplay
- **TypeScript** for type safety

## 📁 Project Structure

```
poker-project/
├── backend/
│   ├── index.js          # Main server + real-time game
│   ├── poker-api.js      # AI training REST API
│   ├── test.js           # Poker logic tests
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx      # Home/lobby
│   │   └── lobby/[roomId]/page.tsx  # Game room
│   ├── components/
│   │   └── SocketContext.tsx
│   └── package.json
└── README.md
```

## 🧪 Testing

### Test Poker Logic
```bash
cd backend
node test.js
```

### Test API Endpoints
Use **Postman**, **curl**, or any HTTP client:

```bash
# Create game
curl -X POST http://localhost:3001/api/poker/game/new \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 2}'

# Evaluate hand
curl -X POST http://localhost:3001/api/poker/hands/evaluate \
  -H "Content-Type: application/json" \
  -d '{"holeCards": ["♠A", "♥K"], "communityCards": ["♠Q", "♣J", "♦10"]}'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built for AI poker research and training
- Implements standard Texas Hold'em rules
- Optimized for machine learning applications

---

**Happy coding and good luck with your poker AI!** 🤖🃏
