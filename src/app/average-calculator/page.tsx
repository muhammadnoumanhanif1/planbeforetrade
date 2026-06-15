"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import styles from "../page.module.css";

interface Coin {
  symbol: string;
  displaySymbol: string;
  lastPrice: number;
}

interface CalculatorEntry {
  boughtPrice: string;
  boughtQty: string;
  currentPrice: string;
  currentQty: string;
}

export default function AverageCalculatorPage() {
  const [exchange, setExchange] = useState<"binance" | "bitget" | "mexc">("binance");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const [entries, setEntries] = useState<CalculatorEntry[]>([
    { boughtPrice: "", boughtQty: "", currentPrice: "", currentQty: "" },
  ]);

  // Load user premium status
  const loadData = useCallback(async () => {
    setLoading(false);
    // No login required - everyone can access
    setLastUpdated(new Date().toLocaleString());
    // Load coins immediately (no delay)
    loadCoins("binance").catch((error) => {
      console.error("Failed to load coins:", error);
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCoins = async (selectedExchange: "binance" | "bitget" | "mexc") => {
    setLoadingCoins(true);
    setCoins([]);
    setSelectedSymbol("");
    setCurrentPrice(null);
    try {
      const response = await fetch(`/api/coins?exchange=${encodeURIComponent(selectedExchange)}`);
      const payload = await response.json();
      if (!response.ok) {
        console.error("Failed to fetch coins", payload);
        return;
      }
      const coinsArray = Array.isArray(payload?.coins) ? payload.coins : [];
      setCoins(coinsArray);
    } catch (error) {
      console.error("Failed to fetch coins", error);
    } finally {
      setLoadingCoins(false);
    }
  };

  const handleExchangeChange = async (newExchange: "binance" | "bitget" | "mexc") => {
    setExchange(newExchange);
    await loadCoins(newExchange);
  };

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    const coin = coins.find((c) => c.symbol === symbol);
    if (coin) {
      setCurrentPrice(coin.lastPrice);
    } else {
      setCurrentPrice(null);
    }
  };

  // Calculate totals
  const calculations = entries.reduce(
    (acc, entry) => {
      const boughtPrice = parseFloat(entry.boughtPrice) || 0;
      const boughtQty = parseFloat(entry.boughtQty) || 0;
      const currentPrice = parseFloat(entry.currentPrice) || 0;
      const currentQty = parseFloat(entry.currentQty) || 0;

      const boughtCost = boughtPrice * boughtQty;
      const currentValue = currentPrice * currentQty;

      return {
        totalBoughtQty: acc.totalBoughtQty + boughtQty,
        totalBoughtCost: acc.totalBoughtCost + boughtCost,
        totalCurrentQty: acc.totalCurrentQty + currentQty,
        totalCurrentValue: acc.totalCurrentValue + currentValue,
      };
    },
    { totalBoughtQty: 0, totalBoughtCost: 0, totalCurrentQty: 0, totalCurrentValue: 0 }
  );

  const averagePrice = calculations.totalBoughtQty > 0 ? calculations.totalBoughtCost / calculations.totalBoughtQty : 0;
  const totalQty = calculations.totalBoughtQty + calculations.totalCurrentQty;
  const totalPrice = calculations.totalBoughtCost + calculations.totalCurrentValue;
  const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0;
  const simulatedProfitLoss = currentPrice !== null ? (currentPrice - avgPrice) * totalQty : 0;
  const simulatedProfitLossPercent =
    avgPrice > 0 && currentPrice !== null ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

  const updateEntry = (index: number, field: keyof CalculatorEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  if (loading) {
    return (
      <div className={`${styles.page} ${styles.scaledTypography}`}>
        <main className={styles.main} />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.scaledTypography}`}>
      <main className={styles.main}>
        {/* Header with Title */}
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>AVERAGE CALCULATOR</h1>
            </div>
          </div>
        </header>

        <nav
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            backgroundColor: "rgba(15, 23, 42, 0.5)",
          }}
        >
          <Link href="/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/watchlists" className={styles.navLink}>
            Watchlists
          </Link>
          <Link href="/average-calculator" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Average Calculator
          </Link>
          <Link href="/alerts" className={styles.navLink}>
            Alerts
          </Link>
          <Link href="/profile" className={styles.navLink}>
            Profile
          </Link>
        </nav>

        {message && <div className={message.type === "success" ? styles.success : styles.error}>{message.text}</div>}

        {/* 3-Column Table Layout */}
        <div
          className={styles.card}
          style={{
            margin: "20px 0",
            padding: 16,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "transparent",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#fff",
                    width: "33.33%",
                  }}
                >
                  Coin Selection
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#fff",
                    width: "33.33%",
                  }}
                >
                  Purchase Entry
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#fff",
                    width: "33.33%",
                  }}
                >
                  Results
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.2)" }}>
                {/* Column 1: Coin Selection */}
                <td style={{ padding: "16px", verticalAlign: "top" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label className={styles.label}>
                      Exchange
                      <select
                        className={styles.input}
                        value={exchange}
                        onChange={(e) => handleExchangeChange(e.target.value as "binance" | "bitget" | "mexc")}
                      >
                        <option value="binance">Binance</option>
                        <option value="bitget">Bitget</option>
                        <option value="mexc">MEXC</option>
                      </select>
                    </label>

                    <label className={styles.label}>
                      Coin
                      <select
                        className={styles.input}
                        value={selectedSymbol}
                        onChange={(e) => handleSymbolChange(e.target.value)}
                        disabled={loadingCoins}
                      >
                        <option value="">{loadingCoins ? "Loading coins..." : "Choose a coin"}</option>
                        {coins.map((coin) => (
                          <option key={coin.symbol} value={coin.symbol}>
                            {coin.displaySymbol} (${coin.lastPrice.toFixed(4)})
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedSymbol && currentPrice !== null && (
                      <div
                        style={{
                          padding: "12px",
                          backgroundColor: "rgba(52, 168, 83, 0.1)",
                          borderRadius: 6,
                          border: "1px solid rgba(52, 168, 83, 0.2)",
                        }}
                      >
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85em", textTransform: "uppercase" }}>
                          Current Market Price
                        </p>
                        <p style={{ margin: "8px 0 0 0", color: "#34a853", fontSize: "1.05em", fontWeight: 600 }}>
                          ${currentPrice.toFixed(4)} USDT
                        </p>
                      </div>
                    )}
                  </div>
                  <label className={styles.label} style={{ marginTop: 12 }}>
                    Manual symbol
                    <input
                      className={styles.input}
                      value={selectedSymbol}
                      onChange={(e) => handleSymbolChange(e.target.value.trim().toUpperCase())}
                      placeholder="Type coin symbol, e.g. BTCUSDT"
                      autoCapitalize="characters"
                    />
                  </label>
                </td>

                {/* Column 2: Purchase Entry */}
                <td style={{ padding: "16px", verticalAlign: "top" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label className={styles.label}>
                      Bought Price
                      <input
                        className={styles.input}
                        type="number"
                        step="0.00000001"
                        placeholder="0.00"
                        value={entries[0].boughtPrice}
                        onChange={(e) => updateEntry(0, "boughtPrice", e.target.value)}
                      />
                    </label>
                    <label className={styles.label}>
                      Bought Qty
                      <input
                        className={styles.input}
                        type="number"
                        step="0.00000001"
                        placeholder="0.00"
                        value={entries[0].boughtQty}
                        onChange={(e) => updateEntry(0, "boughtQty", e.target.value)}
                      />
                    </label>
                    <label className={styles.label}>
                      Current Price
                      <input
                        className={styles.input}
                        type="number"
                        step="0.00000001"
                        placeholder="0.00"
                        value={entries[0].currentPrice}
                        onChange={(e) => updateEntry(0, "currentPrice", e.target.value)}
                      />
                    </label>
                    <label className={styles.label}>
                      Current Qty
                      <input
                        className={styles.input}
                        type="number"
                        step="0.00000001"
                        placeholder="0.00"
                        value={entries[0].currentQty}
                        onChange={(e) => updateEntry(0, "currentQty", e.target.value)}
                      />
                    </label>
                  </div>
                </td>

                {/* Column 3: Results */}
                <td style={{ padding: "16px", verticalAlign: "top" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "rgba(100, 116, 139, 0.1)",
                        borderRadius: 6,
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85em" }}>Total Quantity</p>
                      <p style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "1em", fontWeight: 600 }}>
                        {Math.round(totalQty).toString().padStart(2, "0")}
                      </p>
                    </div>
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "rgba(100, 116, 139, 0.1)",
                        borderRadius: 6,
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85em" }}>Average Price</p>
                      <p style={{ margin: "6px 0 0 0", color: "#fff", fontSize: "1em", fontWeight: 600 }}>
                        ${avgPrice.toFixed(4)} USDT
                      </p>
                    </div>

                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "rgba(100, 116, 139, 0.1)",
                        borderRadius: 6,
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                      }}
                    >
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85em" }}>Profit & Loss Simulation</p>
                      {currentPrice !== null ? (
                        <>
                          <p
                            style={{
                              margin: "6px 0 0 0",
                              color: simulatedProfitLoss >= 0 ? "#34a853" : "#ff6b6b",
                              fontSize: "1em",
                              fontWeight: 600,
                            }}
                          >
                            {simulatedProfitLoss >= 0 ? "+" : ""}
                            {simulatedProfitLoss.toFixed(4)} USDT
                          </p>
                          <p style={{ margin: "4px 0 0 0", color: "#cbd5e1", fontSize: "0.9em" }}>
                            {simulatedProfitLossPercent >= 0 ? "+" : ""}
                            {simulatedProfitLossPercent.toFixed(2)}% vs average price
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "0.9em" }}>
                            Uses total quantity and average price after averaging.
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className={styles.card} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h2 style={{ marginBottom: 8 }}>Liquidation Calculator</h2>
            <p style={{ color: "#cbd5f5", margin: 0 }}>
              Compare estimated liquidation prices across Binance, Bitget, and MEXC from the same calculator hub.
            </p>
          </div>
          <Link href="/liquidation-calculator" className={styles.button} style={{ textDecoration: "none", textAlign: "center", width: "fit-content" }}>
            Open liquidation calculator
          </Link>
        </section>
      </main>
    </div>
  );
}
