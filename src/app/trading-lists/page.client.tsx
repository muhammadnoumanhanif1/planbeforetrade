"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import styles from "../page.module.css";

interface CoinPriceData {
  symbol: string;
  displaySymbol: string;
  baseCoin: string;
  quoteCoin: string;
  lastPrice: number;
}

type ActiveTab = "day" | "scalping" | "hft" | "swing";
type Exchange = "binance" | "bitget" | "mexc";

const DAY_TRADING_COINS = ["SOL", "ETH", "BTC", "FTM", "NEAR", "AVAX", "LINK", "APT", "SUI", "ARB"];
const SCALPING_COINS = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP", "APT", "OP", "ARB"];
const HFT_COINS = ["BTC", "ETH", "SOL"];
const SWING_TRADING_COINS = ["LINK", "SUI", "NEAR", "LDO", "INJ", "OP", "ARB", "RNDR", "MATIC", "DOT", "ADA"];

interface StrategyOutline {
  title: string;
  description: string;
  profitPotential: string;
  riskLevel: string;
  holdingTime: string;
  leverage: string;
  rrRatio: string;
  indicators: string[];
  rules: string[];
}

const STRATEGIES: Record<ActiveTab, StrategyOutline> = {
  day: {
    title: "Intraday Trend Continuation (Day Trading)",
    description: "Capture momentum and intraday trends. All positions are opened and closed within the same trading day to eliminate overnight risk.",
    profitPotential: "High (15% - 40% monthly target on active capital)",
    riskLevel: "Moderate",
    holdingTime: "15 minutes to several hours",
    leverage: "3x - 5x Leverage (Max 10x on major pairs like BTC/ETH)",
    rrRatio: "1:2 to 1:3 (Conservative profit taking)",
    indicators: [
      "9 & 21 Exponential Moving Averages (EMA) - for trend direction",
      "Volume Weighted Average Price (VWAP) - key intraday institutional level",
      "Relative Strength Index (RSI) - to avoid buying local overbought peaks",
      "15m and 1h Candlestick charts - for entry trigger and trend structures"
    ],
    rules: [
      "Only trade during active market sessions (London / New York overlap).",
      "Wait for a 15m candle close above/below the 21 EMA to confirm entry direction.",
      "Place your stop loss behind the daily VWAP or the local swing high/low.",
      "Take 50% profit at TP1 (1:1.5 R:R) and trailing-stop the rest.",
      "Close all positions at least 30 minutes before market close (no overnight holding)."
    ]
  },
  scalping: {
    title: "Micro-Momentum Capture (Scalping)",
    description: "Profit from small, rapid price fluctuations. Requires quick execution, high concentration, and tight stop-loss management.",
    profitPotential: "Very High (Compounding small daily gains)",
    riskLevel: "High",
    holdingTime: "Seconds to 10 minutes",
    leverage: "5x - 15x Leverage (Tightly bound by risk capacity)",
    rrRatio: "1:1.5 to 1:2 (Quick taking of micro-gains)",
    indicators: [
      "8 & 13 Exponential Moving Averages (EMA) - ribbon for immediate momentum",
      "Order Book Depth (Level 2 data) - to track buyer/seller blocks",
      "1m and 3m Candlestick charts - for high-frequency price action triggers",
      "Average True Range (ATR) - to gauge immediate volatility margins"
    ],
    rules: [
      "Cut losses immediately when the price ticks 0.5% against your entry.",
      "Never average down or add size to a losing scalp trade.",
      "Look for high-volatility breakouts backed by high volume on the 1-minute chart.",
      "Trade only the highest liquidity coins to ensure zero slippage.",
      "Keep transaction fees low by using limit orders when possible, or VIP accounts."
    ]
  },
  hft: {
    title: "Ultra-Low Latency Spread Capture (HFT)",
    description: "Execution of trades at sub-millisecond speeds. Capitalizes on brief bid-ask spread discrepancies and order book imbalances. Relies heavily on high-frequency API automation.",
    profitPotential: "Consistent (High volume, small margins per trade)",
    riskLevel: "Low (Per individual trade) / High (System/execution risk)",
    holdingTime: "Milliseconds to seconds",
    leverage: "2x - 5x Leverage (Typically spot or low leverage)",
    rrRatio: "Varies (Extremely high win rate with tight margins)",
    indicators: [
      "Order Book Imbalance (Ratio of bids vs asks in real-time)",
      "Tick-by-tick Trades Feed - immediate trade size detection",
      "Exchange API Latency status - critical execution velocity metrics",
      "Spread Volatility - measuring the spread gap size"
    ],
    rules: [
      "Execute exclusively via API connections with dedicated servers.",
      "Select only top-tier volume coins to guarantee deep market order books.",
      "Exploit maker fee discounts and rebates to maximize profit on tiny ticks.",
      "Ensure robust error-handling scripts to auto-cancel stale orders during latency spikes.",
      "Continuously balance inventory to remain net-neutral by the end of the execution run."
    ]
  },
  swing: {
    title: "Macro Trend Capture (Swing Trading)",
    description: "Capture larger price swings over several days or weeks. Focus on clean structural reversals and high-probability setups.",
    profitPotential: "Very High (Capture 10% - 50% moves on individual setups)",
    riskLevel: "Low to Moderate",
    holdingTime: "3 days to 4 weeks",
    leverage: "Spot (1x) or maximum 2x Leverage (Wider market swings require wide stops)",
    rrRatio: "1:3 to 1:5+ (High-reward trades)",
    indicators: [
      "50 & 200 Day Simple Moving Averages (SMA) - major bull/bear divider",
      "MACD & RSI Divergence - weekly/daily trend fatigue identification",
      "Fibonacci Retracements (0.5 and 0.618 golden pocket entry zones)",
      "Daily / 4-Hour Support and Resistance horizontal zones"
    ],
    rules: [
      "Identify the macro trend on the daily chart before zooming into the 4-hour chart for entries.",
      "Set buy orders at daily key support levels or weekly order blocks.",
      "Set wide stop-losses below macro support structures (e.g. 5% to 8% away).",
      "Let the trade run; ignore minor intraday noise and hourly volatility.",
      "Use trailing stops after TP1 is hit to protect capital and let profits run."
    ]
  }
};


