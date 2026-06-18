import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasPremiumAccess } from "@/lib/auth-access";

export const dynamic = "force-dynamic";
export const revalidate = 30;

const FREE_ANALYSIS_LIMIT = 3;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const EXCHANGES = ["bitget", "binance", "mexc"] as const;
type Exchange = (typeof EXCHANGES)[number];

const BITGET_CANDLES_URL = "https://api.bitget.com/api/v2/spot/market/candles";
const BINANCE_CANDLES_URLS = [
  "https://data-api.binance.vision/api/v3/klines",
  "https://api1.binance.com/api/v3/klines",
  "https://api2.binance.com/api/v3/klines",
  "https://api3.binance.com/api/v3/klines",
  "https://api.binance.com/api/v3/klines",
];
const MEXC_CANDLES_URL = "https://api.mexc.com/api/v3/klines";

const SPOT_SUFFIX_REGEX = /_SPBL$/i;
const UPPERCASE_SYMBOL_REGEX = /^[A-Z0-9]+[A-Z0-9:_-]*$/;
const INVALID_SYMBOL_ERROR = "Invalid symbol format.";
const SHORT_SMA_WINDOW = 10;
const LONG_SMA_WINDOW = 30;
const MOMENTUM_LOOKBACK = 15;
const MOMENTUM_WEIGHT = 0.6;
const CANDLE_LIMIT = 500;
const MAX_PREDICTION_CHANGE = 0.06;
const MIN_STEP_RATIO_OF_PRICE = 0.0025;
const STOP_LOSS_STEP_MULTIPLIER = 0.8;
const STOP_LOSS_SUPPORT_BUFFER = 0.0025;
const TAKE_PROFIT_COUNT = 3;
const SUPPORT_RESISTANCE_LOOKBACK = 60;
const CONFIDENCE_SETTINGS = {
  trendMultiplier: 200,
  trendCap: 40,
  momentumMultiplier: 150,
  momentumCap: 30,
  rsiWeight: 20,
  volatilityMultiplier: 8,
  volatilityWeight: 10,
};

const VALID_TIMEFRAMES = [
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

const TIMEFRAME_MAP: Record<Exchange, Record<(typeof VALID_TIMEFRAMES)[number], string>> = {
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
    "3min": "5m",
    "5min": "5m",
    "15min": "15m",
    "30min": "30m",
    "1h": "60m",
    "4h": "4h",
    "6h": "4h",
    "12h": "1d",
    "1day": "1d",
    "1week": "1W",
  },
};

type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const analysisCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 15000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSymbol = (upperSymbol: string): string => {
  const baseSymbol = upperSymbol.split(":")[0];
  return baseSymbol.replace(SPOT_SUFFIX_REGEX, "").replace(/[-_]/g, "");
};

const average = (values: number[]): number => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const standardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const calculateVolatilityScore = (volatility: number, lastClose: number) => {
  const normalized = clamp(
    1 - (volatility / lastClose) * CONFIDENCE_SETTINGS.volatilityMultiplier,
    0,
    1
  );
  return normalized * CONFIDENCE_SETTINGS.volatilityWeight;
};

const buildTakeProfitLevels = (
  lastClose: number,
  step: number,
  recommendation: "LONG" | "SHORT",
  count: number
) =>
  Array.from({ length: count }, (_, index) =>
    recommendation === "LONG"
      ? lastClose + step * (index + 1)
      : lastClose - step * (index + 1)
  );

const buildStopLossLevels = (
  lastClose: number,
  step: number,
  recommendation: "LONG" | "SHORT",
  support: number,
  resistance: number
): number[] => {
  const stopLossDistance = step * STOP_LOSS_STEP_MULTIPLIER;
  let stopLoss =
    recommendation === "LONG"
      ? lastClose - stopLossDistance
      : lastClose + stopLossDistance;

  if (recommendation === "LONG" && Number.isFinite(support)) {
    const bufferedSupport = support * (1 - STOP_LOSS_SUPPORT_BUFFER);
    if (bufferedSupport < stopLoss) stopLoss = bufferedSupport;
  }

  if (recommendation === "SHORT" && Number.isFinite(resistance)) {
    const bufferedResistance = resistance * (1 + STOP_LOSS_SUPPORT_BUFFER);
    if (bufferedResistance > stopLoss) stopLoss = bufferedResistance;
  }

  return [stopLoss];
};

