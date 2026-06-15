"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "@/app/page.module.css";
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
const SCAN_MODES = ["top50", "top100", "top150", "top200"] as const;

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
    entry_quality_score?: { score: number };
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
  const isConfirmed = item.setup === "READY" || item.setup === "TRIGGERED" || signal.entry_confirmed === true;
  const isHighQuality = signal.entry_quality_score ? signal.entry_quality_score.score >= 65 : true;
  return isHighScore && isConfirmed && isHighQuality;
};

export function TelegramDispatchClient() {
  const [exchange, setExchange] = useState<(typeof EXCHANGES)[number]>("binance");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1h");
  const [scanMode, setScanMode] = useState<(typeof SCAN_MODES)[number]>("top50");
  const [signals, setSignals] = useState<TelegramSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [sendingSymbol, setSendingSymbol] = useState<string | null>(null);
  const [sentSymbols, setSentSymbols] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/market-structure-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange, timeframe, symbol: "BTCUSDT", scanMode }),
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

  const sendSignal = useCallback(async (item: TelegramSignal) => {
    const key = `${item.symbol}-${item.signal.action}-${item.setup}`;
    setSendingSymbol(key);
    setSendError(null);
    try {
      const response = await fetch("/api/admin/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: item.signal, setup: item.setup, exchange }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed to send");
      setSentSymbols((prev) => new Set(prev).add(key));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send to Telegram");
    } finally {
      setSendingSymbol(null);
    }
  }, [exchange]);

  return (
    <section className={styles.grid}>
      <div className={styles.card}>
        <h2>Telegram Signal Dispatch</h2>

        <label className={styles.label}>
          Exchange
          <select className={styles.input} value={exchange} onChange={(e) => setExchange(e.target.value as typeof exchange)}>
            {EXCHANGES.map((item) => (
              <option key={item} value={item}>{item.toUpperCase()}</option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Timeframe
          <select className={styles.input} value={timeframe} onChange={(e) => setTimeframe(e.target.value as typeof timeframe)}>
            {TIMEFRAMES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Coins to Scan
          <select className={styles.input} value={scanMode} onChange={(e) => setScanMode(e.target.value as typeof scanMode)}>
            <option value="top50">Top 50</option>
            <option value="top100">Top 100</option>
            <option value="top150">Top 150</option>
            <option value="top200">Top 200</option>
          </select>
        </label>

        <button type="button" className={styles.button} onClick={fetchSignals} disabled={loading}>
          {loading ? "Scanning..." : "Scan signals"}
        </button>

        <p className={styles.helperRow}>
          Ready signals: {telegramSignals.length}{lastUpdated ? ` | Updated ${new Date(lastUpdated).toLocaleString("en-US")}` : ""}
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {sendError && <div className={styles.error}>{sendError}</div>}

        {!loading && !telegramSignals.length && !error && (
          <p className={styles.placeholder}>No signals are ready for Telegram dispatch yet.</p>
        )}
      </div>

      {telegramSignals.map((item) => {
        const key = `${item.symbol}-${item.signal.action}-${item.setup}`;
        const isSending = sendingSymbol === key;
        const isSent = sentSymbols.has(key);
        return (
          <div key={key} className={styles.card}>
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

            <div style={{ background: "rgba(15, 23, 42, 0.7)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <p className={styles.labelText}>Telegram message preview</p>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>
                {formatSignalMessage(item)}
              </pre>
            </div>

            <button
              type="button"
              className={styles.button}
              onClick={() => sendSignal(item)}
              disabled={isSending || isSent}
              style={isSent ? { opacity: 0.6, cursor: "not-allowed" } : {}}
            >
              {isSending ? "Sending..." : isSent ? "✅ Sent to Telegram" : "📤 Send to Telegram"}
            </button>
          </div>
        );
      })}
    </section>
  );
}
