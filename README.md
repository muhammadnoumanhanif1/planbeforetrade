# Plan Before Trade

Crypto analysis SaaS with free and premium tiers. Now with mobile-first trading signals dashboard!

## ✨ What's New (v2.0.0)

### Mobile-First Signals Dashboard
- **Live Trading Signals** - Real-time BUY/SELL opportunities
- **Signal Cards** - Beautiful, color-coded signal display
- **Signal Details** - Full analysis with price levels, indicators, support/resistance
- **Trade History** - Track performance with win rate and R calculations
- **PWA Support** - Install as app, works offline, push notifications

---

## Features

### Core Trading
- 📊 **Live Signals Dashboard** - Real-time trading opportunities
- 🎯 **Signal Details** - Entry zones, stop loss, take profits
- 📈 **Technical Analysis** - RSI, EMA, Volume, Support/Resistance
- 🔔 **Entry Confirmation** - 3-layer signal validation system

### Mobile Experience
- 📱 **Mobile-First Design** - Optimized for smartphones
- 🎨 **Premium Dark Theme** - Modern glassmorphism with emerald accents
- 🧭 **Bottom Navigation** - Easy access to Signals, Market, History, Profile
- ⚡ **Fast Loading** - Optimized for mobile networks

### Advanced Features
- 🧠 **AI-Powered Signals** - Confidence scoring and recommendations
- 📊 **Performance Tracking** - Win rate, total R, trade history
- 🔄 **Auto-Refresh** - Automatic updates every 30 seconds
- 📡 **Multiple Exchanges** - Binance, Bitget, MEXC support

### Monetization
- 💰 **Free Tier** - 3 analyses/day
- 💳 **Stripe Payments** - Monthly/yearly plans
- 🇵🇰 **Pakistan Payments** - Easypaisa and JazzCash support

### Premium Features
- ⭐ **Watchlists** - Track favorite coins
- 💾 **Saved Analyses** - Store your research
- 🔔 **Price Alerts** - Get notified when price hits targets

---

## 📘 Functionalities & Best-Data Usage Guide

- See `WEB_APP_FUNCTIONALITIES_AND_DATA_PROCEDURE.md` for:
  - Complete functionality list by route
  - Step-by-step procedure to get best data from the app
  - Data-quality best practices

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Copy env template and fill values

```bash
cp .env.example .env.local
```

### 3. Start dev server

```bash
npm run dev
```

### 4. Open [http://localhost:3000](http://localhost:3000)

---

## 📱 Mobile App

### Installation

#### iOS (Safari)
1. Visit `/signals` on your iPhone
2. Tap the **Share** button
3. Select **"Add to Home Screen"**
4. Tap **Add**

#### Android (Chrome)
1. Visit `/signals` on your Android device
2. Tap **Install** (or menu → Install App)
3. Works offline with cached data!

### Features
- 📴 **Offline Support** - View cached signals without internet
- 🔔 **Push Notifications** - Real-time alerts
- ⚡ **Fast Launch** - Direct from home screen
- 🖥️ **Full Screen** - Immersive experience

---

## 📁 Project Structure

```
src/
├── app/
│   ├── signals/
│   │   ├── page.tsx              # Main signals dashboard
│   │   ├── [id]/
│   │   │   └── page.tsx        # Signal detail page
│   │   └── history/
│   │       └── page.tsx        # Trade history
│   ├── market-structure-signals/
│   │   └── page.tsx            # Market analysis
│   └── ...
├── components/
│   ├── SignalCard.tsx          # Signal card component
│   ├── BottomNav.tsx           # Mobile navigation
│   └── MarketTicker.tsx        # Coin ticker
├── hooks/
│   └── usePWA.ts              # PWA integration
└── lib/
    ├── fundamental-analysis.ts  # Fundamental data
    └── signals/                # Signal processing

public/
├── manifest.json               # PWA manifest
└── service-worker.js         # Offline caching
```

---

## 🎨 Design System

### Color Palette
```css
/* Primary */
--emerald-400: #34d399    /* Main accent */
--emerald-500: #10b981    /* Primary button */

/* Backgrounds */
--slate-900: #0f172a      /* Header */
--slate-950: #020617      /* Main background */

/* Status */
--green: #22c55e          /* BUY / WIN */
--red: #ef4444            /* SELL / LOSS */
--blue: #3b82f6          /* Active */
--purple: #a855f7        /* Open trades */
```

### Signal Statuses
| Status | Icon | Description |
|--------|------|-------------|
| WAITING | ⚪ | Signal identified |
| READY | 🟢 | Price in entry zone |
| TRIGGERED | 🔵 | Trade active |
| INVALID | ❌ | Don't trade |
| CLOSED | 🔒 | Trade completed |

### Confidence Levels
| Level | Score | Color |
|-------|-------|-------|
| HIGH | 70-100% | 🟢 Green |
| MEDIUM | 40-69% | 🟡 Yellow |
| LOW | 1-39% | 🔴 Red |

---

## 🔧 API Endpoints

### Market Structure Signals
```
GET /api/market-structure-signals
  ?symbols=BTCUSDT,ETHUSDT
  &exchange=binance
  &timeframe=1h
```

### Fundamental Analysis
```
GET /api/fundamental-analysis
  ?symbol=BTCUSDT
```

---

## 🇵🇰 Pakistan Payment System

### User Flow
1. User selects **"Upgrade to Premium"** on `/pricing/pakistan`
2. Chooses **Easypaisa** or **JazzCash**
3. Receives account details and payment instructions
4. Sends payment and provides transaction ID via form
5. Receives success confirmation
6. **Admin verifies payment** in verification endpoint
7. User **tier upgrades to Premium** (7-day subscription)

### Admin Operations
```bash
# View pending payments
curl -X GET "https://planbeforetrade.com/api/billing/pakistan/verify?status=pending" \
  -H "x-admin-secret: $ADMIN_SECRET"

# Approve a payment
curl -X POST "https://planbeforetrade.com/api/billing/pakistan/verify" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"uuid","action":"approve"}'
```

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/billing/pakistan/submit` | POST | User submits payment |
| `/api/billing/pakistan/verify` | GET | Admin lists pending |
| `/api/billing/pakistan/verify` | POST | Admin approves/rejects |
| `/api/billing/pakistan/status` | GET | User checks status |

---

## 📝 Changelog

### Version 2.0.0 (Current)
- ✅ Mobile-first signals dashboard
- ✅ Premium dark theme with glassmorphism
- ✅ PWA support (installable app)
- ✅ Signal detail pages
- ✅ Trade history tracking
- ✅ Auto-refresh functionality
- ✅ Fundamental analysis integration
- ✅ Entry confirmation system (3-layer)
- ✅ Bottom navigation
- ✅ Market ticker component

### Version 1.0.0
- Basic signal generation
- Simple dashboard
- Pakistan payment system

---

## 🔐 Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `ADMIN_SECRET`

See `.env.example` for full list.

---

## 🚀 Deploy on Vercel

1. Import the repository into Vercel
2. Add all environment variables from `.env.example`
3. Configure custom domain in Vercel project settings
4. Set Stripe webhook endpoint to `/api/billing/webhook`
5. Verify Supabase production keys are configured

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/anomalyco/planbeforetrade/issues)
- **Email**: support@planbeforetrade.com

---

**Made with ❤️ for crypto traders**

© 2024 Plan Before Trade. All rights reserved.
