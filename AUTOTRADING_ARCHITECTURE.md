# Binance Autotrading Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PLAN BEFORE TRADE AUTOTRADING                   │
│                         Complete Flow Map                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  MARKET DATA                                                         │
│  ├─ Binance API (candles, prices, order book)                      │
│  ├─ Bitget API (alternative exchange)                               │
│  └─ MEXC API (alternative exchange)                                 │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  SIGNAL GENERATION LAYER                                             │
│  ├─ Market Scanner (`scanMarketSignals`)                            │
│  ├─ Technical Indicators (RSI, SMA, Momentum)                       │
│  ├─ Market Structure Detection (Breakouts, Zones)                   │
│  └─ Confidence Scoring                                              │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  AI LEARNING LAYER                                                   │
│  ├─ Adaptive AI Score Calculation                                   │
│  ├─ Historical Trade Analysis                                       │
│  ├─ Weight Optimization                                             │
│  └─ Signal Filtering (Confidence >= 75%)                            │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER (Supabase)                                           │
│  ├─ Signals Table                                                   │
│  ├─ Market Structure Signals View                                   │
│  ├─ AI Trade History                                                │
│  ├─ AI Weights                                                      │
│  └─ Alerts Table                                                    │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  EXECUTION LAYER                                                     │
│  ├─ Risk Manager (Position Sizing, Risk Calculation)                │
│  ├─ Trade Executor (Order Placement, Trade Validation)              │
│  └─ Active Trade Tracking                                           │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌───────────────┐    ┌──────────────────┐
│  TEST MODE    │    │   LIVE MODE      │
│               │    │                  │
│ Logs to       │    │ Places REAL      │
│ Console ✓     │    │ orders on        │
│               │    │ Binance ✓        │
│ Simulates     │    │                  │
│ orders ✓      │    │ Executes         │
│               │    │ real trades ✓    │
└───────┬───────┘    └────────┬─────────┘
        │                     │
        └──────────┬──────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BINANCE TRADING                                                     │
│  ├─ Place Entry Limit Order                                         │
│  ├─ Place Take Profit Orders (3 levels)                             │
│  ├─ Place Stop Loss Order                                           │
│  └─ Monitor Order Status                                            │
└──────────────────┬───────────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │Telegram│ │Database│ │Console │
   │Alert ✓ │ │Update  │ │Logging │
   └────────┘ └────────┘ └────────┘
```

## Component Details

### 1. Market Data Collection
**Location**: `src/app/api/candles/route.ts` & `src/app/api/coins/route.ts`

Fetches OHLCV data from multiple exchanges:
- Binance: Primary source with fallback URLs
- Bitget: Alternative source
- MEXC: Alternative source

### 2. Signal Generation
**Location**: `src/lib/signals/` directory

Components:
- `marketScanner.ts` - Scans symbols for opportunities
- `signalGenerator.ts` - Generates technical signals
- `types.ts` - Signal type definitions
- `riskManager.ts` - Risk calculations

Process:
```
Raw Candles → Technical Analysis → Signal Generation → Filtering → Storage
```

### 3. AI Learning System
**Location**: `src/lib/ai-learning/engine.ts`

Features:
- Calculates adaptive AI score based on:
  - Signal confidence
  - Historical win rate
  - Asset type
  - Market trend
  - Technical indicators (RSI, Volume, Volatility)
- Learns from past trades
- Optimizes weights over time

### 4. Trade Execution Engine
**Location**: `src/lib/tradeExecutor.ts`

Validates before execution:
```
Signal → AI Score Check (75%) → Risk Check → Balance Check → Duplicate Check → Execute
```

Execution sequence:
1. Calculate position size (risk management)
2. Place entry order (limit order)
3. Place TP orders (33%, 33%, 34% split)
4. Place SL order (stop loss)
5. Track active trade
6. Send notifications

### 5. Risk Management
**Location**: `src/lib/riskManager.ts`

Controls:
- Position sizing (1% risk per trade = $10 per $1000 balance)
- Max concurrent trades (default: 2)
- Daily loss limits (default: 3R)
- Active trade tracking

Calculation:
```
Risk Amount = Account Balance × Risk % (e.g., 1000 × 0.01 = $10)
Position Size = Risk Amount / (Entry Price - Stop Loss)
```

### 6. Binance Integration
**Location**: `src/lib/binanceClient.ts`

Functions:
- `placeOrder()` - Place orders
- `cancelOrder()` - Cancel orders
- `getOpenOrders()` - Fetch open orders
- `getAccountBalance()` - Get USDT balance
- `getSymbolPrice()` - Get current price
- `getExchangeInfo()` - Get trading rules

Authentication:
- HMAC-SHA256 signature
- Timestamp verification
- API key in X-MBX-APIKEY header (recently fixed)

### 7. Cron Execution
**Location**: `src/app/api/cron/execute-trades/route.ts`

Trigger endpoint that:
- Queries signals with confidence >= 75%
- Filters for READY or TRIGGERED status
- Executes eligible trades
- Returns results

Can be triggered by:
- External cron service (e.g., Vercel Cron, EasyCron)
- Manual API call: `GET /api/cron/execute-trades` with `Authorization: Bearer <CRON_SECRET>`

### 8. Notification System
**Location**: `src/lib/telegram.ts`

Sends alerts for:
- Trade execution (TEST: prefix for test mode)
- Trade failures
- Manual alerts
- Account updates

Uses Telegram Bot API directly (no external library dependency)

### 9. Database Schema
**Location**: Supabase

Key tables:
- `signals` - All generated signals
- `market_structure_signals` - View for executable signals
- `ai_trade_history` - Historical trades for learning
- `ai_weights` - Learned AI model weights
- `alerts` - User price alerts

## Data Flow Example

### Scenario: BTCUSDT Trade Execution

```
1. Cron Job Trigger (every hour)
   ↓
