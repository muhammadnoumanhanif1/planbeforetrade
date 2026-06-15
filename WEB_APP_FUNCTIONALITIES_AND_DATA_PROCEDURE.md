# Web App Functionalities & Best-Data Procedure

This guide lists the main Plan Before Trade web app features and the recommended procedure to get the best trading data quality from the platform.

## 1) Core Functionalities

### Public Pages
- `/` — Landing page and feature overview
- `/pricing`, `/pricing/international`, `/pricing/pakistan` — Plans and upgrades
- `/blog`, `/blog/[slug]` — Educational content
- `/about`, `/faq`, `/contact-us`, `/privacy`, `/terms`

### Auth & Account
- `/signup`, `/login`, `/forgot-password`, `/auth/reset-password`
- `/profile` — Profile and subscription details
- `/settings` — Account actions (including account management)

### Main Trading & Analysis
- `/dashboard` — Analysis dashboard (exchange/symbol/timeframe analysis)
- `/signals` — Telegram/live signal feed
- `/signals/[id]` — Signal detail
- `/signals/history` — Signal history/performance view
- `/market-structure-signals` — Smart signals dashboard
- `/market-opportunities` — Market opportunity discovery

### Risk/Execution Tools
- `/average-calculator` — Average entry and position recalculation
- `/liquidation-calculator` — Liquidation estimation across exchanges
- `/backtest` and `/backtesting` — Backtesting flows

### Premium Features
- `/watchlists` — Watchlist management
- `/alerts` — Price alert creation and management
- `/saved` — Saved analysis/data workflow

### Admin Features
- `/admin` and subpages for payments, blog, AI insights, telegram, backtesting, and contact queries

## 2) Procedure to Get the Best Data from the Web App

1. **Sign in** and keep your profile/subscription active (`/login`, `/profile`).
2. **Start on `/dashboard`** and select:
   - Exchange (Binance/Bitget/MEXC)
   - Symbol
   - Timeframe
3. **Run analysis** and prioritize setups with:
   - Higher confidence
   - Clear support/resistance
   - Valid stop-loss and take-profit structure
4. **Validate with Smart Signals** on `/market-structure-signals` and cross-check with `/signals`.
5. **Check signal context**:
   - Open `/signals/[id]` for details
   - Review `/signals/history` for recent result behavior
6. **Apply risk planning tools**:
   - Use `/average-calculator` before adding to positions
   - Use `/liquidation-calculator` before leverage decisions
7. **Track and monitor**:
   - Add coins to `/watchlists`
   - Create trigger conditions in `/alerts`
8. **Record and improve**:
   - Use `/saved` and backtesting pages to compare idea quality over time
9. **Use premium for full coverage** (unlimited analyses, watchlists, alerts, saved workflows).

## 3) Best-Practice Checklist for Data Quality

- Prefer active, liquid pairs on your selected exchange.
- Match timeframe to your trading horizon (scalp vs swing).
- Avoid acting on one signal only; confirm with at least one additional module.
- Re-check values after refresh because market prices update quickly.
- Use stop-loss/TP levels from analysis instead of discretionary guesses.

## 4) Where These Instructions Are Stored

- Primary instruction file: `WEB_APP_FUNCTIONALITIES_AND_DATA_PROCEDURE.md`
- Linked from main docs: `README.md`
