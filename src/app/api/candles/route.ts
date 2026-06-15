import { NextResponse } from "next/server";

const EXCHANGES = ["binance", "bitget", "mexc", "bybit"] as const;
type Exchange = (typeof EXCHANGES)[number];

const BINANCE_CANDLES_URLS = [
  "https://api.binance.com/api/v3/klines",
  "https://api1.binance.com/api/v3/klines",
  "https://api2.binance.com/api/v3/klines",
  "https://api3.binance.com/api/v3/klines",
];
const BITGET_CANDLES_URL = "https://api.bitget.com/api/v2/spot/market/candles";
const MEXC_CANDLES_URL = "https://api.mexc.com/api/v3/klines";
const BYBIT_CANDLES_URL = "https://api.bybit.com/v5/market/kline";

const TIMEFRAME_MAP: Record<string, Record<string, string>> = {
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
  mexc: {
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

const getCandlesUrls = (exchange: Exchange) => {
  if (exchange === "binance") return BINANCE_CANDLES_URLS;
  if (exchange === "mexc") return [MEXC_CANDLES_URL];
  if (exchange === "bybit") return [BYBIT_CANDLES_URL];
  return [BITGET_CANDLES_URL];
};

type MarketCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const parseCandles = (exchange: Exchange, payload: unknown): MarketCandle[] => {
  if (exchange === "bitget") {
    const data = (payload as { data?: Array<string[]> })?.data;
    if (!Array.isArray(data)) return [];
    return data
      .map((entry): MarketCandle | null => {
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
      .filter((c): c is MarketCandle => c !== null)
      .reverse();
  }

  if (exchange === "bybit") {
    const list = (payload as { result?: { list?: Array<string[]> } })?.result?.list;
    if (!Array.isArray(list)) return [];
    return list
      .map((entry): MarketCandle | null => {
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
      .filter((c): c is MarketCandle => c !== null)
      .reverse();
  }

  // Binance & MEXC use the same format
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry): MarketCandle | null => {
      if (!Array.isArray(entry)) return null;
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
    .filter((value): value is MarketCandle => value !== null);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exchangeRaw = (searchParams.get("exchange") || "binance").toLowerCase() as Exchange;
  const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();
  const timeframeRaw = searchParams.get("timeframe") || "1h";
  const limit = searchParams.get("limit") || "120";

  const exchangeTimeframe = TIMEFRAME_MAP[exchangeRaw]?.[timeframeRaw] || "1h";

  const search = new URLSearchParams({
    symbol: symbol,
    limit: limit,
  });

  if (exchangeRaw === "binance" || exchangeRaw === "mexc") {
    search.set("interval", exchangeTimeframe);
  } else if (exchangeRaw === "bybit") {
    search.set("interval", exchangeTimeframe);
    search.set("category", "linear");
  } else {
    search.set("granularity", exchangeTimeframe);
  }

  const queryStr = search.toString();
  let lastError = null;

  for (const url of getCandlesUrls(exchangeRaw)) {
    try {
      const res = await fetch(`${url}?${queryStr}`, {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": "PlanBeforeTrade/1.0" },
      });
      if (!res.ok) {
        lastError = new Error(`API ${res.status} ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      const candles = parseCandles(exchangeRaw, data);
      
      const formattedCandles = candles.map((c) => ({
        time: Math.floor(c.timestamp / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      return NextResponse.json({ candles: formattedCandles });
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  return NextResponse.json(
    { error: lastError instanceof Error ? lastError.message : "Failed to fetch candles" },
    { status: 500 }
  );
}