2. Query Market Candles for BTCUSDT (100 candles, 1h)
   ↓
3. Generate Market Structure Signal
   - Detect support/resistance
   - Calculate RSI, SMA, Momentum
   - Generate signal (LONG/SHORT)
   - Calculate confidence: 85%
   ↓
4. Calculate AI Score
   - Base score: 85%
   - Historical win rate: +5%
   - Adjusted score: 90%
   ↓
5. Check Filters
   - AI Score 90% >= 75% ✓
   - Setup: READY ✓
   - Not already traded ✓
   ↓
6. Calculate Position Size
   - Balance: 1000 USDT
   - Risk: 1% = 10 USDT
   - Entry: 45000, SL: 44000 (1000 risk per unit)
   - Quantity: 0.01 BTC
   ↓
7. Execute Trade
   - LIVE Mode: Place orders on Binance
     - Entry: 0.01 BUY @ 45000
     - TP1: 0.0033 SELL @ 46000
     - TP2: 0.0033 SELL @ 47000
     - TP3: 0.0034 SELL @ 48000
     - SL: 0.01 SELL @ 44000
   
   - TEST Mode: Log only
     - Console: "🧪 TEST: BUY 0.01 BTCUSDT @ 45000"
   ↓
8. Notifications & Logging
   - Telegram: "🚀 BTCUSDT EXECUTED"
   - Database: Mark signal as traded
   - Console: Order confirmation
```

## Security Architecture

```
┌─────────────────────────────────┐
│ API Authentication              │
│ - Session cookies (Supabase)    │
│ - Service role for admin ops    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│ Binance Security                │
│ - HMAC-SHA256 signature         │
│ - Timestamp validation          │
│ - IP whitelist (recommended)    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│ Environment Variables           │
│ - API keys in .env.local        │
│ - Never logged in production    │
│ - Cleared on logout             │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│ Database Security               │
│ - Supabase RLS policies         │
│ - Service role for auto trades  │
│ - User role for data access     │
└─────────────────────────────────┘
```

## Performance Optimization

### Caching Strategy
- Market data cached for 30 seconds
- Exchange info cached for 1 hour
- Signal scoring results cached temporarily

### Database Optimization
- Views for pre-filtered signals
- Indexes on symbol, timestamp, confidence
- Batch operations where possible

### API Rate Limiting
- Binance: 1200 weight per minute
- Our usage: ~50 weight per trade
- Telegram: 30 requests per second

## Error Handling

```
Try Execution
    ↓
Catch Error
    ↓
├─ API Error → Log + Notify → Continue
├─ Insufficient Balance → Stop + Alert User
├─ Invalid Symbol → Skip + Log
└─ Network Timeout → Retry with backoff
```

## Scaling Considerations

### Current Configuration
- Maximum 2 concurrent trades
- 5 monitored symbols
- 1-hour timeframe
- 1% risk per trade

### Scaling Options
1. Increase symbols scanned (10→20→50)
2. Add multiple timeframes (1h → 1h + 4h)
3. Increase concurrent trades (2→5)
4. Deploy on multiple servers
5. Use queue system (Bull, RabbitMQ)

## Monitoring & Observability

```
Console Logs
├─ [TradeExecutor] - Trade execution events
├─ [Binance] - API responses
├─ [Telegram] - Notification status
└─ [DB] - Database operations

Telegram Alerts
├─ Trade execution
├─ Errors and failures
└─ Daily summary

Supabase Logging
├─ All signals
├─ Trade history
├─ Error logs
└─ Performance metrics
```

## Summary

The Binance autotrading system is a complete, production-ready solution that:
- ✅ Generates signals from market data
- ✅ Scores them with AI
- ✅ Validates with risk management
- ✅ Executes trades automatically
- ✅ Notifies users in real-time
- ✅ Tracks performance
- ✅ Scales horizontally

All components are properly integrated and working together seamlessly.
