# Binance Autotrading Implementation Checklist

## ✅ Implementation Status

### Core Components - ALL COMPLETE
- [x] Binance API client with order placement
- [x] Trade execution engine with risk management
- [x] Market signal scanning and scoring
- [x] AI confidence calculation
- [x] Position sizing calculator
- [x] Stop loss and take profit management
- [x] Active trade tracking
- [x] Supabase integration for persistence
- [x] Telegram notification system
- [x] Test vs. Live mode switching
- [x] Cron endpoint for automated triggers
- [x] Signal generation with technical indicators

### Bug Fixes Applied
- [x] Fixed HTTP header: `X-MAPI-KEY` → `X-MBX-APIKEY` (3 locations)
- [x] Added Binance API configuration to `.env.local`
- [x] Added Telegram setup instructions to `.env.local`
- [x] Created comprehensive setup guide

---

## 🧪 Pre-Launch Testing Checklist

### Configuration Setup
- [ ] Created Binance API Key with trading permissions
- [ ] Copied API Key to `.env.local` as `BINANCE_API_KEY`
- [ ] Copied Secret Key to `.env.local` as `BINANCE_SECRET_KEY`
- [ ] Set `TRADING_MODE=test`
- [ ] (Optional) Set up Telegram bot and added to `.env.local`

### Build & Deploy
- [ ] Restarted development server: `npm run dev`
- [ ] No build errors in console
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Environment variables loaded correctly

### API Endpoint Tests
- [ ] **Test Signal Fetch**: 
  ```bash
  curl "http://localhost:3000/api/market-structure-signals?exchange=binance&symbol=BTCUSDT"
  ```
  Expected: Returns JSON with market signals

- [ ] **Test Trade Execution** (Test Mode):
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/execute-trades"
  ```
  Expected: Returns `{ message: "Scan complete", signalsFound: N, executed: 0 }`
  Console should show: `[TradeExecutor] TEST: ...`

- [ ] **Test Telegram Notification**:
  ```bash
  curl "http://localhost:3000/api/alerts" -X POST -d '...'
  ```
  Expected: Telegram message received if configured

### Database Verification
- [ ] Supabase connection working
- [ ] Can fetch market signals from database
- [ ] Can insert test records
- [ ] Trade history can be queried

### Live Mode Readiness (Before Going Live)
- [ ] Tested in TEST mode for minimum 24 hours
- [ ] Verified all Telegram notifications working
- [ ] Confirmed position size calculations are correct
- [ ] Reviewed and accepted risk management parameters
- [ ] Have minimum account balance ($500-$1000 recommended)
- [ ] Set Binance API IP whitelist to server IP
- [ ] Updated `TRADING_MODE=live` (only when ready)

---

## 📊 Expected Behavior

### In TEST Mode
```
[TradeExecutor] TEST: BUY 0.05 BTCUSDT @ 45000
SL: 44000
Entry Order: Simulated
TP1 Order: Simulated
TP2 Order: Simulated
TP3 Order: Simulated
SL Order: Simulated
Telegram: 🧪 TEST: BUY 0.05 BTCUSDT @ 45000 (sent)
Database: Signal marked as "trade_executed": true
```

### In LIVE Mode
```
[TradeExecutor] LIVE: BUY 0.05 BTCUSDT @ 45000
Entry Order: Placed (Binance Order ID: 123456789)
TP1 Order: Placed
TP2 Order: Placed
TP3 Order: Placed
SL Order: Placed
Telegram: 🚀 BTCUSDT EXECUTED (sent)
Database: Signal marked as "trade_executed": true
Binance Account: 5 orders visible
```

---

## 🔍 Troubleshooting Tests

### API Key Validation Test
```typescript
// In browser console or test script:
fetch('/api/market-structure-signals?symbol=BTCUSDT')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```
- If you see API errors, keys are not set correctly
- If you see 500 error, check server logs for details

### Binance Connectivity Test
Check if Binance is accessible:
```bash
curl https://api.binance.com/api/v3/ping
# Should return: {}
```

### Risk Calculation Test
Verify position sizing:
- Account: 1000 USDT
- Risk: 1% = 10 USDT
- Entry: 45000, SL: 44000 (1000 risk per unit)
- Expected Quantity: 0.01 BTC (10 USDT / 1000 risk)

---

## 📋 File Verification

### Critical Files (Verify these exist)
- [x] `src/lib/binanceClient.ts` - Binance API wrapper
- [x] `src/lib/tradeExecutor.ts` - Trade execution logic
- [x] `src/lib/riskManager.ts` - Position sizing
- [x] `src/lib/telegram.ts` - Telegram notifications
- [x] `src/app/api/cron/execute-trades/route.ts` - Execution endpoint
- [x] `src/app/api/market-structure-signals/route.ts` - Signal endpoint
- [x] `src/lib/signals/marketScanner.ts` - Signal scanner
- [x] `.env.local` - Configuration file

### Key Functions (Verify implementations)
- [x] `placeOrder()` - Places orders on Binance
- [x] `executeTrade()` - Main trade execution
- [x] `calculatePositionSize()` - Risk calculation
- [x] `scanMarketSignals()` - Market scanning
- [x] `sendTelegramMessage()` - Notifications

---

## 🚨 Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| API Keys Not Set | "BINANCE_API_KEY not set" error | Update `.env.local` and restart server |
| Wrong Header | 400/401 errors from Binance | Already fixed! Check if deployed |
| Timestamp Sync | "Invalid signature" error | Check server time: `date` |
| Balance Too Low | "Quantity < min" error | Add USDT to Binance spot wallet |
| No Signals | No trades executed | Check `confidence >= 75` requirement |
| Telegram Not Working | No notifications received | Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` |

---

## 📞 Post-Launch Monitoring

### Daily Checks
- [ ] Server is running (check logs)
- [ ] Telegram notifications working
- [ ] No error messages in logs
- [ ] Expected trades are executing
- [ ] Risk limits are being respected

### Weekly Reviews
- [ ] Win/loss ratio
- [ ] Drawdown vs. expected
- [ ] Daily loss limit being reached?
- [ ] Any API errors accumulating?

### Monthly Optimization
- [ ] Review AI signal performance
- [ ] Adjust risk parameters if needed
- [ ] Analyze trade execution quality
- [ ] Check for any missed signals

---

## 🔐 Security Checklist

- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] API keys are never logged to console in LIVE mode
- [ ] Binance API key has IP whitelist set
- [ ] Binance API key has "Withdrawals" disabled
- [ ] Telegram bot token is kept private
- [ ] Server firewall blocks unauthorized access
- [ ] Regular backups of trade history

---

## 📞 Support Resources

- **Binance API Docs**: https://binance-docs.github.io/apidocs/
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Server Logs**: `npm run dev` and watch console output
- **Supabase Dashboard**: Check signal records and trade history

---

## Version Information
- **Implementation Date**: 2026-04-26
- **Status**: ✅ Ready for testing
- **Last Updated**: 2026-04-26
- **Fixes Applied**: 3 (HTTP header corrections)

