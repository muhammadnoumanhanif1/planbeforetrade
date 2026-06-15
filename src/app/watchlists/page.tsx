"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import { hasPremiumAccess, isTemporaryPublicAccessEnabled } from "@/lib/auth-access";
import styles from "../page.module.css";

type WatchlistCoin = { 
  exchange: "bitget" | "binance" | "mexc"; 
  symbol: string;
  entryPrice?: number;
  targetPrice?: number;
  stopLoss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  confidence?: number;
  recommendation?: "LONG" | "SHORT";
  timeframe?: string;
  createdAt?: string;
};
type Watchlist = {
  id: string;
  name: string;
  coins: WatchlistCoin[];
  created_at: string;
  updated_at: string;
};

export default function WatchlistsPage() {
  const isTemporaryPublicAccess = isTemporaryPublicAccessEnabled();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [selectedCoinForPrice, setSelectedCoinForPrice] = useState<WatchlistCoin | null>(null);
  const [manualSymbol, setManualSymbol] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!isTemporaryPublicAccess) {
          window.location.href = "/login";
          return;
        }
        setIsPremium(false);
        setWatchlists([]);
        return;
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!hasPremiumAccess(subscription)) {
        setIsPremium(false);
        setWatchlists([]);
        return;
      }

      setIsPremium(true);
      const response = await fetch("/api/watchlists");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load watchlists");
      setWatchlists(payload.watchlists ?? []);
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [isTemporaryPublicAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueCoins = useMemo(() => {
    const all = watchlists.flatMap((w) => w.coins.map((c) => `${c.exchange}:${c.symbol}`));
    return new Set(all).size;
  }, [watchlists]);

  const deleteWatchlist = async (id: string) => {
    setMessage(null);
    try {
      const response = await fetch(`/api/watchlists?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to delete watchlist");
      setWatchlists((prev) => prev.filter((item) => item.id !== id));
      setMessage({ type: "success", text: "Watchlist deleted." });
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    }
  };

  const deleteCoinFromWatchlist = async (watchlistId: string, coin: WatchlistCoin) => {
    setMessage(null);
    try {
      const response = await fetch(
        `/api/watchlists/remove-coin?watchlistId=${encodeURIComponent(watchlistId)}&exchange=${encodeURIComponent(coin.exchange)}&symbol=${encodeURIComponent(coin.symbol)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to remove coin");
      
      // Update local state
      setWatchlists((prev) =>
        prev.map((w) =>
          w.id === watchlistId
            ? { ...w, coins: w.coins.filter((c) => !(c.exchange === coin.exchange && c.symbol === coin.symbol)) }
            : w
        )
      );
      setMessage({ type: "success", text: payload?.message || `${coin.symbol} removed.` });
    } catch (error) {
      setMessage({ type: "error", text: (error as Error).message });
    }
  };

  const fetchCurrentPrice = async (exchange: string, symbol: string) => {
    setLoadingPrice(true);
    try {
      const response = await fetch(`/api/coins?exchange=${encodeURIComponent(exchange)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error("Failed to fetch price");
      
      interface Coin {
        symbol: string;
        lastPrice: number;
      }
      const coins: Coin[] = Array.isArray(payload?.coins) ? payload.coins : [];
      const foundCoin = coins.find((c: Coin) => c.symbol === symbol);
      
      if (foundCoin) {
        setCurrentPrice(foundCoin.lastPrice);
        const normalizedExchange = (exchange || "binance") as WatchlistCoin["exchange"];
        const coinObj: Pick<WatchlistCoin, 'exchange' | 'symbol'> = { exchange: normalizedExchange, symbol };
        setSelectedCoinForPrice(coinObj as WatchlistCoin);
      } else {
        setCurrentPrice(null);
      }
    } catch (error) {
      console.error("Price fetch error:", error);
      setCurrentPrice(null);
    } finally {
      setLoadingPrice(false);
    }
  };

  const fetchCurrentPriceForManualSymbol = async () => {
    const symbol = manualSymbol.trim().toUpperCase();
    if (!symbol) return;
    await fetchCurrentPrice("binance", symbol);
  };

  const getSignalPerformance = (coin: WatchlistCoin) => {
    if (!coin.entryPrice || currentPrice === null || !selectedCoinForPrice) return null;

    const isSelectedCoin =
      selectedCoinForPrice.exchange === coin.exchange && selectedCoinForPrice.symbol === coin.symbol;
    if (!isSelectedCoin) return null;

    const performancePercent = ((currentPrice - coin.entryPrice) / coin.entryPrice) * 100;
    const profitLossDollars = currentPrice - coin.entryPrice;
    const isProfit = profitLossDollars >= 0;

    return {
      performancePercent,
      profitLossDollars,
      isProfit,
    };
  };

  if (loading) {
    return (
      <div className={`${styles.page} ${styles.scaledTypography}`}>
        <main className={styles.main} />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className={`${styles.page} ${styles.scaledTypography}`}>
        <main className={styles.main}>
          <header className={styles.header}>
            <p className={styles.kicker}>Plan Before Trade</p>
            <h1>WATCHLISTS</h1>
          </header>
          <div className={styles.card}>
            <h2>Premium Feature</h2>
            <p style={{ color: "#94a3b8", marginBottom: 16 }}>
              Watchlists are available on Premium plans.
            </p>
            <Link href="/pricing" className={styles.button} style={{ textDecoration: "none", textAlign: "center" }}>
              Upgrade to Premium
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.scaledTypography}`}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
            <h1>WATCHLISTS</h1>
            </div>
          </div>
        </header>

        <Navigation />

        {message && <div className={message.type === "success" ? styles.success : styles.error}>{message.text}</div>}

        <section style={{ maxWidth: "100%" }}>
          <div className={styles.card}>
            <h2>Your Watchlists</h2>
            {watchlists.length === 0 ? (
              <p className={styles.placeholder}>No watchlists yet.</p>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label className={styles.label}>
                    Select coin to view current price
                    <select
                      className={styles.input}
                      onChange={(e) => {
                        const [exchange, symbol] = e.target.value.split(":");
                        if (exchange && symbol) {
                          fetchCurrentPrice(exchange, symbol);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Choose a coin</option>
                      {watchlists.flatMap((w) =>
                        w.coins.map((coin) => (
                          <option
                            key={`${coin.exchange}-${coin.symbol}`}
                            value={`${coin.exchange}:${coin.symbol}`}
                          >
                            {coin.exchange.toUpperCase()} {coin.symbol}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label className={styles.label} style={{ marginTop: 12 }}>
                    Manual symbol
                    <input
                      className={styles.input}
                      value={manualSymbol}
                      onChange={(event) => setManualSymbol(event.target.value)}
                      onBlur={fetchCurrentPriceForManualSymbol}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void fetchCurrentPriceForManualSymbol();
                        }
                      }}
                      placeholder="Type coin symbol, e.g. BTCUSDT"
                      autoCapitalize="characters"
                    />
                  </label>

                  {selectedCoinForPrice && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "rgba(52, 168, 83, 0.1)",
                        borderRadius: 6,
                        marginTop: 12,
                      }}
                    >
                      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9em" }}>Current Price</p>
                      {loadingPrice ? (
                        <p style={{ margin: "4px 0 0 0", color: "#fff", fontSize: "1em", fontWeight: 600 }}>
                          Loading...
                        </p>
                      ) : currentPrice !== null ? (
                        <p style={{ margin: "4px 0 0 0", color: "#34a853", fontSize: "1.15em", fontWeight: 600 }}>
                          {currentPrice.toFixed(6)} USDT
                        </p>
                      ) : (
                        <p style={{ margin: "4px 0 0 0", color: "#ff6b6b", fontSize: "0.95em" }}>
                          Price not available
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {watchlists.map((watchlist) => (
                    <div
                      key={watchlist.id}
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "1em" }}>{watchlist.name}</p>
                          <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.9em" }}>
                            Created: {new Date(watchlist.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={styles.logoutButton}
                          onClick={() => deleteWatchlist(watchlist.id)}
                          style={{ width: "auto", padding: "8px 12px", fontSize: "0.95em" }}
                        >
                          Delete List
                        </button>
                      </div>

                      {watchlist.coins.length === 0 ? (
                        <p style={{ color: "#94a3b8", margin: 0 }}>No coins in this watchlist</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {watchlist.coins.map((coin, idx) => (
                            <div
                              key={`${coin.exchange}-${coin.symbol}-${idx}`}
                              style={{
                                backgroundColor: "rgba(15, 23, 42, 0.5)",
                                border: "1px solid rgba(148, 163, 184, 0.15)",
                                borderRadius: 8,
                                padding: 10,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <div>
                                  <p style={{ margin: 0, fontWeight: 600 }}>
                                    {coin.exchange.toUpperCase()} {coin.symbol}
                                  </p>
                                  {coin.timeframe && (
                                    <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontSize: "0.9em" }}>
                                      {coin.timeframe}
                                    </p>
                                  )}
                                </div>
                                {coin.recommendation && (
                                  <span
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 4,
                                      fontSize: "0.9em",
                                      fontWeight: 600,
                                      backgroundColor:
                                        coin.recommendation === "LONG"
                                          ? "rgba(52, 168, 83, 0.2)"
                                          : "rgba(255, 107, 107, 0.2)",
                                      color:
                                        coin.recommendation === "LONG" ? "#34a853" : "#ff6b6b",
                                    }}
                                  >
                                    {coin.recommendation}
                                  </span>
                                )}
                                {coin.entryPrice && getSignalPerformance(coin) && (() => {
                                  const signalPerformance = getSignalPerformance(coin);
                                  if (!signalPerformance) return null;

                                  return (
                                    <p
                                      style={{
                                        margin: "0 0 0 8px",
                                        fontSize: "0.85em",
                                        fontWeight: 600,
                                        color: signalPerformance.isProfit ? "#34a853" : "#ff6b6b",
                                      }}
                                    >
                                      {signalPerformance.isProfit ? "+" : "-"}${Math.abs(signalPerformance.profitLossDollars).toFixed(6)}
                                    </p>
                                  );
                                })()}
                              </div>

                              {coin.entryPrice && (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 8,
                                    fontSize: "0.9em",
                                    marginBottom: 8,
                                  }}
                                >
                                  <div>
                                    <span style={{ color: "#94a3b8" }}>Entry Price</span>
                                    <p style={{ margin: "2px 0 0 0", color: "#fff", fontWeight: 500 }}>
                                      {Number(coin.entryPrice).toFixed(6)} USDT
                                    </p>
                                  </div>
                                  {coin.stopLoss && (
                                    <div>
                                      <span style={{ color: "#94a3b8" }}>Stop Loss</span>
                                      <p style={{ margin: "2px 0 0 0", color: "#ff6b6b", fontWeight: 500 }}>
                                        {Number(coin.stopLoss).toFixed(6)} USDT
                                      </p>
                                    </div>
                                  )}
                                  {selectedCoinForPrice &&
                                  selectedCoinForPrice.exchange === coin.exchange &&
                                  selectedCoinForPrice.symbol === coin.symbol &&
                                  currentPrice !== null ? (
                                    <div>
                                      <span style={{ color: "#94a3b8" }}>Current Price</span>
                                      <p style={{ margin: "2px 0 0 0", color: "#34a853", fontWeight: 500 }}>
                                        {currentPrice.toFixed(6)} USDT
                                      </p>
                                    </div>
                                  ) : coin.targetPrice ? (
                                    <div>
                                      <span style={{ color: "#94a3b8" }}>Current Price</span>
                                      <p style={{ margin: "2px 0 0 0", color: "#94a3b8", fontWeight: 500 }}>
                                        {Number(coin.targetPrice).toFixed(6)} USDT
                                      </p>
                                    </div>
                                  ) : null}
                                  {coin.confidence && (
                                    <div>
                                      <span style={{ color: "#94a3b8" }}>Confidence</span>
                                      <p style={{ margin: "2px 0 0 0", color: "#fff", fontWeight: 500 }}>
                                        {Math.round(coin.confidence)}%
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(coin.tp1 || coin.tp2 || coin.tp3) && (
                                <div
                                  style={{
                                    padding: "8px",
                                    backgroundColor: "rgba(52, 168, 83, 0.05)",
                                    borderRadius: 4,
                                    fontSize: "0.9em",
                                  }}
                                >
                                  <p style={{ margin: 0, color: "#94a3b8", marginBottom: 4 }}>Take Profit Levels</p>
                                  <div style={{ display: "flex", gap: 12 }}>
                                    {coin.tp1 && (
                                      <span style={{ color: "#34a853" }}>
                                        TP1: {Number(coin.tp1).toFixed(6)}
                                      </span>
                                    )}
                                    {coin.tp2 && (
                                      <span style={{ color: "#34a853" }}>
                                        TP2: {Number(coin.tp2).toFixed(6)}
                                      </span>
                                    )}
                                    {coin.tp3 && (
                                      <span style={{ color: "#34a853" }}>
                                        TP3: {Number(coin.tp3).toFixed(6)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {coin.createdAt && (
                                <p style={{ margin: "8px 0 0 0", fontSize: "0.85em", color: "#64748b" }}>
                                  Added: {new Date(coin.createdAt).toLocaleString()}
                                </p>
                              )}

                              <button
                                type="button"
                                className={styles.logoutButton}
                                onClick={() => deleteCoinFromWatchlist(watchlist.id, coin)}
                                style={{ marginTop: 8, width: "100%", padding: "6px 12px", fontSize: "0.9em" }}
                              >
                                Remove from Watchlist
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