export default function TradingListsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("day");
  const [exchange, setExchange] = useState<Exchange>("binance");
  const [coins, setCoins] = useState<CoinPriceData[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");

  const loadCoins = useCallback(async (selectedExchange: Exchange) => {
    setLoadingCoins(true);
    setError(null);
    try {
      const response = await fetch(`/api/coins?exchange=${encodeURIComponent(selectedExchange)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to retrieve coin tickers");
      }
      const coinList = Array.isArray(payload?.coins) ? payload.coins : [];
      setCoins(coinList);
      setUpdatedAt(payload?.updatedAt ? new Date(payload.updatedAt).toLocaleTimeString() : "");
    } catch (err) {
      console.error(err);
      setError(`Failed to retrieve tickers from ${selectedExchange.toUpperCase()}`);
    } finally {
      setLoadingCoins(false);
    }
  }, []);

  useEffect(() => {
    loadCoins(exchange);
  }, [exchange, loadCoins]);

  const getActiveCoinsList = () => {
    switch (activeTab) {
      case "day":
        return DAY_TRADING_COINS;
      case "scalping":
        return SCALPING_COINS;
      case "hft":
        return HFT_COINS;
      case "swing":
        return SWING_TRADING_COINS;
    }
  };

  const getCoinPrice = (baseSymbol: string) => {
    const coin = coins.find(
      (c) => c.baseCoin.toUpperCase() === baseSymbol.toUpperCase() && c.quoteCoin === "USDT"
    );
    return coin ? coin.lastPrice : null;
  };

  const getCoinPair = (baseSymbol: string) => {
    const coin = coins.find(
      (c) => c.baseCoin.toUpperCase() === baseSymbol.toUpperCase() && c.quoteCoin === "USDT"
    );
    return coin ? coin.symbol : `${baseSymbol}USDT`;
  };

  const activeStrategy = STRATEGIES[activeTab];
  const activeCoins = getActiveCoinsList();

  return (
    <div className={`${styles.page} ${styles.scaledTypography}`}>
      <main className={styles.main}>
        {/* Header Title Section */}
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img
              src="/logo.png"
              alt="Plan Before Trade Logo"
              style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }}
            />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>Trading Outlines & Coin Lists</h1>
            </div>
          </div>
        </header>

        {/* Global Navigation Bar */}
        <Navigation />

        {/* Main Controls Header: Exchange Selector & Status */}
        <div className={styles.headerBar} style={{ padding: "16px 24px" }}>
          <div className={styles.statusGroup}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, color: "#e2e8f0", fontWeight: 600 }}>
              Exchange:
              <select
                className={styles.input}
                style={{ padding: "8px 16px", background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)" }}
                value={exchange}
                onChange={(e) => setExchange(e.target.value as Exchange)}
              >
                <option value="binance">Binance Spot</option>
                <option value="bitget">Bitget Spot</option>
                <option value="mexc">MEXC Spot</option>
              </select>
            </label>
            {loadingCoins ? (
              <span style={{ color: "#94a3b8" }}>Extracting market prices...</span>
            ) : (
              <span style={{ color: "#94a3b8" }}>
                Live prices loaded (Sync: {updatedAt || "-"})
              </span>
            )}
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Dynamic Style Tabs */}
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 8,
            borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          {(Object.keys(STRATEGIES) as ActiveTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const tabLabels: Record<ActiveTab, string> = {
              day: "📅 Day Trading",
              scalping: "⚡ Scalping",
              hft: "🤖 HFT (High-Frequency)",
              swing: "📈 Swing Trading",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  border: isActive ? "none" : "1px solid rgba(56, 189, 248, 0.4)",
                  background: isActive
                    ? "linear-gradient(135deg, #38bdf8, #6366f1)"
                    : "rgba(56, 189, 248, 0.05)",
                  color: isActive ? "#0f172a" : "#38bdf8",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  transform: isActive ? "translateY(-1px)" : "none",
                  boxShadow: isActive ? "0 4px 12px rgba(56, 189, 248, 0.25)" : "none",
                }}
              >
                {tabLabels[tab]}
              </button>
            );
          })}
        </div>

        {/* 2-Column Responsive Strategy Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: 28,
            marginTop: 12,
          }}
        >
          {/* Column 1: Strategy Outline (Left/Top) */}
          <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2>📋 Professional Strategy Outline</h2>
            <div style={{ padding: "0 4px" }}>
              <h3 style={{ background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                {activeStrategy.title}
              </h3>
              <p style={{ color: "#cbd5f5", marginBottom: 20, lineHeight: 1.6 }}>{activeStrategy.description}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div style={{ padding: 12, background: "rgba(15, 23, 42, 0.6)", borderRadius: 10, border: "1px solid rgba(148, 163, 184, 0.15)" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>Profit Target Goal</p>
                  <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>{activeStrategy.profitPotential}</p>
                </div>
                <div style={{ padding: 12, background: "rgba(15, 23, 42, 0.6)", borderRadius: 10, border: "1px solid rgba(148, 163, 184, 0.15)" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>Risk Profile</p>
                  <p style={{ fontSize: 13, color: "#f87171", fontWeight: 700 }}>{activeStrategy.riskLevel}</p>
                </div>
                <div style={{ padding: 12, background: "rgba(15, 23, 42, 0.6)", borderRadius: 10, border: "1px solid rgba(148, 163, 184, 0.15)" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>Holding Time</p>
                  <p style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700 }}>{activeStrategy.holdingTime}</p>
                </div>
                <div style={{ padding: 12, background: "rgba(15, 23, 42, 0.6)", borderRadius: 10, border: "1px solid rgba(148, 163, 184, 0.15)" }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>Leverage Bracket</p>
                  <p style={{ fontSize: 13, color: "#38bdf8", fontWeight: 700 }}>{activeStrategy.leverage}</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>
                  Key Technical Setup Indicators
                </p>
                <ul style={{ paddingLeft: 16, color: "#cbd5f5", display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeStrategy.indicators.map((ind, i) => (
                    <li key={i} style={{ listStyleType: "square", fontSize: 13 }}>{ind}</li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  padding: 16,
                  background: "rgba(251, 191, 36, 0.05)",
                  borderRadius: 12,
                  border: "1px solid rgba(251, 191, 36, 0.2)",
                }}
              >
                <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  ⚠ Professional Maximization Rules (Strict)
                </p>
                <ol style={{ paddingLeft: 16, color: "#cbd5f5", display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeStrategy.rules.map((rule, i) => (
                    <li key={i} style={{ listStyleType: "decimal", fontSize: 13 }}>{rule}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Column 2: Curated Coins list with Pricing (Right/Bottom) */}
          <div className={styles.card} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2>📈 Extracted Target Coins</h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: -8 }}>
              Curated market assets matching this trading style's liquidity & volatility profile. Click <strong>Analyze</strong> to run technical checks.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 300 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                    <th style={{ color: "#94a3b8", padding: "12px 8px", textAlign: "left", fontSize: 12, textTransform: "uppercase" }}>Asset</th>
                    <th style={{ color: "#94a3b8", padding: "12px 8px", textAlign: "right", fontSize: 12, textTransform: "uppercase" }}>Live Price</th>
                    <th style={{ color: "#94a3b8", padding: "12px 8px", textAlign: "center", fontSize: 12, textTransform: "uppercase" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCoins.map((coinSymbol) => {
                    const price = getCoinPrice(coinSymbol);
                    const pair = getCoinPair(coinSymbol);

                    return (
                      <tr
                        key={coinSymbol}
                        style={{
                          borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
                          transition: "background 0.2s ease",
                        }}
                        className="hover:bg-slate-800/20"
                      >
                        <td style={{ padding: "14px 8px", fontWeight: 700, color: "#fff", display: "flex", flexDirection: "column" }}>
                          <span>{coinSymbol}</span>
                          <span style={{ fontSize: 11, fontWeight: "normal", color: "#64748b" }}>{pair}</span>
                        </td>
                        <td style={{ padding: "14px 8px", textAlign: "right", fontWeight: 600, color: price ? "#22c55e" : "#94a3b8" }}>
                          {price !== null ? (
                            `$${price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })} USDT`
                          ) : (
                            <span style={{ fontSize: 12, color: "#64748b" }}>Loading / Unavail.</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 8px", textAlign: "center" }}>
                          <Link
                            href={`/dashboard?exchange=${exchange}&symbol=${pair}`}
                            className={styles.upgradeButton}
                            style={{
                              display: "inline-block",
                              fontSize: 12,
                              padding: "6px 12px",
                              background: "linear-gradient(135deg, #38bdf8, #6366f1)",
                              color: "#0f172a",
                              fontWeight: 700,
                              borderRadius: 6,
                              textDecoration: "none",
                            }}
                          >
                            Analyze
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