const calculateRsi = (closes: number[], period = 14): number => {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let index = closes.length - period; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return 100;
  const relativeStrength = gains / losses;
  return 100 - 100 / (1 + relativeStrength);
};

const getCandlesUrls = (exchange: Exchange) => {
  if (exchange === "binance") return BINANCE_CANDLES_URLS;
  if (exchange === "mexc") return [MEXC_CANDLES_URL];
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

  return new URLSearchParams({
    symbol,
    interval: timeframe,
    limit: String(CANDLE_LIMIT),
  });
};

const parseCandles = (exchange: Exchange, payload: unknown): Candle[] => {
  const rows =
    exchange === "bitget"
      ? Array.isArray((payload as { data?: unknown[] })?.data)
        ? ((payload as { data: unknown[] }).data ?? [])
        : []
      : Array.isArray(payload)
        ? payload
        : [];

  return rows
    .map((entry): Candle | null => {
      if (!Array.isArray(entry) || entry.length < 6) return null;

      return {
        timestamp: Number(entry[0]),
        open: toNumber(entry[1]),
        high: toNumber(entry[2]),
        low: toNumber(entry[3]),
        close: toNumber(entry[4]),
        volume: toNumber(entry[5]),
      };
    })
    .filter((candle: Candle | null): candle is Candle => candle !== null)
    .filter((candle) => candle.close > 0);
};

