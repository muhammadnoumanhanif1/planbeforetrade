import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { scanMarketSignals, parseScannerSymbols } from "@/lib/signals/marketScanner";
import type { MarketCandle } from "@/lib/signals/types";
import { calculateAdaptiveAiScore, DEFAULT_AI_WEIGHTS, getConfidenceLabel, type AiTradeRecord, type AiWeights } from "@/lib/ai-learning/engine";
import { createAdminClient } from "@/lib/supabase-server";
import { handleNewSignal } from "@/lib/signalDispatcher";
import { dispatchTopOpportunitiesToTelegram } from "@/lib/dispatchTopSignals";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 60 seconds

const EXCHANGES = ["bitget", "binance", "mexc", "bybit"] as const;
type Exchange = (typeof EXCHANGES)[number];

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

const BINANCE_CANDLES_URLS = [
  "https://data-api.binance.vision/api/v3/klines",
  "https://api1.binance.com/api/v3/klines",
  "https://api2.binance.com/api/v3/klines",
  "https://api3.binance.com/api/v3/klines",
  "https://api.binance.com/api/v3/klines",
];
const BITGET_CANDLES_URL = "https://api.bitget.com/api/v2/spot/market/candles";
const MEXC_CANDLES_URL = "https://api.mexc.com/api/v3/klines";
const BYBIT_CANDLES_URL = "https://api.bybit.com/v5/market/kline";
const CANDLE_LIMIT = 120;
const EXCHANGE_FETCH_TIMEOUT_MS = 8000;
const DEFAULT_DISTANCE_FALLBACK = 0.02;
const MAX_DISTANCE_FOR_ENTRY_QUALITY = 0.03;
const MIN_ENTRY_QUALITY = 20;
const MAX_ENTRY_QUALITY = 95;

const TIMEFRAME_MAP: Record<Exchange, Record<(typeof TIMEFRAMES)[number], string | null>> = {
  bitget: {
    "1min": "1min",
    "3min": "3min",
    "5min": "5min",
    "15min": "15min",
    "30min": "30min",
    "1h": "1h",
    "4h": "4h",
    "6h": "6h",
    "12h": "12h",
    "1day": "1day",
    "1week": "1week",
  },
  binance: {
    "1min": "1m",
    "3min": "3m",
    "5min": "5m",
    "15min": "15m",
    "30min": "30m",
    "1h": "1h",
    "4h": "4h",
    "6h": "6h",
    "12h": "12h",
    "1day": "1d",
    "1week": "1w",
  },
  mexc: {
    "1min": "1m",
    "3min": null,
    "5min": "5m",
    "15min": "15m",
    "30min": "30m",
    "1h": "60m",
    "4h": "4h",
    "6h": null,
    "12h": null,
    "1day": "1d",
    "1week": "1W",
  },
  bybit: {
    "1min": "1",
    "3min": "3",
    "5min": "5",
    "15min": "15",
    "30min": "30",
    "1h": "60",
    "4h": "240",
    "6h": "360",
    "12h": "720",
    "1day": "D",
    "1week": "W",
  },
};

const normalizeSymbol = (symbol: string) =>
  symbol.toUpperCase().replace(/_SPBL$/i, "").replace(/[-_]/g, "").split(":")[0];

