"use client";

import { useCallback, useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
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

export default function AverageCoinCalculatorPage() {
  const [exchange, setExchange] = useState<"binance" | "bitget" | "mexc">("binance");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [entries, setEntries] = useState<CalculatorEntry[]>([
    { boughtPrice: "", boughtQty: "", currentPrice: "", currentQty: "" },
  ]);

  const loadCoins = useCallback(async (selectedExchange: "binance" | "bitget" | "mexc") => {
    setLoadingCoins(true);
    setCoins([]);
    setSelectedSymbol("");
    setCurrentPrice(null);
    try {
      const response = await fetch(`/api/coins?exchange=${encodeURIComponent(selectedExchange)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error("Failed to fetch coins");
      setCoins(Array.isArray(payload?.coins) ? payload.coins : []);
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setLoadingCoins(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      await loadCoins("binance");
    } catch (error) {
      console.error("Failed to load coins:", error);
      setMessage({ type: "error", text: "Failed to load coin data." });
    } finally {
      setLoading(false);
    }
  }, [loadCoins]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const updateEntry = (index: number, field: keyof CalculatorEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.placeholder}>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navigation />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
            <h1>AVERAGE COIN CALCULATOR</h1>
            </div>
          </div>
        </header>

        {message && <div className={message.type === "success" ? styles.success : styles.error}>{message.text}</div>}

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Coin Selection</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

              <label className={styles.label}>
                Manual symbol
                <input
                  className={styles.input}
                  value={selectedSymbol}
                  onChange={(e) => handleSymbolChange(e.target.value.trim().toUpperCase())}
                  placeholder="Type coin symbol, e.g. BTCUSDT"
                  autoCapitalize="characters"
                />
              </label>
            </div>

            {selectedSymbol && currentPrice !== null && (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px",
                  backgroundColor: "rgba(52, 168, 83, 0.1)",
                  borderRadius: 6,
                  border: "1px solid rgba(52, 168, 83, 0.2)",
                }}
              >
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Current Market Price
                </p>
                <p style={{ margin: "8px 0 0 0", color: "#34a853", fontSize: 20, fontWeight: 600 }}>
                  ${currentPrice.toFixed(4)} USDT
                </p>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>Purchase Entry</h2>
            <div
              style={{
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label className={styles.label}>
                  Bought Price
                  <input
                    className={styles.input}
                    type="number"
                    step="0.00000001"
                    placeholder="Buy price"
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
                    placeholder="Buy quantity"
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
                    placeholder="Current price"
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
                    placeholder="Current quantity"
                    value={entries[0].currentQty}
                    onChange={(e) => updateEntry(0, "currentQty", e.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2>Results</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "8px", backgroundColor: "rgba(100, 116, 139, 0.1)", borderRadius: 6 }}>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Total Quantity (All)</p>
                <p style={{ margin: "4px 0 0 0", color: "#fff", fontSize: 16, fontWeight: 600 }}>
                  {totalQty.toFixed(4)}
                </p>
              </div>
              <div style={{ padding: "8px", backgroundColor: "rgba(100, 116, 139, 0.1)", borderRadius: 6 }}>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 12 }}>Average Price (All)</p>
                <p style={{ margin: "4px 0 0 0", color: "#fff", fontSize: 16, fontWeight: 600 }}>
                  ${avgPrice.toFixed(4)} USDT
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
