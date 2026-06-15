# Complete Guide: How to Get & Apply Binance API Keys

## 🎯 Objective
Get your Binance API credentials and configure them in your app for autotrading.

---

## PART 1: Getting Binance API Keys

### Step 1.1: Log Into Binance
1. Go to: https://www.binance.com
2. Log in with your email and password
3. Complete any 2FA verification needed

### Step 1.2: Navigate to API Management
1. Click your **Profile Icon** (top right)
2. Select **"Account"** or **"My Profile"**
3. Look for **"API Management"** in the sidebar
4. OR go directly to: https://www.binance.com/en/account/api-management

### Step 1.3: Create New API Key
1. On the API Management page, look for **"Create API"** button
2. Click it
3. Enter API label: **"Plan Before Trade Bot"** (or any name)
4. Click **"Create"**

### Step 1.4: Verify via Email (if required)
1. Check your email for verification link
2. Click the link in your email
3. This may take a few minutes

### Step 1.5: View Your API Key
1. Go back to API Management page
2. You should now see your new API key:
   - **API Key**: Long string (looks like: `EjVm...ABC123`)
   - **Secret Key**: Another long string (looks like: `cHV0...XYZ789`)

⚠️ **IMPORTANT**: 
- Copy BOTH the API Key and Secret Key
- Save them temporarily (we'll add them to your app)
- NEVER share these keys with anyone
- NEVER commit them to GitHub

---

## PART 2: Configure API Key Permissions

### Step 2.1: Set Permissions
1. On the API Key page, find **"Edit restrictions"** button
2. Under **"API Key Restrictions"**, select:
   - ✓ Enable Reading
   - ✓ Enable Spot & Margin Trading
   - ✗ Disable Withdrawals (for safety)
3. Click **"Save"**

### Step 2.2: (Optional) Set IP Whitelist
1. In **"IP Whitelist"**, you can restrict to your server IP
2. Find your server IP (e.g., `192.168.1.1`)
3. Add it to the whitelist
4. For development, you can leave empty (less secure but easier)

### Step 2.3: Confirm Changes
1. Check email for confirmation (if required)
2. Verify the permissions are set correctly

**Result**: Your API key is now ready with proper permissions.

---

## PART 3: Add API Keys to Your App

### Step 3.1: Locate the Configuration File
1. Open your project folder in VS Code
2. Look for **.env.local** file in the root directory
3. If it doesn't exist, create it (contact support)

### Step 3.2: Open .env.local
```
Project Root/
├── .env.local          ← OPEN THIS FILE
├── .env.example
├── package.json
├── src/
└── ...
```

### Step 3.3: Find the Binance Configuration Section
Look for this section in `.env.local`:
```
# ===========================================
# BINANCE AUTOTRADING CONFIGURATION
# ===========================================
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
TRADING_MODE=test
CRON_SECRET=your_strong_random_secret_here
```

### Step 3.4: Replace the Placeholder Values
**BEFORE** (placeholder):
```env
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
```

**AFTER** (your actual keys):
```env
BINANCE_API_KEY=EjVmABC123DEF456GHI789JKL012MNO345PQR
BINANCE_SECRET_KEY=cHV0XYZ789ABC123DEF456GHI789JKL012MNO
```

### Step 3.5: Verify Other Settings
Ensure these are also set:
```env
TRADING_MODE=test          # IMPORTANT: Start with test!
CRON_SECRET=your_strong_random_secret_here
RISK_PER_TRADE_PERCENT=0.01  # 1% = conservative
MAX_ACTIVE_TRADES=2          # Start with 2
DAILY_LOSS_LIMIT_R=3         # Stop after 3 losing trades
```

### Step 3.6: SAVE the file
- Press **Ctrl+S** (Windows/Linux) or **Cmd+S** (Mac)
- You should see the file is saved (no dot indicator)

---

## PART 4: Restart Your Application

### Step 4.1: Stop the Current Server
If your development server is running:
1. In Terminal, press **Ctrl+C** to stop it
2. Wait for it to fully stop

### Step 4.2: Restart the Server
1. In Terminal, run:
   ```bash
   npm run dev
   ```
2. Wait for it to say: **"ready - started server on 0.0.0.0:3000"**

### Step 4.3: Verify Server Started
You should see:
```
> next dev
  ▲ Next.js 16.2.1
  - Local:        http://localhost:3000
  - Environments: .env.local

Ready in 2.5s
```

✅ Server is now running with your API keys loaded!

---

## PART 5: Test the Configuration

### Test 5.1: Test Signal Fetch
Open a new terminal and run:
```bash
curl "http://localhost:3000/api/market-structure-signals?symbol=BTCUSDT&timeframe=1h"
```

**Expected Response**:
```json
{
  "signals": [...],
  "topOpportunities": [...],
  "selectedSignal": {...}
}
```

**If you get an error**:
- Check API keys are correct (copy-paste again)
- Check server restarted (npm run dev)
- Check `.env.local` is saved

### Test 5.2: Test Trade Execution (TEST MODE)
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/execute-trades"
```

**Expected in Console** (not actual output):
```
[Cron] Execute-trades started
[TradeExecutor] TEST: BUY 0.05 BTCUSDT @ 45000
SL: 44000
```

### Test 5.3: Verify in Database
1. Go to your Supabase dashboard
2. Open **"SQL Editor"**
3. Run:
   ```sql
   SELECT * FROM signals 
   WHERE trade_executed = true 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
4. You should see test trades listed

✅ If all tests pass, your API keys are working!

---

## PART 6: Next Steps

### Setup Telegram Notifications (Recommended)
Follow the section **"TELEGRAM NOTIFICATIONS"** in `.env.local`

### Start Testing
1. Keep `TRADING_MODE=test` for now
2. Run test trades for 24-48 hours
3. Monitor the console and database
4. Once confident, change to `TRADING_MODE=live`

### Go Live (Optional)
**ONLY AFTER** testing for 24+ hours:
1. Change in `.env.local`:
   ```env
   TRADING_MODE=live
   ```
2. Restart server: `npm run dev`
3. Monitor trades closely
4. Start with `MAX_ACTIVE_TRADES=1`

---

## ⚠️ IMPORTANT SECURITY REMINDERS

### DO ✅
- [ ] Copy API keys carefully (exact match)
- [ ] Save `.env.local` after changes
- [ ] Restart server after updating `.env.local`
- [ ] Start with TEST mode first
- [ ] Use IP whitelist on Binance (for production)
- [ ] Enable 2FA on Binance account
- [ ] Keep SECRET KEY private

### DON'T ❌
- [ ] Share API keys with anyone
- [ ] Commit `.env.local` to GitHub
- [ ] Use the same API key for multiple apps
- [ ] Skip testing (go straight to LIVE)
- [ ] Use large position sizes initially
- [ ] Leave withdrawals enabled on API key
- [ ] Post keys in chat/forums/support

---

## 🐛 Troubleshooting

### Issue: "BINANCE_API_KEY or BINANCE_SECRET_KEY not set"

**Causes:**
- `.env.local` file doesn't exist
- Keys not entered correctly
- Server not restarted after editing

**Solutions:**
1. Verify `.env.local` exists in root folder
2. Check keys are entered EXACTLY from Binance (no spaces)
3. Save file with Ctrl+S
4. Stop server (Ctrl+C) and restart (`npm run dev`)
5. Try test again

### Issue: "401 Unauthorized" from Binance

**Causes:**
- API key is invalid or expired
- API key has wrong permissions
- Secret key doesn't match API key

**Solutions:**
1. Go back to Binance API Management
2. Verify the API key and Secret Key
3. Regenerate them if needed
4. Copy the NEW keys to `.env.local`
5. Restart server

### Issue: "Insufficient balance" or "Min notional not met"

**Causes:**
- Not enough USDT in Binance account
- Account balance too low for smallest position

**Solutions:**
1. Add USDT to your Binance spot wallet
2. Minimum recommended: $500-$1000
3. Or decrease `RISK_PER_TRADE_PERCENT` in `.env.local`

---

## 📋 Verification Checklist

Before moving to testing:

- [ ] Binance account created and verified
- [ ] API key created with "Spot Trading" permission
- [ ] Secret key saved securely
- [ ] `.env.local` file updated with keys
- [ ] Server restarted after updating `.env.local`
- [ ] No errors in server console
- [ ] Test API call returns valid response
- [ ] Database shows test records

---

## 🎯 You're Ready!

Once all steps are complete:
1. Your app is connected to Binance
2. Ready to run in TEST mode
3. Can be switched to LIVE mode once confident

**Next**: See **BINANCE_AUTOTRADING_SETUP.md** for next steps and testing procedures.

---

## 📞 Need Help?

### Check These Files:
- `BINANCE_AUTOTRADING_SETUP.md` - Complete setup guide
- `AUTOTRADING_TESTING_CHECKLIST.md` - Testing procedures
- `.env.local` - Configuration reference

### External Resources:
- Binance API Docs: https://binance-docs.github.io/apidocs/
- Binance Support: https://www.binance.com/en/support

---

## Version Info
- **Guide Version**: 1.0
- **Last Updated**: April 26, 2026
- **Status**: ✅ Ready to Use
