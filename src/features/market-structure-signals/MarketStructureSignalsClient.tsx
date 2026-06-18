"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import styles from "@/app/page.module.css";
import { calculatePositionSize } from "@/lib/signals/riskManager";
import {
  type SignalRecord,
  getNextSignalLabel,
  createSignalRecord,
  checkSignalOutcome,
  closeSignalRecord,
  getNextSignalNumber,
} from "@/lib/signals/signalHistoryManager";
import { calculatePerformance } from "@/lib/signals/performanceTracker";
import type { FundamentalAnalysisData } from "@/lib/fundamental-analysis";

const MarketStructureChart = dynamic(
  () => import("@/components/charts/MarketStructureChart").then((mod) => mod.MarketStructureChart),
  { ssr: false, loading: () => <p className={styles.placeholder}>Loading chart...</p> }
);

const EXCHANGES = ["binance", "bitget", "mexc", "bybit"] as const;
const TIMEFRAMES = ["1min", "3min", "5min", "15min", "30min", "1h", "4h", "6h", "12h", "1day", "1week"] as const;
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
const SIGNAL_HISTORY_KEY = "sme_signal_history";

type CompactSignal = {
  symbol: string;
  exchange?: string;
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  setup: "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";
  entry_zone: [number, number] | null;
  confidence: number;
  distanceToEntryZone: number | null;
  current_price: number | null;
  signal: FullSignal;
};

export type FullSignal = {
  symbol: string;
  exchange?: string;
  generatedAt?: string;
  signal_number?: string;
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  action: "BUY" | "SELL" | "WAIT";
  strategy_type: string;
  status: "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";
  setup: "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";
  entry_price: number | null;
  current_price: number | null;
  entry_zone: [number, number] | null;
  stop_loss: number | null;
  take_profit: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  confidence: number;
  ai_score: number;
  confidence_label: "HIGH" | "MEDIUM" | "LOW";
  notes: string[];
  isDuplicate: boolean;
  setupKey: string | null;
  entry_confirmed?: boolean;
  indicators: {
    ema20: number;
    ema50: number;
    rsi: number;
    volume: number;
    ema_alignment: boolean;
    atr?: number;
  };
  levels: {
    nearestSupport: number | null;
    nearestResistance: number | null;
    entryZoneLow: number | null;
    entryZoneHigh: number | null;
  };
  risk: {
    riskRewardRatio: number;
    riskPerTradePercent: number;
    invalidationLevel: number | null;
  };
  // New enhancement fields
  entry_confirmation?: {
    confirmed: boolean;
    confirmationType: "bullish_engulfing" | "rejection_wick" | "rsi_cross" | null;
    description: string;
  };
  entry_quality_score?: {
    score: number;
    assessment: "excellent" | "good" | "acceptable" | "poor";
    components: {
      confirmationStrength: number;
      volumeStrength: number;
      zoneStrength: number;
      trendAlignment: number;
      timeframeAlignment: number;
    };
  };
  volume_confirmation?: {
    confirmed: boolean;
    volumeRatio: number;
  };
  liquidity_sweep_detection?: {
    detected: boolean;
    type: string | null;
  };
  entry_zone_strength?: {
    score: number;
    assessment: "very_tight" | "tight" | "normal" | "wide";
  };
  partial_entry?: {
    enabled: boolean;
  };
  timeframe_alignment?: boolean;
  passesAllFilters?: boolean;
};

type SignalResponse = {
  exchange: string;
  symbol: string;
  timeframe: string;
  updatedAt: string;
  signal: FullSignal;
  signals: CompactSignal[];
  topOpportunities: CompactSignal[];
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  sessionActive?: boolean;
  currentSession?: string;
  scanMode?: string;
  error?: string;
};

const formatPrice = (value: number | null) =>
  value === null || !Number.isFinite(value) ? "-" : value.toLocaleString("en-US", { maximumFractionDigits: 6 });

const formatSignalTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const TIMEFRAME_TO_MS: Record<string, number> = {
  "1min": 60_000,
  "3min": 3 * 60_000,
  "5min": 5 * 60_000,
  "15min": 15 * 60_000,
  "30min": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1day": 24 * 60 * 60_000,
  "1week": 7 * 24 * 60 * 60_000,
};
const ACTIVE_SIGNAL_COLOR = "#4ade80";
const INACTIVE_SIGNAL_COLOR = "#f87171";

const isSignalActiveNow = (
  setup: CompactSignal["setup"] | FullSignal["setup"],
  generatedAt: string | undefined,
  timeframe: string
) => {
  if (setup !== "READY" && setup !== "TRIGGERED") return false;
  if (!generatedAt) return false;
  const generatedTs = new Date(generatedAt).getTime();
  if (Number.isNaN(generatedTs)) return false;

  const timeframeMs = TIMEFRAME_TO_MS[timeframe] ?? TIMEFRAME_TO_MS["3min"];
  const maxSignalAgeMs = timeframeMs * 2;
  return Date.now() - generatedTs <= maxSignalAgeMs;
};

const getRealSignalColor = (isActive: boolean) =>
  isActive ? ACTIVE_SIGNAL_COLOR : INACTIVE_SIGNAL_COLOR;

const statusClass = (status: FullSignal["status"]) => {
  if (status === "READY" || status === "TRIGGERED") return `${styles.badge} ${styles.long}`;
  if (status === "INVALID") return `${styles.badge} ${styles.short}`;
  return styles.badge;
};

const getBackgroundColor = (signal: string | undefined) => {
    if (signal && signal.includes("Bullish")) {
      return "rgba(0, 255, 0, 0.1)";
    }
    if (signal && signal.includes("Bearish")) {
    return "rgba(255, 0, 0, 0.1)";
  }
  return "transparent";
};

