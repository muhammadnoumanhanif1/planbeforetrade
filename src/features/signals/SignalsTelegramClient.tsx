"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/app/page.module.css";
import { Navigation } from "@/components/Navigation";
import { formatSignalMessage } from "@/lib/formatSignal";

const EXCHANGES = ["binance", "bitget", "mexc", "bybit"] as const;
const TIMEFRAMES = [
  "1min",
  "3min",
  "5min",
  "15min",
  "30min",
  "1h",
  "4h",
  "6h",
  "12h",
  "1day",
  "1week",
] as const;
const SCAN_MODES = ["top10", "top25", "top50", "top100"] as const;

type TelegramSignal = {
  symbol: string;
  setup: "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";
  signal: {
    symbol: string;
    action: "BUY" | "SELL" | "WAIT";
    trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
    entry_zone: [number, number] | null;
    stop_loss: number | null;
    tp1: number | null;
    tp2: number | null;
    tp3: number | null;
    ai_score: number;
    confidence: number;
    status: "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";
    entry_confirmed?: boolean;
    entry_confirmation?: {
      confirmed: boolean;
    };
    entry_quality_score?: {
      score: number;
    };
  };
};

type SignalResponse = {
  updatedAt: string;
  exchange: string;
  timeframe: string;
  signals: TelegramSignal[];
  error?: string;
};

const formatPrice = (value: number | null) =>
  value === null || !Number.isFinite(value) ? "-" : value.toLocaleString("en-US", { maximumFractionDigits: 6 });

const isTelegramReady = (item: TelegramSignal) => {
  const signal = item.signal;
  const aiScore = signal.ai_score ?? signal.confidence ?? 0;
  const isHighScore = aiScore >= 65;
  const isConfirmed =
    item.setup === "READY" ||
    item.setup === "TRIGGERED" ||
    signal.entry_confirmed === true ||
    signal.entry_confirmation?.confirmed === true;
  const isHighQuality = signal.entry_quality_score ? signal.entry_quality_score.score >= 65 : true;
  return isHighScore && isConfirmed && isHighQuality;
};

export function SignalsTelegramClient() {
  const [exchange, setExchange] = useState<(typeof EXCHANGES)[number]>("binance");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("3min");
  const [scanMode, setScanMode] = useState<(typeof SCAN_MODES)[number]>("top10");
  const [signals, setSignals] = useState<TelegramSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/market-structure-signals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exchange,
          timeframe,
          symbol: "BTCUSDT",
          scanMode,
        }),
        cache: "no-store",
      });
      const payload = (await response.json()) as SignalResponse;
      if (!response.ok) throw new Error(payload?.error || "Unable to load signals.");
      setSignals(payload.signals ?? []);
      setLastUpdated(payload.updatedAt || "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load signals.");
      setSignals([]);
      setLastUpdated("");
    } finally {
      setLoading(false);
    }
  }, [exchange, timeframe, scanMode]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const telegramSignals = useMemo(() => signals.filter(isTelegramReady), [signals]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>TELEGRAM SIGNAL FEED</h1>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Telegram-ready signals</h2>

            <label className={styles.label}>
              Exchange
              <select className={styles.input} value={exchange} onChange={(event) => setExchange(event.target.value as typeof exchange)}>
                {EXCHANGES.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Timeframe
              <select className={styles.input} value={timeframe} onChange={(event) => setTimeframe(event.target.value as typeof timeframe)}>
                {TIMEFRAMES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Coins to scan
              <select className={styles.input} value={scanMode} onChange={(event) => setScanMode(event.target.value as typeof scanMode)}>
                <option value="top10">Top 10</option>
                <option value="top25">Top 25</option>
                <option value="top50">Top 50</option>
                <option value="top100">Top 100</option>
              </select>
            </label>

            <button type="button" className={styles.button} onClick={fetchSignals} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh feed"}
            </button>

            <p className={styles.helperRow}>
              Ready signals: {telegramSignals.length} {lastUpdated ? `| Updated ${new Date(lastUpdated).toLocaleString("en-US")}` : ""}
            </p>

            {error && <div className={styles.error}>{error}</div>}

            {!loading && !telegramSignals.length && !error && (
              <p className={styles.placeholder}>No signals are ready for Telegram dispatch yet.</p>
            )}
          </div>

          {telegramSignals.map((item) => (
            <div key={`${item.symbol}-${item.signal.action}-${item.setup}`} className={styles.card}>
              <h3>
                {item.signal.symbol} · {item.signal.action} · {item.setup}
              </h3>
              <div className={styles.priceRow}>
                <div>
                  <p className={styles.labelText}>Entry zone</p>
                  <p className={styles.priceValue}>
                    {item.signal.entry_zone
                      ? `${formatPrice(item.signal.entry_zone[0])} - ${formatPrice(item.signal.entry_zone[1])}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className={styles.labelText}>Stop loss</p>
                  <p className={styles.priceValue}>{formatPrice(item.signal.stop_loss)}</p>
                </div>
              </div>

              <div className={styles.helperRow}>
                TP1: {formatPrice(item.signal.tp1)} | TP2: {formatPrice(item.signal.tp2)} | TP3: {formatPrice(item.signal.tp3)}
              </div>

              <div className={styles.helperRow}>
                AI Score: {item.signal.ai_score ?? item.signal.confidence ?? 0} | Trend: {item.signal.trend}
              </div>

              <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: 12, padding: 12 }}>
                <p className={styles.labelText}>Telegram message preview</p>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>
                  {formatSignalMessage(item)}
                </pre>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
