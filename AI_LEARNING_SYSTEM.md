# AI Learning System - Implementation Guide

## ✅ System Overview

A production-ready, self-improving AI scoring system that learns from historical trades and automatically adjusts signal quality weights over time.

## 📊 Architecture

### 1. **Database Schema** (Already in Supabase)

```sql
-- Stores every completed trade
ai_trade_history
  - symbol, trend, strategy_type
  - entry/stop/takeprofit levels
  - result (WIN/LOSS), result_r
  - ai_score, indicators (RSI, EMA, volume)

-- Stores AI weight versions
ai_weights
  - trend_weight, volume_weight, rsi_weight
  - entry_quality_weight, historical_performance_weight
  - version tracking, created_at

-- Stores aggregated performance stats
historical_performance
  - setup_signature (symbol|trend|strategy)
  - total_trades, wins, losses, win_rate, avg_r
```

### 2. **Core Engine** (`src/lib/ai-learning/engine.ts`)

#### Key Functions:

- **`buildSetupStats(trades)`** - Groups trades by (symbol + trend + strategy) and calculates:
  - Win/loss count
  - Win rate (%)
  - Average R value

- **`calculateAdaptiveAiScore(params)`** - Calculates AI score (0-100) based on:
  - Trend score (uptrend=80, downtrend=70, sideways=40)
  - RSI score (oversold/overbought get higher scores)
  - Volume score (normalized from indicators)
  - Entry quality score
  - Historical performance (win rate from past setups)
  - Applied weights on each factor

- **`recalculateAiWeights(trades)`** - Adjusts weights based on recent performance:
  - Analyzes which factors correlate with wins
  - Updates weight distribution (sum to 1.0)
  - Ensures stable, normalized weights

- **`getConfidenceLabel(score)`** - Maps score to confidence:
  - HIGH: score >= 70
  - MEDIUM: 50-70
  - LOW: < 50

- **`analyzePerformanceMetrics(trades)`** - Produces detailed breakdown by:
  - Symbol (BTCUSDT, ETHUSDT, etc.)
  - Trend type (UPTREND, DOWNTREND, SIDEWAYS)
  - Strategy type

### 3. **Server Utilities** (`src/lib/ai-learning/server.ts`)

Server-only functions for database operations:

- **`getLatestWeightsFromDb()`** - Fetch latest weight version
- **`recordTrade(trade)`** - Store trade result
- **`getRecentTrades(limit)`** - Get last N trades
- **`recalculateAndUpdateWeights()`** - Trigger weight recalculation
- **`getPerformanceMetrics()`** - Get performance analysis by symbol/trend/strategy

### 4. **API Routes**

#### `GET /api/ai-insights`
Returns comprehensive AI learning dashboard data:
```json
{
  "weights": [{ version, trend_weight, volume_weight, ... }],
  "performance": [{ symbol, total_trades, wins, win_rate, avg_r }],
  "metrics": { by_symbol, by_trend, by_strategy },
  "trades": [...]
}
```

#### `POST /api/ai-learning/record-trade`
Records a completed trade:
```json
{
  "symbol": "BTCUSDT",
  "trend": "UPTREND",
  "strategy_type": "Breakout",
  "result": "WIN",
  "result_r": 3,
  "ai_score": 75,
  "indicators": { "rsi": 35, "volume": 1000000 }
}
```

#### `POST /api/ai-learning/recalculate-weights`
Manually trigger weight recalculation (runs automatically)

#### `GET /api/ai-learning/weights`
Get current weight version

### 5. **UI Components**

#### Admin Dashboard (`/admin/ai-insights`)

- **AI Weight Evolution Chart** - Line chart showing weight changes over versions
- **Best Performing Setups** - Top 5 setups (win rate > 60%, trades > 10)
- **Worst Performing Setups** - Bottom 5 setups (win rate < 40%, trades > 10)
- **All Strategy Performance** - Full table of all setups with metrics

Uses shadcn/ui components (Card, Table) with Recharts for visualization.

### 6. **Client Hook** (`src/lib/hooks/useAiLearning.ts`)

```typescript
const { recordTrade, recalculateWeights, loading, error } = useAiLearning();

await recordTrade({
  symbol: 'BTCUSDT',
  trend: 'UPTREND',
  strategy_type: 'Breakout',
  result: 'WIN',
  result_r: 3,
  ai_score: 75,
});
```

## 🔄 Learning Feedback Loop

```
1. Signal Generated
   ↓
2. Trade Executed & Completed
   ↓
3. Result Recorded via API
   ↓
4. AI Engine Analyzes Performance
   ↓
5. Weights Recalculated
   ↓
6. New Weights Applied to Future Signals
   ↓
7. Repeat (Continuous Improvement)
```

## 📈 Weight Adjustment Logic

Default starting weights:
```
trend_weight: 0.25 (25%)
volume_weight: 0.20 (20%)
rsi_weight: 0.20 (20%)
entry_quality_weight: 0.20 (20%)
historical_performance_weight: 0.15 (15%)
```

Adjustment based on win rate correlation:
- If BUY signals in UPTREND have 80% win rate → increase trend_weight
- If low RSI entries fail often → decrease rsi_weight
- If high volume trades succeed → increase volume_weight

## 💡 Example: Learning in Action

### Scenario 1: RSI-based Trading Works
```
50 recent trades analyzed:
- Entries at RSI < 30: 30 trades, 24 wins (80% win rate)
- Entries at RSI > 70: 20 trades, 8 wins (40% win rate)

Result: rsi_weight increases from 0.20 to 0.28
```

