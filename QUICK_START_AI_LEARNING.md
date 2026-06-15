# AI Learning System - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- ✅ Supabase project with schema deployed
- ✅ Next.js 16+ running
- ✅ Environment variables configured

### 1. Record Your First Trade

Use the hook in any client component:

```typescript
import { useAiLearning } from '@/lib/hooks/useAiLearning';

export function TradingComponent() {
  const { recordTrade, loading, error } = useAiLearning();

  const handleTradeClosed = async () => {
    const result = await recordTrade({
      symbol: 'BTCUSDT',
      trend: 'UPTREND',
      strategy_type: 'Breakout',
      result: 'WIN',      // or 'LOSS'
      result_r: 3,        // Profit in R units
      ai_score: 75,       // Initial score before outcome
      indicators: {
        rsi: 32,
        ema_alignment: true,
        volume: 2500000,
      },
    });

    if (result.success) {
      console.log('Trade recorded!');
    }
  };

  return (
    <button onClick={handleTradeClosed} disabled={loading}>
      {loading ? 'Recording...' : 'Close & Record Trade'}
    </button>
  );
}
```

### 2. View Performance Dashboard

Navigate to: **`/admin/ai-insights`**

You'll see:
- 📈 **Weight Evolution Chart** - How AI is learning
- 🏆 **Best Setups** - Your most profitable patterns
- 📉 **Worst Setups** - What to avoid
- 📊 **All Trades** - Complete performance table

### 3. Integrate into Signals Page

```typescript
import { useAiLearning } from '@/lib/hooks/useAiLearning';
import { calculateAdaptiveAiScore, getLatestWeights } from '@/lib/ai-learning/engine';

export function SignalsPage() {
  const { recordTrade } = useAiLearning();
  const [signals, setSignals] = useState([]);
  const [weights, setWeights] = useState(null);

  useEffect(() => {
    // Get latest weights when component mounts
    getLatestWeights().then(setWeights);
  }, []);

  // When user closes a position
  const onPositionClose = async (signal, result, resultR) => {
    await recordTrade({
      symbol: signal.symbol,
      trend: signal.trend,
      strategy_type: signal.type,
      result,
      result_r: resultR,
      ai_score: signal.aiScore,
      indicators: signal.indicators,
    });
    
    // Trigger weight recalculation (optional)
    // await recalculateWeights();
  };

  return (
    // Render signals and track outcomes
  );
}
```

## 📊 Understanding the Metrics

### AI Score (0-100)
- **70+**: HIGH confidence signal
- **50-70**: MEDIUM confidence signal
- **<50**: LOW confidence signal

### Win Rate
Percentage of winning trades for a specific setup:
```
Win Rate = Wins / Total Trades × 100%
```

### Average R
Average profit per trade in risk units:
```
If risk = $100, Average R = 2.5
→ Average profit = $250 per trade
```

### Setup Performance
Tracked by **Symbol + Trend + Strategy**:
```
Example: BTCUSDT + UPTREND + Breakout
→ 50 trades, 35 wins, 15 losses
→ 70% win rate, 2.1 average R
```

## 🔄 How Learning Works

### Before: Static Scoring
```
Signal Score = Fixed Weights × Indicators
(Same formula for all trades)
```

### After: Adaptive Learning
```
Signals recorded
    ↓
Performance analyzed
    ↓
Best factors identified
    ↓
Weights adjusted
    ↓
Future signals scored with new weights
    ↓
System improves over time
```

## 📈 Example Learning Cycle

### Day 1: Initial Setup
```
trend_weight: 0.25
volume_weight: 0.20
rsi_weight: 0.20
entry_quality_weight: 0.20
historical_performance_weight: 0.15
```

### Day 1-7: Record 50 Trades
```
Analysis shows:
- Entries at RSI < 30: 80% win rate
- High volume entries: 75% win rate
- Uptrend entries: 70% win rate
```

### Day 8: Weights Auto-Adjusted
```
trend_weight: 0.28 (↑ from 0.25)
rsi_weight: 0.25 (↑ from 0.20)
volume_weight: 0.23 (↑ from 0.20)
entry_quality_weight: 0.18 (↓ from 0.20)
historical_performance_weight: 0.06 (↓ from 0.15)
```

### Result
New signals now prioritize what actually works for YOUR trading!

## 🛠️ Common Tasks

### Task 1: Check if Setups Are Working

```bash
# Visit admin panel
http://localhost:3000/admin/ai-insights

# Look at "All Strategy Performance" table
# Sort by win rate to see what's working
```

### Task 2: Debug a Specific Symbol

Example: Analyze why ETHUSDT trades aren't profitable

```bash
# In admin panel, filter performance by ETHUSDT
# Check:
# - Win rate (should be > 50%)
# - Average R (should be > 1)
# - Total trades (need at least 10 for confidence)

# If ETHUSDT performs poorly:
# - Maybe it's too volatile
# - Maybe your strategy doesn't suit it
# - Skip ETHUSDT or adjust strategy
```

### Task 3: Manually Trigger Weight Update

```bash
curl -X POST http://localhost:3000/api/ai-learning/recalculate-weights
```

Response:
```json
{
  "success": true,
  "version": 5,
  "weights": {
    "trend_weight": 0.28,
    "volume_weight": 0.23,
    ...
  }
}
```

### Task 4: Export Trade Data

All trades are stored in Supabase `ai_trade_history` table:

```sql
SELECT 
  symbol, 
  trend, 
  strategy_type,
  result,
  result_r,
  ai_score,
  created_at
FROM ai_trade_history
ORDER BY created_at DESC
LIMIT 100;
```

## 🎯 Best Practices

### ✅ DO
- Record every trade result immediately when it closes
- Include accurate RSI, volume, EMA alignment data
- Wait for at least 20 trades before analyzing
- Check dashboard weekly to spot patterns
- Adjust strategy if a setup has < 40% win rate

### ❌ DON'T
- Ignore losing trades (record them too!)
- Fabricate fake trade results
- Expect perfect accuracy with < 10 trades
- Change strategies too frequently
- Ignore historical performance patterns

## 🔍 Troubleshooting

### Problem: "Failed to record trade"
**Solution**: Check that all required fields are present:
```typescript
{
  symbol: 'BTCUSDT',           // ✅ Required
  trend: 'UPTREND',            // ✅ Required
  strategy_type: 'Breakout',   // ✅ Required
  result: 'WIN',               // ✅ Required
  result_r: 3,                 // ✅ Required
}
```

### Problem: Admin page shows "No data available"
**Solution**: 
1. Check database has trades: `SELECT COUNT(*) FROM ai_trade_history;`
2. Make sure environment variables are set correctly
3. Check Supabase RLS policies allow reads

### Problem: Weights not updating
**Solution**:
1. Need at least 10 trades recorded
2. Run weight recalculation manually:
   ```bash
   curl -X POST http://localhost:3000/api/ai-learning/recalculate-weights
   ```
3. Check server logs for errors

## 📞 Support

For issues:
1. Check `AI_LEARNING_SYSTEM.md` for detailed docs
2. Review Supabase logs for database errors
3. Check Next.js server logs in `.next/dev/logs/`

---

**Happy Trading! 🚀**
