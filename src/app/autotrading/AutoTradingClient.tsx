"use client";

import { useCallback, useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import styles from "@/app/page.module.css";

interface BotStatus {
  tradingMode: string;
  isLive: boolean;
  activeCount: number;
  maxActiveTrades: number;
  dailyLossCount: number;
  dailyLossLimit: number;
  riskReport: string;
  binanceConfigured: boolean;
  telegramConfigured: boolean;
}

interface ActiveTrade {
  symbol: string;
  side: string;
  entryPrice: number;
  quantity: number;
  openTime: number;
  openDurationMinutes: number;
}

interface RecentTrade {
  id: string;
  symbol: string;
  action?: string;
  trend?: string;
  entry_price?: number;
  stop_loss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  confidence?: number;
  ai_score?: number;
  updated_at?: string;
  created_at?: string;
}

interface TriggerResult {
  message: string;
  signalsFound: number;
  executed: number;
  results: { symbol: string; success: boolean; message: string }[];
}

interface AutoTradingClientProps {
  isAdmin: boolean;
}

export function AutoTradingClient({ isAdmin }: AutoTradingClientProps) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<TriggerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (n: number | undefined, decimals = 6) => {
    if (n == null || !Number.isFinite(n)) return "-";
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statusRes, activeRes, recentRes] = await Promise.all([
        fetch("/api/autotrading/status"),
        fetch("/api/trades/active"),
        fetch("/api/trades/recent?limit=20"),
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (activeRes.ok) {
        const data = await activeRes.json();
        setActiveTrades(data.activeTrades || []);
      }
      if (recentRes.ok) {
        const data = await recentRes.json();
        setRecentTrades(data.trades || []);
      }
    } catch (e) {
      setError("Failed to load bot data. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTrigger = useCallback(async () => {
    if (!isAdmin) return;
    setTriggering(true);
    setTriggerResult(null);
    setError(null);
    try {
      const res = await fetch("/api/autotrading/trigger", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Trigger failed");
      } else {
        setTriggerResult(data);
        await loadData();
      }
    } catch {
      setError("Failed to trigger scan");
    } finally {
      setTriggering(false);
    }
  }, [isAdmin, loadData]);

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.placeholder}>Loading auto-trading bot...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img
              src="/logo.png"
              alt="Plan Before Trade Logo"
              style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }}
            />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>BINANCE AUTO TRADING BOT</h1>
            </div>
          </div>
          <div className={styles.headerBar}>
            <div className={styles.statusGroup}>
              {status && (
                <>
                  <span
                    style={{
                      color: status.isLive ? "#f97316" : "#22c55e",
                      fontWeight: 700,
                    }}
                  >
                    ● {status.tradingMode.toUpperCase()} MODE
                  </span>
                  <span>Active trades: {status.activeCount}/{status.maxActiveTrades}</span>
                  <span>Daily losses: {status.dailyLossCount}/{status.dailyLossLimit}R</span>
                </>
              )}
            </div>
          </div>
        </header>

        <Navigation />

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.grid}>
          {/* Bot Status Card */}
          <div className={styles.card}>
            <h2>Bot Status</h2>

            {status ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className={styles.supportBox}>
                  <div>
                    <p className={styles.labelText}>Trading Mode</p>
                    <p
                      className={styles.priceValue}
                      style={{ color: status.isLive ? "#f97316" : "#22c55e" }}
                    >
                      {status.tradingMode.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Active Trades</p>
                    <p className={styles.priceValue}>
                      {status.activeCount} / {status.maxActiveTrades}
                    </p>
                  </div>
                </div>

                <div className={styles.supportBox}>
                  <div>
                    <p className={styles.labelText}>Daily Losses</p>
                    <p className={styles.priceValue}>
                      {status.dailyLossCount} / {status.dailyLossLimit}R
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Risk Report</p>
                    <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                      {status.riskReport}
                    </p>
                  </div>
                </div>

                <div className={styles.supportBox}>
                  <div>
                    <p className={styles.labelText}>Binance API</p>
                    <p
                      className={styles.priceValue}
                      style={{
                        fontSize: 14,
                        color: status.binanceConfigured ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {status.binanceConfigured ? "✓ Configured" : "✗ Not configured"}
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Telegram</p>
                    <p
                      className={styles.priceValue}
                      style={{
                        fontSize: 14,
                        color: status.telegramConfigured ? "#22c55e" : "#94a3b8",
                      }}
                    >
                      {status.telegramConfigured ? "✓ Configured" : "— Not set"}
                    </p>
                  </div>
                </div>

                {status.isLive && (
                  <div
                    style={{
                      background: "rgba(249, 115, 22, 0.1)",
                      border: "1px solid rgba(249, 115, 22, 0.3)",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <p style={{ color: "#f97316", fontWeight: 700, margin: 0, marginBottom: 4 }}>
                      ⚠️ LIVE MODE ACTIVE
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                      Real trades will be placed on Binance. Monitor closely.
                    </p>
                  </div>
                )}

                {!status.isLive && (
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <p style={{ color: "#22c55e", fontWeight: 700, margin: 0, marginBottom: 4 }}>
                      🧪 TEST MODE
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                      No real trades placed. Orders are logged only.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.placeholder}>Unable to load bot status.</p>
            )}

            {isAdmin && (
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={handleTrigger}
                  disabled={triggering}
                >
                  {triggering ? "Scanning signals..." : "▶ Run Trade Scan Now"}
                </button>

                {triggerResult && (
                  <div
                    style={{
                      marginTop: 12,
                      background: "rgba(30, 41, 59, 0.8)",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <p style={{ color: "#22c55e", fontWeight: 700, margin: 0, marginBottom: 8 }}>
                      Scan complete
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 4px" }}>
                      Signals found: {triggerResult.signalsFound}
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 8px" }}>
                      Executed: {triggerResult.executed}
                    </p>
                    {triggerResult.results.length > 0 && (
                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {triggerResult.results.map((r, i) => (
                          <li
                            key={`${r.symbol}-${i}`}
                            style={{ fontSize: 12, color: r.success ? "#22c55e" : "#f87171" }}
                          >
                            {r.success ? "✓" : "✗"} {r.symbol}: {r.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isAdmin && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "rgba(30, 41, 59, 0.6)",
                  borderRadius: 10,
                }}
              >
                <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                  The bot runs automatically via scheduled cron jobs. Manual trigger requires admin access.
                </p>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className={styles.button}
                onClick={loadData}
                style={{ background: "rgba(30, 41, 59, 0.8)", color: "#94a3b8" }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Active Trades Card */}
          <div className={styles.card}>
            <h2>Active Trades ({activeTrades.length})</h2>

            {activeTrades.length === 0 ? (
              <p className={styles.placeholder}>No active trades currently open.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {activeTrades.map((trade) => (
                  <div
                    key={trade.symbol}
                    style={{
                      background: "rgba(30, 41, 59, 0.8)",
                      borderRadius: 10,
                      padding: "12px 16px",
                      border: "1px solid rgba(148, 163, 184, 0.15)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{trade.symbol}</span>
                      <span
                        style={{
                          color: trade.side === "BUY" ? "#22c55e" : "#f97316",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {trade.side}
                      </span>
                    </div>
                    <div className={styles.indicatorGrid} style={{ marginTop: 0 }}>
                      <div>
                        <span>Entry Price</span>
                        <strong>{formatNumber(trade.entryPrice, 6)}</strong>
                      </div>
                      <div>
                        <span>Quantity</span>
                        <strong>{trade.quantity}</strong>
                      </div>
                      <div>
                        <span>Open For</span>
                        <strong>{trade.openDurationMinutes}m</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Trades Section */}
        <section>
          <div className={styles.card}>
            <h2>Recent Trade History</h2>

            {recentTrades.length === 0 ? (
              <p className={styles.placeholder}>No executed trades found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className={styles.riskTable}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Direction</th>
                      <th>Entry</th>
                      <th>Stop Loss</th>
                      <th>TP1</th>
                      <th>TP2</th>
                      <th>TP3</th>
                      <th>Confidence</th>
                      <th>AI Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map((trade) => (
                      <tr key={trade.id}>
                        <td style={{ fontWeight: 700 }}>{trade.symbol}</td>
                        <td>
                          <span
                            style={{
                              color: trade.action === "BUY" ? "#22c55e" : "#f97316",
                              fontWeight: 600,
                            }}
                          >
                            {trade.action || trade.trend || "-"}
                          </span>
                        </td>
                        <td>{formatNumber(trade.entry_price, 6)}</td>
                        <td style={{ color: "#f87171" }}>{formatNumber(trade.stop_loss, 6)}</td>
                        <td style={{ color: "#22c55e" }}>{formatNumber(trade.tp1, 6)}</td>
                        <td style={{ color: "#22c55e" }}>{formatNumber(trade.tp2, 6)}</td>
                        <td style={{ color: "#22c55e" }}>{formatNumber(trade.tp3, 6)}</td>
                        <td>{trade.confidence ? `${trade.confidence}%` : "-"}</td>
                        <td>{trade.ai_score != null ? trade.ai_score : "-"}</td>
                        <td style={{ fontSize: 12, color: "#94a3b8" }}>
                          {trade.updated_at || trade.created_at
                            ? new Date(
                                trade.updated_at || trade.created_at || ""
                              ).toLocaleString("en-US", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Setup Info Section */}
        <section>
          <div className={styles.card}>
            <h2>Setup Information</h2>
            <div className={styles.indicators}>
              <h3>Monitored Symbols</h3>
              <div className={styles.indicatorGrid}>
                {["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"].map((sym) => (
                  <div key={sym}>
                    <span>{sym}</span>
                    <strong>1h</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.indicators} style={{ marginTop: 16 }}>
              <h3>Bot Configuration</h3>
              <div className={styles.indicatorGrid}>
                <div>
                  <span>Signal Min. Confidence</span>
                  <strong>75%</strong>
                </div>
                <div>
                  <span>Min. AI Score</span>
                  <strong>75</strong>
                </div>
                <div>
                  <span>Risk Per Trade</span>
                  <strong>1%</strong>
                </div>
                <div>
                  <span>Max Concurrent Trades</span>
                  <strong>2</strong>
                </div>
                <div>
                  <span>Daily Loss Limit</span>
                  <strong>3R</strong>
                </div>
                <div>
                  <span>TP Split</span>
                  <strong>33% / 33% / 34%</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "rgba(30, 41, 59, 0.6)",
                borderRadius: 10,
              }}
            >
              <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                To change trading mode or API keys, update the environment variables:
                <code
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "#cbd5f5",
                    fontFamily: "monospace",
                  }}
                >
                  TRADING_MODE=test | live
                  <br />
                  BINANCE_API_KEY=...
                  <br />
                  BINANCE_SECRET_KEY=...
                </code>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