const toIsoStringFromCandleTimestamp = (timestamp: number): string | null => {
  const timestampInMs =
    timestamp > 0 && timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(timestampInMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const getClientKey = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipFromForwardedFor = forwardedFor?.split(",")[0]?.trim();
  const ip =
    ipFromForwardedFor ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent}`;
};

const checkRateLimit = (clientKey: string) => {
  const now = Date.now();
  const current = rateLimitStore.get(clientKey);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(clientKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, retryAfterMs: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now };
  }

  const nextCount = current.count + 1;
  rateLimitStore.set(clientKey, { ...current, count: nextCount });

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - nextCount,
    retryAfterMs: 0,
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const autoRefresh = searchParams.get("autoRefresh") === "1";
  const rawExchange = (searchParams.get("exchange") ?? "bitget").trim().toLowerCase();
  const exchange: Exchange = EXCHANGES.includes(rawExchange as Exchange)
    ? (rawExchange as Exchange)
    : "bitget";

  const rawSymbol = searchParams.get("symbol") ?? "";
  const trimmedSymbol = rawSymbol.trim();
  const rawTimeframe = searchParams.get("timeframe") ?? "3min";
  const normalizedTimeframe = VALID_TIMEFRAMES.includes(rawTimeframe as (typeof VALID_TIMEFRAMES)[number])
    ? (rawTimeframe as (typeof VALID_TIMEFRAMES)[number])
    : "3min";
  const exchangeTimeframe = TIMEFRAME_MAP[exchange][normalizedTimeframe];

  if (!trimmedSymbol) {
    return NextResponse.json({ error: "Symbol is required." }, { status: 400 });
  }

  const upperSymbol = trimmedSymbol.toUpperCase();

  if (!UPPERCASE_SYMBOL_REGEX.test(upperSymbol)) {
    return NextResponse.json({ error: INVALID_SYMBOL_ERROR }, { status: 400 });
  }

  const symbol = normalizeSymbol(upperSymbol);

  // ============================================
  // API RATE LIMITING (per client per minute)
  // ============================================
  const rateLimit = checkRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many analysis requests. Please wait before trying again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  }
  
  // ============================================
  // USAGE TRACKING & LIMITS (Supabase)
  // ============================================
  let userId: string | null = null;
  let isPremium = false;
  let shouldLogUsage = false;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      userId = user.id;
      
      // Check for active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      
      isPremium = hasPremiumAccess(subscription);
      
      // If not premium, check usage limit
      if (!isPremium && !autoRefresh) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count } = await supabase
          .from("usage_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action", "analysis")
          .gte("created_at", today.toISOString());
        
        const usageCount = count || 0;
        
        if (usageCount >= FREE_ANALYSIS_LIMIT) {
          return NextResponse.json(
            { 
              error: "Daily analysis limit reached",
              message: "You've used all 3 free analyses today. Upgrade to Premium for unlimited analyses!",
              usageCount,
              limit: FREE_ANALYSIS_LIMIT,
              upgradeUrl: "/pricing"
            }, 
            { status: 429 }
          );
        }
      }
      
      shouldLogUsage = !autoRefresh;
    }
  } catch (error) {
    // If Supabase isn't configured, allow the request (development mode)
    console.warn("Usage tracking unavailable:", error);
  }

  // ============================================
  // CACHE CHECK
  // ============================================
  const cacheKey = `${exchange}-${symbol}-${normalizedTimeframe}`;
  const cached = analysisCache.get(cacheKey);
  const now = Date.now();

  if (!autoRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
    // Don't log usage for cached responses
    return NextResponse.json({
      ...(cached.data as Record<string, unknown>),
      cached: true,
      cacheAge: now - cached.timestamp,
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response: Response | null = null;
    let lastStatus = 502;

    for (const url of getCandlesUrls(exchange)) {
      try {
        const nextResponse = await fetch(
          `${url}?${buildQuery(exchange, symbol, exchangeTimeframe).toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "User-Agent": "PlanBeforeTrade/1.0",
            },
          }
        );

        if (nextResponse.ok) {
          response = nextResponse;
          break;
        }

        lastStatus = nextResponse.status;
      } catch {
        // Try next endpoint
      }
    }

    clearTimeout(timeoutId);

    if (!response) {
      return NextResponse.json(
        { error: `Unable to load ${exchange.toUpperCase()} candle data.` },
        { status: lastStatus }
      );
    }

    const payload = await response.json();
    const candles = parseCandles(exchange, payload);

    if (candles.length < 30) {
      return NextResponse.json(
        { error: "Not enough candle data for analysis." },
        { status: 422 }
      );
    }

    const closes = candles.map((candle) => candle.close);
    const lastClose = closes[closes.length - 1];
    const smaShort = average(closes.slice(-SHORT_SMA_WINDOW));
    const smaLong = average(closes.slice(-LONG_SMA_WINDOW));
    const momentumPeriod = Math.min(MOMENTUM_LOOKBACK, closes.length - 1);
    const momentum =
      (closes[closes.length - 1] - closes[closes.length - 1 - momentumPeriod]) /
      closes[closes.length - 1 - momentumPeriod];

    const trend = smaLong === 0 ? 0 : (smaShort - smaLong) / smaLong;
    const volatility = standardDeviation(closes.slice(-30));
    const rsi = calculateRsi(closes);

    const directionalBias = trend + momentum * MOMENTUM_WEIGHT;
    const predictedChange = clamp(
      directionalBias,
      -MAX_PREDICTION_CHANGE,
      MAX_PREDICTION_CHANGE
    );
    const predictedPrice = lastClose * (1 + predictedChange);

    const baseStep = Math.max(volatility, lastClose * MIN_STEP_RATIO_OF_PRICE);
    const recommendation = predictedPrice >= lastClose ? "LONG" : "SHORT";
    const recentSlice = candles.slice(-SUPPORT_RESISTANCE_LOOKBACK);
    const support = Math.min(...recentSlice.map((candle) => candle.low));
    const resistance = Math.max(...recentSlice.map((candle) => candle.high));
    const takeProfits = buildTakeProfitLevels(
      lastClose,
      baseStep,
      recommendation,
      TAKE_PROFIT_COUNT
    );
    const stopLosses = buildStopLossLevels(
      lastClose,
      baseStep,
      recommendation,
      support,
      resistance
    );

    const trendScore = Math.min(
      Math.abs(trend) * CONFIDENCE_SETTINGS.trendMultiplier,
      CONFIDENCE_SETTINGS.trendCap
    );
    const momentumScore = Math.min(
      Math.abs(momentum) * CONFIDENCE_SETTINGS.momentumMultiplier,
      CONFIDENCE_SETTINGS.momentumCap
    );
    const rsiAlignment =
      recommendation === "LONG" ? (rsi - 50) / 50 : (50 - rsi) / 50;
    const rsiScore = clamp(rsiAlignment, 0, 1) * CONFIDENCE_SETTINGS.rsiWeight;
    const volatilityScore = calculateVolatilityScore(volatility, lastClose);

    const confidence = Math.round(
      clamp(trendScore + momentumScore + rsiScore + volatilityScore, 10, 95)
    );

    const smaValues = closes.map((_, index) => {
      if (index < LONG_SMA_WINDOW - 1) return null;
      const slice = closes.slice(index - LONG_SMA_WINDOW + 1, index + 1);
      return average(slice);
    });

    const candlesForChart = candles.map((candle) => ({
      time: Math.floor(candle.timestamp / 1000) as number,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const smaLineForChart = candles
      .map((candle, index) => ({
        time: Math.floor(candle.timestamp / 1000) as number,
        value: smaValues[index],
      }))
      .filter((item): item is { time: number; value: number } => item.value !== null);

    const candleBodies = candles.map((c) => Math.abs(c.close - c.open));
    const avgBody = average(candleBodies);
    const threshold = avgBody * 2.5;

    const orderBlocks = candles
      .map((candle) => {
        const body = Math.abs(candle.close - candle.open);
        if (body < threshold) return null;

        const top = Math.max(candle.open, candle.close);
        const bottom = Math.min(candle.open, candle.close);
        return {
          time: Math.floor(candle.timestamp / 1000) as number,
          top,
          bottom,
        };
      })
      .filter((ob): ob is { time: number; top: number; bottom: number } => ob !== null)
      .slice(-5);

    const signalGeneratedAt =
      toIsoStringFromCandleTimestamp(candles[candles.length - 1].timestamp) ??
      new Date().toISOString();

    const analysisResult = {
      exchange,
      symbol,
      timeframe: normalizedTimeframe,
      lastPrice: lastClose,
      predictedPrice,
      recommendation,
      takeProfits,
      stopLosses,
      support,
      resistance,
      confidence,
      indicators: {
        smaShort,
        smaLong,
        rsi,
        momentum,
        volatility,
      },
      candles: candlesForChart,
      smaLine: smaLineForChart,
      orderBlocks,
      signalGeneratedAt,
      updatedAt: new Date().toISOString(),
      notes: [
        `Heuristic analysis based on recent ${normalizedTimeframe} candles from ${exchange.toUpperCase()}.`,
        "Not financial advice. Use risk management.",
      ],
      cached: false,
    };

    analysisCache.set(cacheKey, {
      data: analysisResult,
      timestamp: Date.now(),
    });

    if (analysisCache.size > 100) {
      const oldest = Array.from(analysisCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];
      if (oldest) analysisCache.delete(oldest[0]);
    }

    // ============================================
    // LOG USAGE (for non-cached, authenticated requests)
    // ============================================
    if (shouldLogUsage && userId) {
      try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll();
              },
              setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                try {
                  cookiesToSet.forEach(({ name, value, options }) =>
                    cookieStore.set(name, value, options)
                  );
                } catch {
                  // Ignore
                }
              },
            },
          }
        );

        await supabase.from("usage_logs").insert({
          user_id: userId,
          action: "analysis",
          metadata: {
            exchange,
            symbol,
            timeframe: normalizedTimeframe,
            recommendation: analysisResult.recommendation,
            confidence: analysisResult.confidence,
          },
        });
      } catch (logError) {
        // Don't fail the request if logging fails
        console.warn("Failed to log usage:", logError);
      }
    }

    return NextResponse.json(analysisResult);
  } catch {
    return NextResponse.json(
      { error: `Failed to analyze market data from ${exchange.toUpperCase()}.` },
      { status: 502 }
    );
  }
}