### Scenario 2: BTCUSDT Uptrend Strategy Underperforms
```
Setup: BTCUSDT + UPTREND + Breakout
- 15 trades total
- 5 wins, 10 losses (33% win rate)

Result: Lower historical_performance_weight for this setup
→ Future signals for this setup get lower scores
```

## 🚀 Usage Examples

### 1. Record a Trade (After Position Closes)

```typescript
import { useAiLearning } from '@/lib/hooks/useAiLearning';

function TradeClosed() {
  const { recordTrade } = useAiLearning();

  const handleTradeEnd = async (tradeData) => {
    await recordTrade({
      symbol: 'BTCUSDT',
      trend: 'UPTREND',
      strategy_type: 'Breakout',
      result: 'WIN',
      result_r: 3,
      ai_score: 78,
      entry_zone: { min: 42000, max: 42500 },
      stop_loss: 41500,
      take_profit: 43500,
      indicators: {
        rsi: 28,
        ema_alignment: true,
        volume: 2500000,
      },
    });
  };

  return <button onClick={handleTradeEnd}>Close Position</button>;
}
```

### 2. Get AI Score for New Signal

```typescript
import { calculateAdaptiveAiScore, getLatestWeights } from '@/lib/ai-learning/engine';

async function scoreSignal(signal) {
  const weights = await getLatestWeights();
  
  const aiScore = calculateAdaptiveAiScore({
    baseScore: 60,
    symbol: signal.symbol,
    trend: signal.trend,
    strategyType: 'Breakout',
    rsi: 32,
    volume: 2000000,
    entryQuality: 75,
    weights,
    setupStats: new Map(), // from recent trades
  });

  return aiScore; // 0-100
}
```

### 3. View Analytics

```
GET http://localhost:3000/admin/ai-insights
→ View all performance metrics
→ Monitor weight evolution
→ Identify best/worst setups
```

## 🎯 Performance Metrics Tracked

### By Symbol
- Total trades
- Wins/Losses count
- Win rate percentage
- Average R value

### By Trend
- UPTREND: Total trades, win rate
- DOWNTREND: Total trades, win rate
- SIDEWAYS: Total trades, win rate

### By Strategy
- Strategy Type: Total trades, win rate, avg R

## ⚙️ Configuration

All constants in `src/lib/ai-learning/engine.ts`:

```typescript
const DEFAULT_WEIGHTS = {
  trend_weight: 0.25,
  volume_weight: 0.20,
  rsi_weight: 0.20,
  entry_quality_weight: 0.20,
  historical_performance_weight: 0.15,
};

// Thresholds for confidence labels
export function getConfidenceLabel(score: number) {
  if (score >= 70) return 'HIGH';  // Can adjust threshold
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}
```

## 🔐 Security & Permissions

- **Recording trades**: Requires server-side validation
- **Admin dashboard**: Protected by Next.js routing
- **Weight updates**: Only via server actions (no client manipulation)
- **Database**: Row-level security (RLS) enforced in Supabase

## 📝 Future Enhancements

### Optional Advanced Features

1. **Machine Learning Models**
   - Logistic regression: Predict win probability
   - Decision trees: Complex pattern detection
   - Neural networks: Multi-factor optimization

2. **Real-time Updates**
   - WebSocket streaming of trades
   - Live weight adjustments
   - Instant confidence label changes

3. **Advanced Analytics**
   - Drawdown analysis
   - Risk-adjusted returns (Sharpe ratio)
   - Equity curve visualization
   - Monte Carlo simulations

4. **Multi-account Learning**
   - Aggregate data across users
   - Identify universal patterns
   - Global weight optimization

5. **Custom Indicators**
   - Learn from additional technical indicators
   - User-defined scoring factors
   - A/B testing of weight strategies

## 🧪 Testing

```bash
# Record test trades
curl -X POST http://localhost:3000/api/ai-learning/record-trade \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","trend":"UPTREND","strategy_type":"Breakout","result":"WIN","result_r":3,"ai_score":75}'

# Get insights
curl http://localhost:3000/api/ai-insights

# Recalculate weights
curl -X POST http://localhost:3000/api/ai-learning/recalculate-weights
```

## 📚 File Structure

```
src/
├── lib/
│   ├── ai-learning/
│   │   ├── engine.ts          # Core AI scoring logic
│   │   └── server.ts          # Database operations (server-only)
│   └── hooks/
│       └── useAiLearning.ts   # React hook for trade recording
├── app/
│   ├── api/
│   │   ├── ai-insights/       # Main dashboard API
│   │   └── ai-learning/
│   │       ├── weights/       # Get weights
│   │       ├── record-trade/  # Record completed trade
│   │       └── recalculate-weights/  # Trigger recalculation
│   └── admin/
│       └── ai-insights/       # Admin dashboard UI
└── components/
    └── ui/
        ├── card.tsx           # Card component
        └── table.tsx          # Table component
```

## ✨ Key Benefits

1. **Self-Improving**: Automatically learns from every trade
2. **Adaptive**: Weights adjust based on performance
3. **Transparent**: Detailed analytics dashboard
4. **Scalable**: Handles 1000s of trades efficiently
5. **Production-Ready**: Type-safe, error-handled, fully tested
6. **Low Latency**: Fast weight lookups, efficient calculations

---

**System Status**: ✅ Fully Implemented & Running

**Last Updated**: April 22, 2026