const parseBearerToken = (authorization: string | null): string | null => {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

async function isAuthenticatedRequest(request: Request): Promise<boolean> {
  const requiredBotKey = process.env.BOT_SIGNALS_API_KEY?.trim();
  const providedBotKey =
    request.headers.get("x-bot-key")?.trim() ||
    parseBearerToken(request.headers.get("authorization"));

  if (requiredBotKey && providedBotKey === requiredBotKey) return true;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return false;
    const cookieStore = await cookies();
    type CookieSetItem = {
      name: string;
      value: string;
      options?: Parameters<typeof cookieStore.set>[2];
    };
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieSetItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore cookie set failures.
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

const parseBybitEntry = (entry: unknown): import("@/lib/signals/types").MarketCandle | null => {
  if (!Array.isArray(entry) || entry.length < 6) return null;
  const candle = {
    timestamp: Number(entry[0]),
    open: Number(entry[1]),
    high: Number(entry[2]),
    low: Number(entry[3]),
    close: Number(entry[4]),
    volume: Number(entry[5]),
  };
  if (!Number.isFinite(candle.close) || candle.close <= 0) return null;
  return candle;
};

const parseCandles = (exchange: Exchange, payload: unknown): MarketCandle[] => {
  if (exchange === "bybit") {
    const data = (payload as { result?: { list?: unknown[] } })?.result?.list ?? [];
    return (data as unknown[])
      .map(parseBybitEntry)
      .filter((c): c is MarketCandle => c !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  const rows =
    exchange === "bitget"
      ? Array.isArray((payload as { data?: unknown[] })?.data)
        ? ((payload as { data: unknown[] }).data ?? [])
        : []
      : Array.isArray(payload)
        ? payload
        : [];

  return rows
    .map((entry): MarketCandle | null => {
      if (!Array.isArray(entry) || entry.length < 6) return null;
      const candle = {
        timestamp: Number(entry[0]),
        open: Number(entry[1]),
        high: Number(entry[2]),
        low: Number(entry[3]),
        close: Number(entry[4]),
        volume: Number(entry[5]),
      };
      if (!Number.isFinite(candle.close) || candle.close <= 0) return null;
      return candle;
    })
    .filter((value): value is MarketCandle => value !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
};

const getCandlesUrls = (exchange: Exchange) => {
  if (exchange === "binance") return BINANCE_CANDLES_URLS;
  if (exchange === "mexc") return [MEXC_CANDLES_URL];
  if (exchange === "bybit") return [BYBIT_CANDLES_URL];
  return [BITGET_CANDLES_URL];
};

const buildQuery = (exchange: Exchange, symbol: string, timeframe: string) => {
  if (exchange === "bitget") {
    return new URLSearchParams({
      symbol,
      granularity: timeframe,
      limit: String(CANDLE_LIMIT),
    });
  }

  if (exchange === "bybit") {
    return new URLSearchParams({
      category: "linear",
      symbol,
      interval: timeframe,
      limit: String(CANDLE_LIMIT),
    });
  }

  return new URLSearchParams({
    symbol,
    interval: timeframe,
    limit: String(CANDLE_LIMIT),
  });
};

const parsePreviousSetupKeys = (raw: string | null) => {
  if (!raw) return {} as Record<string, string | null>;
  try {
    const parsed = JSON.parse(raw) as Record<string, string | null>;
    return Object.entries(parsed).reduce<Record<string, string | null>>((acc, [symbol, key]) => {
      acc[normalizeSymbol(symbol)] = typeof key === "string" ? key : null;
      return acc;
    }, {});
  } catch {
    return {} as Record<string, string | null>;
  }
};

type SessionName = "london" | "newyork" | "all" | "asian" | "american";

const DEFAULT_SCANNER_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

async function fetchTopSymbolsByVolume(exchange: Exchange, limit = 20): Promise<string[]> {
  try {
    let url = "";
    let transform: (data: unknown) => string[];

    if (exchange === "binance") {
      url = "https://data-api.binance.vision/api/v3/ticker/24hr";
      transform = (data) => {
        if (!Array.isArray(data)) return DEFAULT_SCANNER_SYMBOLS;
        return (data as Array<{ symbol: string; quoteVolume: string }>)
          .filter((t) => t.symbol.endsWith("USDT"))
          .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
          .slice(0, limit)
          .map((t) => t.symbol);
      };
    } else if (exchange === "bitget") {
      url = "https://api.bitget.com/api/v2/spot/market/tickers";
      transform = (data) => {
        const list = (data as { data?: Array<{ symbol: string; baseVol: string }> })?.data;
        if (!Array.isArray(list)) return DEFAULT_SCANNER_SYMBOLS;
        return list
          .filter((t) => t.symbol.endsWith("USDT"))
          .sort((a, b) => Number(b.baseVol) - Number(a.baseVol))
          .slice(0, limit)
          .map((t) => t.symbol);
      };
    } else if (exchange === "mexc") {
      url = "https://api.mexc.com/api/v3/ticker/24hr";
      transform = (data) => {
        if (!Array.isArray(data)) return DEFAULT_SCANNER_SYMBOLS;
        return (data as Array<{ symbol: string; quoteVolume: string }>)
          .filter((t) => t.symbol.endsWith("USDT"))
          .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
          .slice(0, limit)
          .map((t) => t.symbol);
      };
    } else {
      // bybit
      url = "https://api.bybit.com/v5/market/tickers?category=linear";
      transform = (data) => {
        const list = (data as { result?: { list?: Array<{ symbol: string; turnover24h: string }> } })?.result?.list;
        if (!Array.isArray(list)) return DEFAULT_SCANNER_SYMBOLS;
        return list
          .filter((t) => t.symbol.endsWith("USDT"))
          .sort((a, b) => Number(b.turnover24h) - Number(a.turnover24h))
          .slice(0, limit)
          .map((t) => t.symbol);
      };
    }

    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "PlanBeforeTrade/1.0" },
    });
    if (!res.ok) return DEFAULT_SCANNER_SYMBOLS;
    const data = await res.json();
    const symbols = transform(data);
    return symbols.length > 0 ? symbols : DEFAULT_SCANNER_SYMBOLS;
  } catch {
    return DEFAULT_SCANNER_SYMBOLS;
  }
}

function getSessionStatus(session: SessionName): { sessionActive: boolean; currentSession: SessionName } {
  if (session === "all") return { sessionActive: true, currentSession: "all" };
  const nowUTC = new Date();
  const utcHour = nowUTC.getUTCHours();
  const utcMinute = nowUTC.getUTCMinutes();
  const minutesFromMidnight = utcHour * 60 + utcMinute;

  // Asian: 00:00–08:00 UTC (05:00-13:00 PKT)
  const asianActive = minutesFromMidnight >= 0 * 60 && minutesFromMidnight < 8 * 60;
  // London: 07:00–16:00 UTC (12:00-21:00 PKT)
  const londonActive = minutesFromMidnight >= 7 * 60 && minutesFromMidnight < 16 * 60;
  // American: 13:00–22:00 UTC (18:00-03:00 PKT)
  const americanActive = minutesFromMidnight >= 13 * 60 && minutesFromMidnight < 22 * 60;
  // New York: 13:00–22:00 UTC (18:00-03:00 PKT)
  const newyorkActive = minutesFromMidnight >= 13 * 60 && minutesFromMidnight < 22 * 60;

  let sessionActive = false;
  if (session === "asian") sessionActive = asianActive;
  else if (session === "london") sessionActive = londonActive;
  else if (session === "american") sessionActive = americanActive;
  else if (session === "newyork") sessionActive = newyorkActive;

  return { sessionActive, currentSession: session };
}

async function loadAiLearningContext() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { weights: DEFAULT_AI_WEIGHTS, setupStats: new Map() };
  }
  try {
    const admin = createAdminClient();
    const [{ data: weightRow }, { data: historyRows }] = await Promise.all([
      admin
        .from("ai_weights")
        .select("trend_weight,volume_weight,rsi_weight,entry_quality_weight,historical_performance_weight")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("ai_trade_history")
        .select("symbol,trend,strategy_type,result,result_r,ai_score,indicators,created_at")
        .order("created_at", { ascending: false })
        .limit(1500),
    ]);

    const weights: AiWeights = weightRow
      ? {
          trend_weight: Number(weightRow.trend_weight ?? DEFAULT_AI_WEIGHTS.trend_weight),
          volume_weight: Number(weightRow.volume_weight ?? DEFAULT_AI_WEIGHTS.volume_weight),
          rsi_weight: Number(weightRow.rsi_weight ?? DEFAULT_AI_WEIGHTS.rsi_weight),
          entry_quality_weight: Number(weightRow.entry_quality_weight ?? DEFAULT_AI_WEIGHTS.entry_quality_weight),
          historical_performance_weight: Number(
            weightRow.historical_performance_weight ?? DEFAULT_AI_WEIGHTS.historical_performance_weight
          ),
        }
      : DEFAULT_AI_WEIGHTS;

    const history: AiTradeRecord[] = Array.isArray(historyRows)
      ? historyRows.map((row) => ({
          symbol: String(row.symbol),
          trend: row.trend as AiTradeRecord["trend"],
          strategy_type: String(row.strategy_type),
          result: row.result as AiTradeRecord["result"],
          result_r: Number(row.result_r ?? 0),
          ai_score: Number(row.ai_score ?? 0),
          indicators: {
            rsi: Number(row.indicators?.rsi ?? 50),
            ema_alignment: Boolean(row.indicators?.ema_alignment),
            volume: Number(row.indicators?.volume ?? 0),
          },
          created_at: String(row.created_at),
        }))
      : [];

    const setupStats = new Map<string, { trades: number; wins: number; losses: number; winRate: number; avgR: number }>();
    for (const trade of history) {
      const key = `${trade.symbol}::${trade.trend}::${trade.strategy_type}`;
      const current = setupStats.get(key) ?? { trades: 0, wins: 0, losses: 0, winRate: 0, avgR: 0 };
      const trades = current.trades + 1;
      const wins = current.wins + (trade.result === "WIN" ? 1 : 0);
      const losses = current.losses + (trade.result === "LOSS" ? 1 : 0);
      const avgR = (current.avgR * current.trades + trade.result_r) / trades;
      setupStats.set(key, { trades, wins, losses, winRate: wins / trades, avgR });
    }

    return { weights, setupStats };
  } catch {
    return { weights: DEFAULT_AI_WEIGHTS, setupStats: new Map() };
  }
}

function buildBodyFromQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols")?.trim() || "";
  const requestedScanMode = searchParams.get("scanMode")?.trim() || "";

  const body: Record<string, unknown> = {};
  const exchange = searchParams.get("exchange")?.trim();
  const symbol = searchParams.get("symbol")?.trim();
  const timeframe = searchParams.get("timeframe")?.trim();
  const session = searchParams.get("session")?.trim();
  const riskRewardRatio = searchParams.get("riskRewardRatio")?.trim();
  const riskPerTradePercent = searchParams.get("riskPerTradePercent")?.trim();
  const previousSetupKeys = searchParams.get("previousSetupKeys")?.trim();

  if (exchange) body.exchange = exchange;
  if (symbol) body.symbol = symbol;
  if (timeframe) body.timeframe = timeframe;
  if (session) body.session = session;
  if (riskRewardRatio) body.riskRewardRatio = riskRewardRatio;
  if (riskPerTradePercent) {
    const parsedRiskPerTradePercent = Number(riskPerTradePercent);
    body.riskPerTradePercent = Number.isFinite(parsedRiskPerTradePercent)
      ? parsedRiskPerTradePercent
      : riskPerTradePercent;
  }
  if (previousSetupKeys) body.previousSetupKeys = previousSetupKeys;
  if (symbolsParam) body.symbols = symbolsParam;

  if (requestedScanMode) {
    body.scanMode = requestedScanMode;
  } else if (symbolsParam) {
    body.scanMode = "custom";
  }

  return body;
}