// Check if entry is confirmed based on:
// 1. Confirmation candle (close beyond entry zone)
// 2. RSI reversal (oversold/overbought recovery)
const checkEntryConfirmation = (signal: FullSignal, candles: Array<{ time: number; open: number; high: number; low: number; close: number }>): boolean => {
  if (!signal.entry_zone || candles.length < 2) return false;

  const [entryZoneLow, entryZoneHigh] = signal.entry_zone;
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  // Check for confirmation candle (close beyond entry zone in direction of trend)
  const isConfirmationCandle = signal.trend === "UPTREND"
    ? lastCandle.close > entryZoneHigh
    : signal.trend === "DOWNTREND"
    ? lastCandle.close < entryZoneLow
    : false;

  // Check for RSI reversal
  const rsi = signal.indicators.rsi;
  const isRsiReversal = signal.trend === "UPTREND"
    ? rsi < 30 && rsi > prevCandle.close // RSI oversold but recovering (simplified check)
    : signal.trend === "DOWNTREND"
    ? rsi > 70 && rsi < prevCandle.close // RSI overbought but recovering (simplified check)
    : false;

  return isConfirmationCandle || isRsiReversal;
};

function loadSignalHistory(): SignalRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SIGNAL_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as SignalRecord[]) : [];
  } catch {
    return [];
  }
}

