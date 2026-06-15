# Binance Autotrading Setup Guide

## Overview
Your webapp now has full Binance autotrading capability. This guide will help you configure and test it.

## ✅ What's Implemented

### Core Features
- **Automated Trade Execution**: Trades are automatically placed based on market structure signals
- **Risk Management**: Position sizing based on account balance and risk percentage
- **Order Management**: Limit orders for entry, take profit (3 levels), and stop loss
- **AI Scoring**: Trades only execute when AI confidence is above threshold (75%)
- **Telegram Notifications**: Real-time alerts for all trade events
- **Test Mode**: Practice trading without real money before going live

### Supported Symbols (Default)
- BTCUSDT
- ETHUSDT
- SOLUSDT
- BNBUSDT
- XRPUSDT

### API Endpoints
- `GET /api/cron/execute-trades` - Triggers automated trade execution
- `GET /api/market-structure-signals` - Fetches current market signals
- `GET /api/signals` - Gets signal details with Binance order templates

---

## 🔧 Setup Instructions

### Step 1: Create Binance API Keys

1. Go to **https://www.binance.com/en/account/api-management**
2. Click **"Create API"**
3. Choose a name: e.g., "Plan Before Trade Bot"
4. Accept restrictions and create
5. Set API Key restrictions:
   - **Restrict to IP address**: Optional (leave empty for testing)
   - Enable: **Spot Trading**
   - Enable: **Margin Trading**
   - Disable: **Withdrawals** (for security)
6. Confirm via email
7. Copy your **API Key** and **Secret Key**

### Step 2: Update Environment Variables

Open `.env.local` in the project root and update:

```env
BINANCE_API_KEY=your_actual_api_key_here
BINANCE_SECRET_KEY=your_actual_secret_key_here
TRADING_MODE=test
CRON_SECRET=your_strong_random_secret_here
```

### Step 3: Set Up Telegram Notifications (Recommended)