export async function GET(request: Request) {
  const queryBody = buildBodyFromQuery(request);
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  const proxyRequest = new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify(queryBody),
  });
  return POST(proxyRequest);
}

export async function POST(request: Request) {
  if (!(await isAuthenticatedRequest(request))) {
    return NextResponse.json(
      { error: "Unauthorized. Provide session auth or x-bot-key." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const exchangeRaw = (body.exchange || "binance").toLowerCase().trim();
  const exchange: Exchange = EXCHANGES.includes(exchangeRaw as Exchange)
    ? (exchangeRaw as Exchange)
    : "binance";

  const timeframeRaw = (body.timeframe || "3min").trim();
  const timeframe = TIMEFRAMES.includes(timeframeRaw as (typeof TIMEFRAMES)[number])
    ? (timeframeRaw as (typeof TIMEFRAMES)[number])
    : "3min";

  const exchangeTimeframe = TIMEFRAME_MAP[exchange][timeframe];
  if (!exchangeTimeframe) {
    return NextResponse.json(
      { error: `${exchange.toUpperCase()} does not support ${timeframe} timeframe.` },
      { status: 400 }
    );
  }

  const selectedSymbol = normalizeSymbol(body.symbol?.trim() || "BTCUSDT");

  const scanModeRaw = (body.scanMode || "top10").toLowerCase();
  const scanMode = ["custom", "top10", "top25", "top50", "top100"].includes(scanModeRaw)
    ? scanModeRaw
    : "top10";
  const sessionFilterRaw = (body.session || "all").toLowerCase() as SessionName;
  const sessionFilter: SessionName = ["london", "newyork", "all", "asian", "american"].includes(sessionFilterRaw)
    ? sessionFilterRaw
    : "all";
  const { sessionActive, currentSession } = getSessionStatus(sessionFilter);

  let scannerSymbols: string[];
  if (scanMode !== "custom") {
    const limit =
      scanMode === "top100"
        ? 100
        : scanMode === "top50"
          ? 50
          : scanMode === "top25"
            ? 25
            : 10;
    scannerSymbols = await fetchTopSymbolsByVolume(exchange, limit);
  } else {
    const symbolsFromQuery = body.symbols?.trim() || "";
    const configuredSymbols = symbolsFromQuery || process.env.MARKET_SCANNER_SYMBOLS || "";
    scannerSymbols = parseScannerSymbols(configuredSymbols);
  }
  const symbols = Array.from(new Set([selectedSymbol, ...scannerSymbols]));

  const previousSetupKeys = parsePreviousSetupKeys(body.previousSetupKeys || null);
  const riskRewardRatioRaw = String(body.riskRewardRatio || "3");
  if (!["2", "3"].includes(riskRewardRatioRaw)) {
    return NextResponse.json({ error: "riskRewardRatio must be 2 or 3." }, { status: 400 });
  }
  const riskRewardRatio = riskRewardRatioRaw === "2" ? 2 : 3;
  const riskPerTradePercentRaw = Number(body.riskPerTradePercent || "1");
  const riskPerTradePercent = Number.isFinite(riskPerTradePercentRaw)
    ? Math.min(2, Math.max(1, riskPerTradePercentRaw))
    : 1;

  try {
    const loadCandles = async (symbol: string): Promise<MarketCandle[]> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EXCHANGE_FETCH_TIMEOUT_MS);

      let response: Response | null = null;

      try {
        for (const url of getCandlesUrls(exchange)) {
          try {
            const nextResponse = await fetch(
              `${url}?${buildQuery(exchange, symbol, exchangeTimeframe).toString()}`,
              {
                cache: "no-store",
                signal: controller.signal,
                headers: { Accept: "application/json", "User-Agent": "PlanBeforeTrade/1.0" },
              }
            );

            if (nextResponse.ok) {
              response = nextResponse;
              break;
            }
          } catch {
            // Try next source URL.
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response) {
        return [];
      }

      const payload = await response.json();
      const candles = parseCandles(exchange, payload);
      return candles.slice(-100);
    };

    const [scanResult, selectedCandles] = await Promise.all([
      scanMarketSignals({
        symbols,
        loadCandles,
        previousSetupKeys,
        options: {
          riskRewardRatio,
          riskPerTradePercent,
        },
      }),
      loadCandles(selectedSymbol),
    ]);

    const aiContext = await loadAiLearningContext();
    const learnedSignals = scanResult.signals.map((item) => {
      const distance = item.signal.distanceToEntryZone ?? DEFAULT_DISTANCE_FALLBACK;
      const entryQuality = Math.max(
        MIN_ENTRY_QUALITY,
        Math.min(
          MAX_ENTRY_QUALITY,
          Math.round((1 - Math.min(distance, MAX_DISTANCE_FOR_ENTRY_QUALITY) / MAX_DISTANCE_FOR_ENTRY_QUALITY) * 100)
        )
      );
      const aiScore = calculateAdaptiveAiScore({
        baseScore: item.signal.confidence,
        symbol: item.signal.symbol,
        trend: item.signal.trend,
        strategyType: item.signal.strategy_type,
        rsi: item.signal.indicators.rsi,
        volume: item.signal.indicators.volume,
        entryQuality,
        weights: aiContext.weights,
        setupStats: aiContext.setupStats,
      });
      const confidenceLabel = getConfidenceLabel(aiScore);
      
      return {
        ...item,
        confidence: aiScore,
        signal: {
          ...item.signal,
          confidence: aiScore,
          ai_score: aiScore,
          confidence_label: confidenceLabel,
          notes: [...item.signal.notes, `AI confidence: ${confidenceLabel} (${aiScore}%)`],
        },
      };
    });
    
    // Sort logic: Prioritize actionable setups (READY or TRIGGERED) first, then sort by confidence (AI score)
    // This ensures any coin triggering a web notification natively surfaces to the 'Top Opportunities' cards.
    learnedSignals.sort((a, b) => {
      const aIsActive = a.setup === "READY" || a.setup === "TRIGGERED";
      const bIsActive = b.setup === "READY" || b.setup === "TRIGGERED";
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      return b.confidence - a.confidence;
    });
    
    const learnedTopOpportunities = learnedSignals.slice(0, 5);

    if (!learnedSignals.length) {
      return NextResponse.json({ error: "Not enough candle data for market structure." }, { status: 422 });
    }

    const selectedSignal =
      learnedSignals.find((item) => item.symbol === selectedSymbol)?.signal ??
      learnedSignals[0].signal;

    // Dispatch top opportunities to Telegram
    // Lowered threshold from 80 to 65 to catch aggressive early institutional setups
    await dispatchTopOpportunitiesToTelegram(learnedTopOpportunities, handleNewSignal);

    return NextResponse.json({
      exchange,
      symbol: selectedSignal.symbol,
      timeframe,
      signal: selectedSignal,
      signals: learnedSignals.map((item) => ({
        symbol: item.symbol,
        trend: item.trend,
        setup: item.setup,
        entry_zone: item.entry_zone,
        confidence: item.confidence,
        distanceToEntryZone: item.distanceToEntryZone,
        current_price: item.current_price,
        signal: item.signal,
      })),
      topOpportunities: learnedTopOpportunities,
      candles: selectedCandles.map((candle) => ({
        time: Math.floor(candle.timestamp / 1000),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
      updatedAt: new Date().toISOString(),
      sessionActive,
      currentSession,
      scanMode,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate market-structure signal." }, { status: 500 });
  }
}