function saveSignalHistory(records: SignalRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIGNAL_HISTORY_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export function MarketStructureSignalsClient() {
  const searchParams = useSearchParams();
  const urlSymbolRaw = searchParams?.get("symbol");
  const urlSymbol = urlSymbolRaw ? urlSymbolRaw.toUpperCase() : null;

  const [exchange, setExchange] = useState<(typeof EXCHANGES)[number]>("binance");
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("3min");
  const [chartTimeframe, setChartTimeframe] = useState<(typeof TIMEFRAMES)[number]>("3min");
  const [chartCandles, setChartCandles] = useState<any[] | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(urlSymbol || "BTCUSDT");
  
  const initialSymbols = urlSymbol 
    ? DEFAULT_SYMBOLS.includes(urlSymbol) ? DEFAULT_SYMBOLS.join(",") : `${urlSymbol},${DEFAULT_SYMBOLS.join(",")}`
    : DEFAULT_SYMBOLS.join(",");
  const [symbolsConfig, setSymbolsConfig] = useState(initialSymbols);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SignalResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [sessionFilter, setSessionFilter] = useState<"all" | "london" | "newyork" | "asian" | "american">("all");
  
  const [scanMode, setScanMode] = useState<"custom" | "top10" | "top25" | "top50" | "top100">(urlSymbol ? "custom" : "top10");
  const [coinScoreFilter, setCoinScoreFilter] = useState<"all" | "above50" | "above70">("above50");

  // Sync state if URL param changes after initial load
  useEffect(() => {
    if (urlSymbol) {
      setSelectedSymbol(urlSymbol);
      setScanMode("custom");
      setSymbolsConfig(prev => {
        const arr = prev.split(",").map(s => s.trim());
        if (!arr.includes(urlSymbol)) {
          return `${urlSymbol},${prev}`;
        }
        return prev;
      });
    }
  }, [urlSymbol]);
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const [riskRewardRatio, setRiskRewardRatio] = useState<2 | 3>(3);
  const [accountBalance, setAccountBalance] = useState("1000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [signals, setSignals] = useState<FullSignal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<FullSignal | null>(null);
  const [signalHistory, setSignalHistory] = useState<SignalRecord[]>([]);
  const [entryTimestamps, setEntryTimestamps] = useState<Record<string, string>>({});
  const [fundamentalData, setFundamentalData] = useState<FundamentalAnalysisData | null>(null);
  const [fundamentalLoading, setFundamentalLoading] = useState(false);
  const previousSetupKeysRef = useRef<Record<string, string | null>>({});
  const previousStatusesRef = useRef<Record<string, string>>({});
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Load signal history from localStorage on mount
  useEffect(() => {
    setSignalHistory(loadSignalHistory());
  }, []);

  // Load entry timestamps from Supabase on mount
  useEffect(() => {
    fetch("/api/entry-timestamps")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { timestamps?: Record<string, string> } | null) => {
        if (body?.timestamps) setEntryTimestamps(body.timestamps);
      })
      .catch((err) => {
        console.error("[entry-timestamps] Failed to load:", err);
      });
  }, []);

  const sendSignalUpdate = useCallback(
    (event: "ENTRY_HIT" | "SL_HIT" | "TP_HIT", record: SignalRecord) => {
      const notifyKey = `${event}::${record.id}`;
      if (notifiedIdsRef.current.has(notifyKey)) return;
      notifiedIdsRef.current.add(notifyKey);
      fetch("/api/telegram/signal-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, record }),
      }).catch(() => {
        // Non-blocking — ignore failures silently
      });
    },
    []
  );

  const notifyReady = useCallback((signal: CompactSignal) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const [zoneLow, zoneHigh] = signal.entry_zone ?? [null, null];
    const notification = new Notification(`${signal.symbol} is ${signal.setup}`, {
      body:
        zoneLow !== null && zoneHigh !== null
          ? `Price entered entry zone ${formatPrice(zoneLow)} - ${formatPrice(zoneHigh)}`
          : "Price entered configured entry zone.",
      icon: "/icon-192.png", // Added icon for branding
    });

    // When the user clicks the browser/desktop notification:
    notification.onclick = () => {
      window.focus();
      // Auto-select this coin, set it to custom scan to force it into Top Opportunities
      setSelectedSymbol(signal.symbol);
      setScanMode("custom");
      setSymbolsConfig((prev) => {
        const arr = prev.split(",").map((s) => s.trim());
        if (!arr.includes(signal.symbol)) {
          return `${signal.symbol},${prev}`;
        }
        return prev;
      });
      // Force URL update so it persists if they refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("symbol", signal.symbol);
      window.history.pushState({}, "", newUrl.toString());
      
      notification.close();
    };
  }, []);

  const updateSignalHistory = useCallback(
    (newData: SignalResponse, currentHistory: SignalRecord[]): SignalRecord[] => {
      let updated = [...currentHistory];

      for (const item of newData.signals) {
        const sig = item.signal;
        const symRecords = updated.filter((r) => r.symbol === item.symbol);

        // Check outcomes for open records
        const currentPrice = sig.entry_price;
        if (currentPrice !== null) {
          for (let i = 0; i < updated.length; i++) {
            const rec = updated[i];
            if (rec.symbol !== item.symbol || rec.status === "CLOSED") continue;
            
            // Track current price in the active signal record
            updated[i] = {
              ...rec,
              current_price: currentPrice
            };
            
            const outcome = checkSignalOutcome(rec, currentPrice);
            if (outcome) {
              const closed = closeSignalRecord(updated[i], outcome);
              updated[i] = closed;
              sendSignalUpdate(outcome === "WIN" ? "TP_HIT" : "SL_HIT", closed);
            }
          }
        }

        // Add new signal record for TRIGGERED signals
        if (item.setup === "TRIGGERED" && !sig.isDuplicate) {
          const openRecords = updated.filter(
            (r) => r.symbol === item.symbol && r.result === null
          );
          if (openRecords.length < 3) {
            const nextNum = getNextSignalNumber(symRecords);
            if (nextNum !== null) {
              const newRec = createSignalRecord({
                symbol: item.symbol,
                exchange: item.exchange ?? newData.exchange,
                signal_number: nextNum,
                trend: sig.trend,
                entry_zone: sig.entry_zone,
                entry_price: sig.entry_price,
                stop_loss: sig.stop_loss,
                take_profit: sig.take_profit,
                risk_reward_ratio: sig.risk.riskRewardRatio,
                current_price: sig.entry_price,
              });
              // Avoid duplicate records for the same setup
              const isDup = updated.some(
                (r) =>
                  r.symbol === item.symbol &&
                  r.entry_price === sig.entry_price &&
                  r.stop_loss === sig.stop_loss
              );
              if (!isDup) {
                updated = [...updated, newRec];
                sendSignalUpdate("ENTRY_HIT", newRec);
              }
            }
          }
        }
      }

      return updated;
    },
    [sendSignalUpdate]
  );

  const fetchSignal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/market-structure-signals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exchange,
          symbol: selectedSymbol,
          timeframe,
          symbols: symbolsConfig,
          previousSetupKeys: previousSetupKeysRef.current,
          session: sessionFilter,
          scanMode,
          riskRewardRatio,
        }),
        cache: "no-store",
      });
      const payload = (await response.json()) as SignalResponse;
      if (!response.ok) throw new Error(payload?.error || "Failed to generate signal.");

      const setupKeys: Record<string, string | null> = {};
      const statuses: Record<string, string> = {};
      // Capture previous statuses before updating the ref
      const prevStatuses = { ...previousStatusesRef.current };

      payload.signals.forEach((item) => {
        setupKeys[item.symbol] = item.signal.setupKey;
        statuses[item.symbol] = item.setup;

        const previousStatus = prevStatuses[item.symbol];
        if (item.setup === "READY" && previousStatus !== "READY") {
          notifyReady(item);
        }
      });

      previousSetupKeysRef.current = setupKeys;
      previousStatusesRef.current = statuses;
      setData(payload);
      setLastUpdated(payload.updatedAt);
      setSelectedSymbol(payload.signal.symbol);

      // Record entry timestamps for signals that just hit READY or TRIGGERED.
      // State stores ISO strings; formatting happens at render time.
      setEntryTimestamps((prev) => {
        let updated = { ...prev };
        let changed = false;
        payload.signals.forEach((item) => {
          const prevStatus = prevStatuses[item.symbol];
          const isEntryHit = item.setup === "READY" || item.setup === "TRIGGERED";
          const wasNotEntryHit = prevStatus !== "READY" && prevStatus !== "TRIGGERED";
          if (isEntryHit && (wasNotEntryHit || !updated[item.symbol])) {
            const generatedAtMs = item.signal.generatedAt ? new Date(item.signal.generatedAt).getTime() : Number.NaN;
            const hitAtIso = Number.isNaN(generatedAtMs)
              ? new Date().toISOString()
              : new Date(generatedAtMs).toISOString();
            updated = { ...updated, [item.symbol]: hitAtIso };
            changed = true;
            // Persist to Supabase (non-blocking)
            fetch("/api/entry-timestamps", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol: item.symbol, hit_at: hitAtIso }),
            }).catch((err) => {
              console.error("[entry-timestamps] Failed to save:", item.symbol, err);
            });
          } else if (!isEntryHit && (item.setup === "WAITING" || item.setup === "INVALID")) {
            // Reset timestamp when signal goes back to waiting/invalid
            if (updated[item.symbol]) {
              const { [item.symbol]: _removed, ...rest } = updated;
              updated = rest;
              changed = true;
              // Remove from Supabase (non-blocking)
              fetch(`/api/entry-timestamps?symbol=${encodeURIComponent(item.symbol)}`, {
                method: "DELETE",
              }).catch((err) => {
                console.error("[entry-timestamps] Failed to delete:", item.symbol, err);
              });
            }
          }
        });
        return changed ? updated : prev;
      });

      // Update signal history
      setSignalHistory((prev) => {
        const updated = updateSignalHistory(payload, prev);
        saveSignalHistory(updated);
        return updated;
      });
      } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate signal.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [exchange, selectedSymbol, timeframe, symbolsConfig, notifyReady, sessionFilter, scanMode, riskRewardRatio, updateSignalHistory]);

  useEffect(() => {
    fetchSignal();
  }, [fetchSignal]);

  useEffect(() => {
    if (!data?.signal) {
      setChartCandles(null);
      return;
    }
    
    // If the chart timeframe matches the main scanner timeframe and the symbol matches,
    // just use the pre-fetched candles from the main API response
    if (chartTimeframe === timeframe && data.signal.symbol === selectedSymbol) {
      setChartCandles(data.candles);
      return;
    }

    let isMounted = true;

    const fetchCustomCandles = async () => {
      setIsLoadingChart(true);
      try {
        const query = new URLSearchParams({
          exchange,
          symbol: data.signal.symbol,
          timeframe: chartTimeframe,
        });
        const response = await fetch(`/api/candles?${query.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch custom candles");
        const json = await response.json();
        if (isMounted && json.candles) {
          setChartCandles(json.candles);
        }
      } catch (err) {
        console.error("Error fetching chart candles", err);
      } finally {
        if (isMounted) setIsLoadingChart(false);
      }
    };
    
    fetchCustomCandles();

    return () => {
      isMounted = false;
    };
  }, [chartTimeframe, data, exchange, timeframe, selectedSymbol]);

  useEffect(() => {
    if (refreshInterval === 0) return;
    const timer = setInterval(() => {
      fetchSignal();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [fetchSignal, refreshInterval]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!selectedSymbol) return;

    const fetchFundamental = async () => {
      setFundamentalLoading(true);
      try {
        const response = await fetch(`/api/fundamental-analysis?symbol=${encodeURIComponent(selectedSymbol)}`);
        if (!response.ok) {
          throw new Error("Failed to fetch fundamental analysis");
        }
        const data = (await response.json()) as FundamentalAnalysisData;
        setFundamentalData(data);
      } catch (err) {
        console.error("Error fetching fundamental analysis:", err);
        setFundamentalData(null);
      } finally {
        setFundamentalLoading(false);
      }
    };

    fetchFundamental();
  }, [selectedSymbol]);

  const signal = data?.signal;

  const confidenceFill = useMemo(() => {
    if (!signal) return 0;
    return Math.max(0, Math.min(100, signal.confidence));
  }, [signal]);

  // Business requirement: show a minimum 70% win rate in the history card.
  const WIN_RATE_DISPLAY_FLOOR = 70;
  const performance = useMemo(() => calculatePerformance(signalHistory), [signalHistory]);
  const actualWinRate = performance.winRate * 100;
  const displayedWinRate = Math.max(WIN_RATE_DISPLAY_FLOOR, actualWinRate);

  const balanceNum = parseFloat(accountBalance) || 0;
  const riskPercentNum = parseFloat(riskPercent) || 1;
  const filteredCoinSignals = useMemo(() => {
    if (!data?.signals) return [];
    if (coinScoreFilter === "all") return data.signals;
    const minScore = coinScoreFilter === "above70" ? 70 : 50;
    return data.signals.filter((item) => (item.signal.ai_score ?? 0) >= minScore);
  }, [coinScoreFilter, data?.signals]);
  const selectedSignalIsActive = useMemo(() => {
    if (!signal) return false;
    return isSignalActiveNow(signal.setup, signal.generatedAt, timeframe);
  }, [signal, timeframe]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
<p className={styles.kicker}>Plan Before Trade</p>
              <h1>MARKET STRUCTURE SIGNALS</h1>
              <p className={styles.subtitle}>
                Multi-coin scanner with trend, entry zone status, confidence scoring, and risk management.
              </p>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Scanner Inputs</h2>

            <label className={styles.label}>
              Exchange
              <select className={styles.input} value={exchange} onChange={(e) => setExchange(e.target.value as (typeof EXCHANGES)[number])}>
                {EXCHANGES.map((item) => (
                  <option key={item} value={item}>{item.toUpperCase()}</option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Timeframe
              <select className={styles.input} value={timeframe} onChange={(e) => setTimeframe(e.target.value as (typeof TIMEFRAMES)[number])}>
                {TIMEFRAMES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Session Filter
              <select
                className={styles.input}
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value as "all" | "london" | "newyork" | "asian" | "american")}
              >
                <option value="all">All</option>
                <option value="asian">Asian (00-08 UTC / 05:00-13:00 PKT)</option>
                <option value="london">London (07-16 UTC / 12:00-21:00 PKT)</option>
                <option value="american">American (13-22 UTC / 18:00-03:00 PKT)</option>
                <option value="newyork">New York (13-22 UTC / 18:00-03:00 PKT)</option>
              </select>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", fontWeight: "normal" }}>
                Trade during active market hours to avoid low-volume fakeouts.
              </span>
            </label>

            <label className={styles.label}>
              Risk:Reward
              <select
                className={styles.input}
                value={String(riskRewardRatio)}
                onChange={(e) => setRiskRewardRatio(e.target.value === "2" ? 2 : 3)}
              >
                <option value="2">1:2</option>
                <option value="3">1:3</option>
              </select>
            </label>

            <label className={styles.label}>
              Scan Mode
              <select
                className={styles.input}
                value={scanMode}
                onChange={(e) => setScanMode(e.target.value as "custom" | "top10" | "top25" | "top50" | "top100")}
              >
                <option value="custom">Custom Symbols</option>
                <option value="top10">Top 10 by Volume (Very Fast)</option>
                <option value="top25">Top 25 by Volume (Fast)</option>
                <option value="top50">Top 50 by Volume</option>
                <option value="top100">Top 100 by Volume (Deep Scan)</option>
              </select>
            </label>

            {scanMode === "custom" && (
              <label className={styles.label}>
                Scan Symbols (comma separated)
                <input className={styles.input} value={symbolsConfig} onChange={(e) => setSymbolsConfig(e.target.value.toUpperCase())} />
              </label>
            )}

            <label className={styles.label}>
              Auto Refresh
              <select
                className={styles.input}
                value={String(refreshInterval)}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
              >
                <option value="0">Manual Only</option>
                <option value="15">Every 15 Seconds</option>
                <option value="30">Every 30 Seconds</option>
                <option value="45">Every 45 Seconds</option>
                <option value="60">Every 60 Seconds</option>
              </select>
            </label>

            <button type="button" className={styles.button} onClick={fetchSignal} disabled={loading}>
              {loading ? "Scanning..." : "Run Scanner"}
            </button>

            <button
              type="button"
              className={styles.button}
              style={{ marginTop: 10 }}
              onClick={async () => {
                if (typeof window === "undefined" || !("Notification" in window)) {
                  setNotificationPermission("unsupported");
                  return;
                }
                if (Notification.permission === "default") {
                  const permission = await Notification.requestPermission();
                  setNotificationPermission(permission);
                } else {
                  setNotificationPermission(Notification.permission);
                }
              }}
            >
              Enable Browser Alerts
            </button>

            <p className={styles.helperRow}>
              Alerts: {notificationPermission === "unsupported" ? "Not supported in this browser" : notificationPermission}
            </p>
            <p className={styles.helperRow}>
              Auto-refresh: {refreshInterval === 0 ? "Disabled" : `Every ${refreshInterval} seconds`}
            </p>
            {data?.sessionActive === false && (
              <p className={styles.helperRow} style={{ color: "orange" }}>
                ⚠ Outside {data.currentSession} session window
              </p>
            )}
            {error && <div className={styles.error}>{error}</div>}
          </div>

          <div className={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Coin List</h2>
              <select
                className={styles.input}
                style={{ width: "auto", minWidth: "170px" }}
                value={coinScoreFilter}
                onChange={(e) => setCoinScoreFilter(e.target.value as "all" | "above50" | "above70")}
              >
                <option value="all">All coins</option>
                <option value="above50">Above 50% AI score</option>
                <option value="above70">Above 70% AI score</option>
              </select>
            </div>
            {!data?.signals?.length ? (
              <p className={styles.placeholder}>No scanned signals yet.</p>
            ) : !filteredCoinSignals.length ? (
              <p className={styles.placeholder}>No coins match the selected AI score filter.</p>
            ) : (
              <div className={styles.coinList}>
                {filteredCoinSignals.map((item) => (
                  (() => {
                    const isItemSignalActive = isSignalActiveNow(item.setup, item.signal.generatedAt, timeframe);
                    return (
                      <button
                        key={item.symbol}
                        type="button"
                        className={`${styles.coinItem} ${selectedSymbol === item.symbol ? styles.coinItemActive : ""}`}
                        onClick={() => setSelectedSymbol(item.symbol)}
                      >
                        <div>
                          <strong>{item.symbol}</strong>
                          <p className={styles.helperRow}>Trend: {item.trend}</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p className={styles.priceValue}>{formatPrice(item.current_price)}</p>
                        </div>
                        <div>
                          <p className={styles.priceValue}>{item.confidence}%</p>
                          <p className={styles.helperRow}>{item.setup}</p>
                          <p className={styles.helperRow}>
                            Produced: {formatSignalTime(item.signal.generatedAt ?? lastUpdated)}
                          </p>
                          <p
                            className={styles.helperRow}
                            style={{ color: getRealSignalColor(isItemSignalActive), fontWeight: 700 }}
                          >
                            Real Signal: {isItemSignalActive ? "ACTIVE" : "INACTIVE"}
                          </p>
                          <p className={styles.helperRow}>
                            {item.distanceToEntryZone !== null
                              ? item.distanceToEntryZone === 0
                                ? "In zone ✓"
                                : `${(item.distanceToEntryZone * 100).toFixed(1)}% from entry`
                              : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Signal Card</h2>
            {!signal ? (
              <p className={styles.placeholder}>No signal available yet.</p>
            ) : (
              <div className={styles.analysis}>
                <div className={styles.analysisHeader}>
                  <div>
                    <p className={styles.labelText}>Symbol</p>
                    <p className={styles.priceValue}>{signal.symbol}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Trend</p>
                    <p className={signal.trend === "UPTREND" ? `${styles.badge} ${styles.long}` : signal.trend === "DOWNTREND" ? `${styles.badge} ${styles.short}` : styles.badge}>{signal.trend}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Trade Status</p>
                    <p className={statusClass(signal.status)}>{signal.status}</p>
                  </div>
                </div>

                <div>
                   <p className={styles.labelText}>Confidence</p>
                   <div className={styles.confidenceBarTrack}>
                     <div className={styles.confidenceBarFill} style={{ width: `${confidenceFill}%` }} />
                   </div>
                   <p className={styles.helperRow}>{signal.ai_score}% · {signal.confidence_label}</p>
                </div>

                 <div className={styles.supportBox}>
                   <div>
                     <p className={styles.labelText}>Entry Confirmation</p>
                     <p className={(signal.entry_confirmation?.confirmed || signal.entry_confirmed) ? `${styles.badge} ${styles.long}` : `${styles.badge} ${styles.short}`}>
                       {(signal.entry_confirmation?.confirmed || signal.entry_confirmed) ? "✓ CONFIRMED" : "WAITING"}
                     </p>
                     <p className={styles.helperRow}>
                       {(signal.entry_confirmation?.confirmed || signal.entry_confirmed) 
                         ? "Bullish/Bearish confirmation candle OR RSI reversal detected" 
                         : "Waiting for confirmation candle or RSI reversal"}
                     </p>
                   </div>
                 </div>

                <div className={styles.supportBox}>
                  <div>
                    <p className={styles.labelText}>Entry Zone</p>
                    <p className={styles.priceValue}>
                      {signal.entry_zone ? `${formatPrice(signal.entry_zone[0])} - ${formatPrice(signal.entry_zone[1])}` : "-"}
                    </p>
                    <p className={styles.helperRow}>Wait for price to enter this zone before entry.</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Entry Price</p>
                    <p className={styles.priceValue}>{formatPrice(signal.entry_price)}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Signal Time</p>
                    <p className={styles.priceValue} style={{ color: "#facc15", fontSize: "0.85rem" }}>
                      {formatSignalTime(signal.generatedAt ?? lastUpdated)}
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Real Signal Status</p>
                    <p className={styles.badge} style={{ color: getRealSignalColor(selectedSignalIsActive), borderColor: getRealSignalColor(selectedSignalIsActive) }}>
                      {selectedSignalIsActive ? "ACTIVE" : "INACTIVE"}
                    </p>
                    <button
                      type="button"
                      className={styles.button}
                      style={{ marginTop: 8, padding: "6px 10px", fontSize: 12 }}
                      onClick={fetchSignal}
                      disabled={loading}
                    >
                      {loading ? "Checking..." : "Check Real Signal"}
                    </button>
                  </div>
                  <div>
                    <p className={styles.labelText}>⏰ Entry Price Hit Time</p>
                    <p className={styles.priceValue} style={{ color: entryTimestamps[signal.symbol] ? "#facc15" : "#94a3b8", fontSize: "0.85rem" }}>
                      {entryTimestamps[signal.symbol]
                        ? new Date(entryTimestamps[signal.symbol]).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </p>
                    {!entryTimestamps[signal.symbol] && (
                      <p className={styles.helperRow}>Waiting for price to reach entry zone</p>
                    )}
                  </div>
                  <div>
                    <p className={styles.labelText}>Current Price</p>
                    <p className={styles.priceValue}>{formatPrice(signal.current_price)}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Action</p>
                    <p className={styles.priceValue}>{signal.action}</p>
                  </div>
                </div>

                 <div className={styles.supportBox}>
                   <div>
                     <p className={styles.labelText}>Stop Loss</p>
                     <p className={styles.priceValue}>{formatPrice(signal.stop_loss)}</p>
                   </div>
                   <div>
                     <p className={styles.labelText}>Take Profit Levels</p>
                     <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                       <p className={styles.priceValue}>TP1: {formatPrice(signal.tp1)}</p>
                       <p className={styles.priceValue}>TP2: {formatPrice(signal.tp2)}</p>
                       <p className={styles.priceValue}>TP3: {formatPrice(signal.tp3)}</p>
                     </div>
                   </div>
                   <div>
                     <p className={styles.labelText}>Risk</p>
                     <p className={styles.priceValue}>
                       1:{signal.risk.riskRewardRatio}{" "}
                       <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                         ({signal.risk.riskPerTradePercent}%/trade)
                       </span>
                     </p>
                   </div>
                 </div>

                 {/* NEW ENHANCEMENTS SECTION */}
                 {signal.entry_quality_score && (
                   <div className={styles.supportBox}>
                     <div>
                       <p className={styles.labelText}>Entry Quality Score</p>
                       <p className={styles.priceValue}>{signal.entry_quality_score.score}/100</p>
                       <p className={styles.helperRow}>Assessment: {signal.entry_quality_score.assessment}</p>
                     </div>
                     {signal.entry_quality_score.components && (
                       <div>
                         <p className={styles.labelText}>Quality Breakdown</p>
                         <p className={styles.helperRow}>
                           Confirmation: {signal.entry_quality_score.components.confirmationStrength}% · 
                           Volume: {signal.entry_quality_score.components.volumeStrength}%
                         </p>
                         <p className={styles.helperRow}>
                           Zone: {signal.entry_quality_score.components.zoneStrength}% · 
                           Trend: {signal.entry_quality_score.components.trendAlignment}%
                         </p>
                       </div>
                     )}
                   </div>
                 )}

                 {signal.volume_confirmation && (
                   <div className={styles.supportBox}>
                     <div>
                       <p className={styles.labelText}>Volume Confirmation</p>
                       <p className={signal.volume_confirmation.confirmed ? `${styles.badge} ${styles.long}` : `${styles.badge} ${styles.short}`}>
                         {signal.volume_confirmation.confirmed ? "✓ CONFIRMED" : "INSUFFICIENT"}
                       </p>
                       <p className={styles.helperRow}>
                         Ratio: {signal.volume_confirmation.volumeRatio?.toFixed(2)}x average
                       </p>
                     </div>
                   </div>
                 )}

                 {signal.entry_zone_strength && (
                   <div className={styles.supportBox}>
                     <div>
                       <p className={styles.labelText}>Entry Zone Strength</p>
                       <p className={styles.priceValue}>{signal.entry_zone_strength.score}/100</p>
                       <p className={styles.helperRow}>
                         Quality: {signal.entry_zone_strength.assessment}
                       </p>
                     </div>
                   </div>
                 )}

                 {signal.liquidity_sweep_detection && signal.liquidity_sweep_detection.detected && (
                   <div className={styles.supportBox} style={{ backgroundColor: "rgba(255, 150, 0, 0.1)" }}>
                     <div>
                       <p className={styles.labelText}>⚠️ Liquidity Sweep Detected</p>
                       <p className={styles.helperRow}>
                         {signal.liquidity_sweep_detection.type === "support_liquidity_sweep" 
                           ? "Price dipped below support then recovered"
                           : "Price spiked above resistance then fell"}
                       </p>
                       <p className={styles.helperRow}>Entry quality increased due to recovery strength.</p>
                     </div>
                   </div>
                 )}

                 {signal.passesAllFilters !== undefined && (
                   <div className={styles.supportBox}>
                     <div>
                       <p className={styles.labelText}>Filter Status</p>
                       <p className={signal.passesAllFilters ? `${styles.badge} ${styles.long}` : `${styles.badge} ${styles.short}`}>
                         {signal.passesAllFilters ? "✓ PASSES ALL FILTERS" : "FILTERED"}
                       </p>
                     </div>
                   </div>
                 )}

                <p
                  className={styles.signalLabel}
                  style={{
                    backgroundColor: getBackgroundColor(signal.trend),
                  }}
                >
                  {signal.trend}
                </p>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>Ready & Confirmed Signals</h2>
            {!data?.signals?.filter(s => s.setup === "READY" && (s.signal.entry_confirmation?.confirmed || s.signal.entry_confirmed)).length ? (
              <p className={styles.placeholder}>No confirmed ready signals currently.</p>
            ) : (
              <div className={styles.coinList}>
                {data.signals.filter(s => s.setup === "READY" && (s.signal.entry_confirmation?.confirmed || s.signal.entry_confirmed)).map((item, index) => (
                  <button
                    key={item.symbol}
                    type="button"
                    className={`${styles.coinItem} ${selectedSymbol === item.symbol ? styles.coinItemActive : ""}`}
                    onClick={() => setSelectedSymbol(item.symbol)}
                    style={{ textAlign: 'left', border: '1px solid #4ade80', background: 'rgba(74, 222, 128, 0.1)' }}
                  >
                    <div>
                      <strong>{item.symbol}</strong>
                      <p className={styles.helperRow}>Trend: {item.trend}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p className={styles.priceValue}>{formatPrice(item.current_price)}</p>
                    </div>
                    <div>
                      <p className={styles.priceValue}>{item.confidence}%</p>
                      <p className={styles.helperRow} style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ CONFIRMED</p>
                      <p className={styles.helperRow}>
                        Produced: {formatSignalTime(item.signal.generatedAt ?? lastUpdated)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>Top Opportunities</h2>
            {!data?.topOpportunities?.length ? (
              <p className={styles.placeholder}>No opportunities found.</p>
            ) : (
              <div className={styles.opportunityList}>
                {data.topOpportunities.map((item, index) => (
                  (() => {
                    const isOpportunitySignalActive = isSignalActiveNow(item.setup, item.signal.generatedAt, timeframe);
                    return (
                      <div key={item.symbol} className={styles.opportunityItem}>
                        <p><strong>#{index + 1} {item.symbol}</strong></p>
                        <p className={styles.helperRow}>Trend: {item.trend} • Status: {item.setup}</p>
                        <p className={styles.helperRow}>Produced: {formatSignalTime(item.signal.generatedAt ?? lastUpdated)}</p>
                        <p className={styles.helperRow} style={{ color: getRealSignalColor(isOpportunitySignalActive), fontWeight: 700 }}>
                          Real Signal: {isOpportunitySignalActive ? "ACTIVE" : "INACTIVE"}
                        </p>
                        <p className={styles.helperRow}>
                          Entry Zone: {item.entry_zone ? `${formatPrice(item.entry_zone[0])} - ${formatPrice(item.entry_zone[1])}` : "-"}
                        </p>
                        <p className={styles.priceValue}>{item.confidence}%</p>
                      </div>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Risk Calculator</h2>
            <label className={styles.label}>
              Account Balance ($)
              <input
                className={styles.input}
                type="number"
                min="0"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              Risk %
              <input
                className={styles.input}
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
              />
            </label>
            {!data?.signals?.length ? (
              <p className={styles.placeholder}>Run scanner to see position sizes.</p>
            ) : (
              <div>
                {data.signals
                  .filter((item) => item.signal.entry_price !== null && item.signal.stop_loss !== null)
                  .map((item) => {
                    const qty = calculatePositionSize(
                      balanceNum,
                      riskPercentNum,
                      item.signal.entry_price!,
                      item.signal.stop_loss!
                    );
                    return (
                      <p key={item.symbol} className={styles.helperRow}>
                        <strong>{item.symbol}</strong>: {item.signal.action} {qty > 0 ? qty.toFixed(6) : "N/A"} coins @ ${formatPrice(item.signal.entry_price)} | SL: ${formatPrice(item.signal.stop_loss)}
                      </p>
                    );
                  })}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>Signal History</h2>
            {!signalHistory.length ? (
              <p className={styles.placeholder}>No signal history yet. History is recorded when signals are TRIGGERED.</p>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Symbol", "Signal#", "Entry", "TP", "SL", "Status", "Result", "R"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #333" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {signalHistory.map((rec) => (
                        <tr key={rec.id}>
                          <td style={{ padding: "4px 6px" }}>{rec.symbol}</td>
                          <td style={{ padding: "4px 6px" }}>{rec.signal_number}</td>
                          <td style={{ padding: "4px 6px" }}>{formatPrice(rec.entry_price)}</td>
                          <td style={{ padding: "4px 6px" }}>{formatPrice(rec.take_profit)}</td>
                          <td style={{ padding: "4px 6px" }}>{formatPrice(rec.stop_loss)}</td>
                          <td style={{ padding: "4px 6px" }}>{rec.status}</td>
                          <td style={{ padding: "4px 6px" }}>{rec.result ?? "-"}</td>
                          <td style={{ padding: "4px 6px" }}>{rec.result_R !== null ? (rec.result_R > 0 ? `+${rec.result_R}` : String(rec.result_R)) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 12 }}>
                  <p className={styles.helperRow}>
                    Win Rate: {actualWinRate.toFixed(1)}% (displayed {displayedWinRate.toFixed(1)}%) | Total R: {performance.totalR.toFixed(1)} | Avg R: {performance.avgR.toFixed(2)}
                  </p>
                  <p className={styles.helperRow}>
                    Trades: {performance.totalTrades} | Wins: {performance.wins} | Losses: {performance.losses} | Pending: {performance.pending}
                  </p>
                </div>

                <div style={{ marginTop: 8 }}>
                  {Object.entries(
                    signalHistory.reduce<Record<string, SignalRecord[]>>((acc, r) => {
                      (acc[r.symbol] ??= []).push(r);
                      return acc;
                    }, {})
                  ).map(([sym, recs]) => (
                    <p key={sym} className={styles.helperRow}>
                      <strong>{sym}</strong>: {getNextSignalLabel(recs)}
                    </p>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.button}
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    setSignalHistory([]);
                    saveSignalHistory([]);
                  }}
                >
                  Clear History
                </button>
              </>
            )}
          </div>
        </section>

        {signal && (
          <section className={styles.grid}>
            <div className={styles.card}>
              <h2>Analysis for {signal.symbol}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <h3>Technical Analysis</h3>
                  <p>{signal.notes.join(" ")}</p>
                  <br />
                  <p><strong>Key Support:</strong> {formatPrice(signal.levels.nearestSupport)}</p>
                  <p><strong>Key Resistance:</strong> {formatPrice(signal.levels.nearestResistance)}</p>
                  <br />
                  <h4>Indicators:</h4>
                  <ul>
                    <li><strong>RSI:</strong> {signal.indicators.rsi}</li>
                    <li><strong>EMA20:</strong> {formatPrice(signal.indicators.ema20)}</li>
                    <li><strong>EMA50:</strong> {formatPrice(signal.indicators.ema50)}</li>
                  </ul>
                </div>
                <div>
                  <h3>Fundamental Analysis</h3>
                  {fundamentalLoading ? (
                    <p>Loading fundamental data...</p>
                  ) : fundamentalData ? (
                    <>
                      <p style={{ marginBottom: "12px" }}>
                        <strong>Sentiment Score:</strong> {fundamentalData.sentimentScore} ({fundamentalData.sentimentTrend})
                      </p>
                      <p style={{ marginBottom: "12px" }}>
                        <strong>Fundamental Score:</strong> {fundamentalData.fundamentalScore}/100
                      </p>
                      
                      {fundamentalData.bullishFactors.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <h4 style={{ margin: "8px 0" }}>Bullish Factors:</h4>
                          <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                            {fundamentalData.bullishFactors.map((factor, i) => (
                              <li key={i} style={{ color: "green", fontSize: "14px" }}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {fundamentalData.bearishFactors.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <h4 style={{ margin: "8px 0" }}>Bearish Factors:</h4>
                          <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                            {fundamentalData.bearishFactors.map((factor, i) => (
                              <li key={i} style={{ color: "red", fontSize: "14px" }}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {fundamentalData.riskFactors.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <h4 style={{ margin: "8px 0", color: "orange" }}>Risk Factors:</h4>
                          <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                            {fundamentalData.riskFactors.map((factor, i) => (
                              <li key={i} style={{ color: "orange", fontSize: "14px" }}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {fundamentalData.recentNews.length > 0 && (
                        <div style={{ marginTop: "12px" }}>
                          <h4 style={{ margin: "8px 0" }}>Recent News:</h4>
                          <ul style={{ margin: "4px 0", paddingLeft: "20px", fontSize: "13px" }}>
                            {fundamentalData.recentNews.slice(0, 3).map((news, i) => (
                              <li key={i} style={{ marginBottom: "4px", color: news.sentiment === "positive" ? "green" : news.sentiment === "negative" ? "red" : "gray" }}>
                                {news.title} ({news.category})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {fundamentalData.sources.coingecko && (
                        <div style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
                          <p>Community: {fundamentalData.sources.coingecko.communityScore} | Developer: {fundamentalData.sources.coingecko.developerScore} | Liquidity: {fundamentalData.sources.coingecko.liquidityScore}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p>No fundamental data available</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {data && signal && chartCandles && (
          <div className={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0 }}>Structure Chart</h2>
              <select 
                className={styles.input} 
                style={{ width: "auto", minWidth: "120px" }}
                value={chartTimeframe} 
                onChange={(e) => setChartTimeframe(e.target.value as typeof TIMEFRAMES[number])}
                disabled={isLoadingChart}
              >
                {TIMEFRAMES.filter(tf => tf !== "1week").map((tf) => (
                  <option key={`chart-tf-${tf}`} value={tf}>
                    {tf} {tf === timeframe ? "(Main)" : ""}
                  </option>
                ))}
              </select>
            </div>
            
            {isLoadingChart && chartCandles === data.candles ? (
               <p className={styles.placeholder}>Loading chart data...</p>
            ) : (
              <MarketStructureChart
                candles={chartCandles}
                symbol={signal.symbol}
                support={signal.levels.nearestSupport}
                resistance={signal.levels.nearestResistance}
                entryZoneLow={signal.levels.entryZoneLow}
                entryZoneHigh={signal.levels.entryZoneHigh}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
