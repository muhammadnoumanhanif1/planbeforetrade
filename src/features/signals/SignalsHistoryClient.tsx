"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import styles from "@/app/page.module.css";
import type { SignalRecord } from "@/lib/signals/signalHistoryManager";
import { calculatePerformance } from "@/lib/signals/performanceTracker";

const SIGNAL_HISTORY_KEY = "sme_signal_history";

const formatPrice = (value: number | null) =>
  value === null || !Number.isFinite(value)
    ? "-"
    : value.toLocaleString("en-US", { maximumFractionDigits: 6 });

const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export function SignalsHistoryClient() {
  const [history, setHistory] = useState<SignalRecord[]>([]);
  const [filterSymbol, setFilterSymbol] = useState("all");
  const [filterResult, setFilterResult] = useState<"all" | "WIN" | "LOSS" | "open">("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIGNAL_HISTORY_KEY);
      if (raw) {
        setHistory(JSON.parse(raw) as SignalRecord[]);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const allSymbols = Array.from(new Set(history.map((r) => r.symbol))).sort();

  const filtered = history.filter((r) => {
    if (filterSymbol !== "all" && r.symbol !== filterSymbol) return false;
    if (filterResult === "WIN" && r.result !== "WIN") return false;
    if (filterResult === "LOSS" && r.result !== "LOSS") return false;
    if (filterResult === "open" && r.status === "CLOSED") return false;
    return true;
  });

  const performance = calculatePerformance(history);
  const winRate = Math.round(performance.winRate * 100);
  const closedCount = history.filter((r) => r.result !== null).length;
  const wins = history.filter((r) => r.result === "WIN").length;
  const losses = history.filter((r) => r.result === "LOSS").length;

  const handleClearHistory = () => {
    if (typeof window !== "undefined" && window.confirm("Clear all signal history? This cannot be undone.")) {
      localStorage.removeItem(SIGNAL_HISTORY_KEY);
      setHistory([]);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main} style={{ paddingBottom: 80 }}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img
              src="/logo.png"
              alt="Plan Before Trade Logo"
              style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }}
            />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>SIGNAL HISTORY</h1>
              <p className={styles.subtitle}>
                Past trading signals with win/loss results and performance stats.
              </p>
            </div>
          </div>
        </header>

        <Navigation />

        {/* Performance summary */}
        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Performance Summary</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 8 }}>
              <div>
                <p className={styles.labelText}>Total Signals</p>
                <p style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700 }}>{history.length}</p>
              </div>
              <div>
                <p className={styles.labelText}>Closed</p>
                <p style={{ color: "#e2e8f0", fontSize: 24, fontWeight: 700 }}>{closedCount}</p>
              </div>
              <div>
                <p className={styles.labelText}>Wins</p>
                <p style={{ color: "#10b981", fontSize: 24, fontWeight: 700 }}>{wins}</p>
              </div>
              <div>
                <p className={styles.labelText}>Losses</p>
                <p style={{ color: "#ef4444", fontSize: 24, fontWeight: 700 }}>{losses}</p>
              </div>
              <div>
                <p className={styles.labelText}>Win Rate</p>
                <p
                  style={{
                    color: winRate >= 50 ? "#10b981" : "#ef4444",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {closedCount === 0 ? "-" : `${winRate}%`}
                </p>
              </div>
              <div>
                <p className={styles.labelText}>Total R</p>
                <p
                  style={{
                    color: performance.totalR >= 0 ? "#10b981" : "#ef4444",
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {closedCount === 0 ? "-" : `${performance.totalR.toFixed(1)}R`}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.card}>
            <h2>Filter History</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <label className={styles.label} style={{ flex: "1 1 160px" }}>
                Symbol
                <select
                  className={styles.input}
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                >
                  <option value="all">All Symbols</option>
                  {allSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.label} style={{ flex: "1 1 160px" }}>
                Result
                <select
                  className={styles.input}
                  value={filterResult}
                  onChange={(e) =>
                    setFilterResult(e.target.value as "all" | "WIN" | "LOSS" | "open")
                  }
                >
                  <option value="all">All</option>
                  <option value="WIN">Wins</option>
                  <option value="LOSS">Losses</option>
                  <option value="open">Open</option>
                </select>
              </label>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                style={{
                  marginTop: 16,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Clear All History
              </button>
            )}
          </div>
        </section>

        {/* Signal records */}
        {history.length === 0 ? (
          <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
            <p className={styles.placeholder} style={{ marginBottom: 16 }}>
              No signal history yet. Signals are recorded automatically when you use the{" "}
              <Link href="/market-structure-signals" style={{ color: "#10b981" }}>
                Smart Signals
              </Link>{" "}
              scanner.
            </p>
            <Link
              href="/market-structure-signals"
              className={styles.button}
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              Go to Smart Signals
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.card} style={{ textAlign: "center", padding: 40 }}>
            <p className={styles.placeholder}>No signals match the selected filters.</p>
          </div>
        ) : (
          <section className={styles.grid}>
            {[...filtered].reverse().map((record) => {
              const isWin = record.result === "WIN";
              const isLoss = record.result === "LOSS";
              const isOpen = record.status !== "CLOSED";

              const borderColor = isWin
                ? "rgba(16, 185, 129, 0.4)"
                : isLoss
                ? "rgba(239, 68, 68, 0.4)"
                : "rgba(148, 163, 184, 0.2)";

              return (
                <div
                  key={record.id}
                  className={styles.card}
                  style={{ borderLeft: `3px solid ${borderColor}` }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>
                      {record.symbol} · {record.signal_number}
                    </h3>
                    <span
                      className={styles.badge}
                      style={{
                        background: isWin
                          ? "rgba(16, 185, 129, 0.2)"
                          : isLoss
                          ? "rgba(239, 68, 68, 0.2)"
                          : "rgba(148, 163, 184, 0.15)",
                        color: isWin ? "#10b981" : isLoss ? "#ef4444" : "#94a3b8",
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {isOpen ? record.status : record.result}
                    </span>
                  </div>

                  <div className={styles.priceRow}>
                    <div>
                      <p className={styles.labelText}>Exchange</p>
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>
                        {record.exchange.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className={styles.labelText}>Trend</p>
                      <p
                        style={{
                          color:
                            record.trend === "UPTREND"
                              ? "#10b981"
                              : record.trend === "DOWNTREND"
                              ? "#ef4444"
                              : "#94a3b8",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {record.trend}
                      </p>
                    </div>
                  </div>

                  <div
                    className={styles.helperRow}
                    style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}
                  >
                    <div>
                      <p className={styles.labelText}>Entry Zone</p>
                      <p style={{ color: "#e2e8f0", fontSize: 13 }}>
                        {record.entry_zone
                          ? `${formatPrice(record.entry_zone[0])} – ${formatPrice(record.entry_zone[1])}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className={styles.labelText}>Stop Loss</p>
                      <p style={{ color: "#ef4444", fontSize: 13 }}>
                        {formatPrice(record.stop_loss)}
                      </p>
                    </div>
                    <div>
                      <p className={styles.labelText}>Take Profit</p>
                      <p style={{ color: "#10b981", fontSize: 13 }}>
                        {formatPrice(record.take_profit)}
                      </p>
                    </div>
                    <div>
                      <p className={styles.labelText}>R:R</p>
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>
                        1:{record.risk_reward_ratio}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 12,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    <span>Opened: {formatDate(record.created_at)}</span>
                    {record.closed_at && <span>Closed: {formatDate(record.closed_at)}</span>}
                    {record.result_R !== null && (
                      <span
                        style={{
                          color: record.result_R > 0 ? "#10b981" : "#ef4444",
                          fontWeight: 700,
                        }}
                      >
                        {record.result_R > 0 ? "+" : ""}
                        {record.result_R}R
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