1. **Create Telegram Bot:**
   - Start chat with [@BotFather](https://t.me/BotFather)
   - Send `/newbot`
   - Follow prompts to name your bot
   - Copy the provided token (looks like: `123456789:ABCDEFGHIJKLMNOP`)

2. **Get Your Chat ID:**
   - Paste this URL in your browser (replace `{TOKEN}` with your bot token):
   ```
   https://api.telegram.org/bot{TOKEN}/getUpdates
   ```
   - Send a message to your bot
   - Refresh the browser page
   - Find the `chat` object and copy the `id` value

3. **Update .env.local:**
```env
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOP
TELEGRAM_CHAT_ID=987654321
```

### Step 4: Configure Risk Settings

In `.env.local`, adjust these for your strategy:

```env
# What % of balance to risk per trade (0.01 = 1%)
RISK_PER_TRADE_PERCENT=0.01

# Maximum concurrent trades
MAX_ACTIVE_TRADES=2

# Maximum daily losses in Risk units
DAILY_LOSS_LIMIT_R=3
```

---

## 🧪 Testing Phase (IMPORTANT!)

### Run in Test Mode First

Before using live trading:

```env
TRADING_MODE=test
```

In this mode:
- No real trades are placed ✓
- Trades are logged to console ✓
- Telegram notifications show "🧪 TEST:" prefix ✓
- You can verify signals and orders are calculated correctly ✓

### Test the Cron Trigger

Make a test API call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/execute-trades"
```

Expected response (test mode):
```json
{
  "message": "Scan complete",
  "signalsFound": 3,
  "executed": 0,
  "results": [
    {
      "symbol": "BTCUSDT",
      "success": true,
      "message": "TEST mode - logged only"
    }
  ]
}
```

Check your server logs for:
```
[TradeExecutor] TEST: BUY 0.05 BTCUSDT @ 45000
🧪 TEST: BUY 0.05 BTCUSDT @ 45000
```

---

## 🚀 Going Live

### Prerequisites Checklist

- [ ] Tested in TEST mode for at least 24 hours
- [ ] Verified Telegram notifications working
- [ ] Confirmed trade calculations are accurate
- [ ] Have sufficient USDT balance in Binance account (e.g., $1000+)
- [ ] Set Binance API key IP restrictions to your server IP
- [ ] Read through risk management settings and agreed with them

### Switch to Live Mode

1. Update `.env.local`:
```env
TRADING_MODE=live
```

2. Deploy changes to production

3. Monitor first few trades closely via Telegram

4. **Start with MAX_ACTIVE_TRADES=1** and gradually increase

---

## 📋 Execution Flow

Here's what happens when trades execute:

```
1. Cron triggers: GET /api/cron/execute-trades
   ↓
2. Fetch market signals from database
   (confidence ≥ 75%, setup = READY or TRIGGERED)
   ↓
3. For each signal:
   - Validate AI score ≥ 75
   - Validate entry price & stop loss exist
   - Calculate position size (risk management)
   ↓
4. Place Binance orders:
   - Entry limit order
   - Take profit orders (3 levels at 33%, 33%, 34%)
   - Stop loss order
   ↓
5. Send Telegram notification:
   - TEST mode: "🧪 TEST: BUY ..."
   - LIVE mode: "🚀 BTCUSDT EXECUTED..."
   ↓
6. Mark signal as traded in database
```

---

## ⚠️ Error Scenarios & Troubleshooting

### Error: "BINANCE_API_KEY or BINANCE_SECRET_KEY not set"
**Solution**: Verify keys are in `.env.local` and server was restarted

### Error: "401 Unauthorized"
**Likely causes:**
- API key is invalid or expired
- Timestamp sync issue (check server time vs Binance)
- IP not whitelisted on Binance

**Solution:**
- Regenerate API keys on Binance
- Check server time: `date` (should match within 1 second of internet time)
- Add server IP to Binance API whitelist

### Error: "Insufficient balance"
**Solution**: Add USDT to your Binance spot wallet

### Error: "Min notional not met"
**Solution**: Entry price too low or quantity too small for this symbol
- Increase account balance
- Decrease RISK_PER_TRADE_PERCENT

### No Telegram notifications received
**Solution:**
- Verify TELEGRAM_BOT_TOKEN is valid
- Verify TELEGRAM_CHAT_ID is numeric (not text)
- Send test message to bot: `https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text=test`

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` to Git** (already in .gitignore)
2. **Use IP Whitelist** on Binance API keys
3. **Enable 2FA** on your Binance account
4. **Start with small position sizes** (1% risk per trade)
5. **Monitor daily loss limits** to prevent blowout
6. **Keep API Secret Key private** - never share it

---

## 📊 Monitoring

### Check Active Trades
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/trades/active"
```

### View Trade History
Query your Supabase database:
```sql
SELECT * FROM signals 
WHERE trade_executed = true 
ORDER BY created_at DESC 
LIMIT 10;
```

Or via API:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/trades/recent?limit=10"
```

### Review Binance Orders
Log into your Binance account → Spot Trading → Order History

---

## 🐛 Debugging

### Enable Verbose Logging
Add to `.env.local`:
```env
DEBUG=true
```

### Check Server Logs
```bash
npm run dev
# Watch console for [TradeExecutor] and [Binance] messages
```

### Test Signal Generation
```bash
curl "http://localhost:3000/api/market-structure-signals?exchange=binance&symbol=BTCUSDT&timeframe=1h"
```

---

## 📞 Support

### Common Issues
- API connection problems: Check Binance API status at status.binance.com
- Order placement failures: Check Binance account restrictions
- Telegram issues: Verify bot token and chat ID

### Useful Links
- Binance API Docs: https://binance-docs.github.io/apidocs/
- Binance Status: https://status.binance.com/
- Telegram Bot API: https://core.telegram.org/bots/api

---

## 📝 Next Steps

1. ✅ Set up Binance API keys
2. ✅ Update `.env.local` with credentials
3. ✅ Set `TRADING_MODE=test`
4. ✅ Run test trigger with auth header: `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/execute-trades`
5. ✅ Verify Telegram notifications
6. ✅ Monitor for 24-48 hours in test mode
7. ⏳ Switch to LIVE mode when confident
8. 📊 Monitor and optimize position sizing

---

## Version Info
- Implementation Date: 2026-04-26
- API Fixes: X-MBX-APIKEY header corrected
- Status: ✅ Ready for testing
