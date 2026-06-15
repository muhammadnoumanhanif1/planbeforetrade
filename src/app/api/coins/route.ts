import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Cache for 60 seconds

const BITGET_TICKERS_URL = "https://api.bitget.com/api/v2/spot/market/tickers";
const BINANCE_TICKERS_URLS = [
  "https://data-api.binance.vision/api/v3/ticker/price",
  "https://api1.binance.com/api/v3/ticker/price",
  "https://api2.binance.com/api/v3/ticker/price",
  "https://api3.binance.com/api/v3/ticker/price",
  "https://api.binance.com/api/v3/ticker/price",
];
const MEXC_TICKERS_URL = "https://api.mexc.com/api/v3/ticker/price";
const DEFAULT_MAX_COINS = 1000;
const MEXC_MAX_COINS = 2000;
const SPOT_SUFFIX = "_SPBL";
const EXCHANGES = ["bitget", "binance", "mexc"] as const;

type Exchange = (typeof EXCHANGES)[number];

type Coin = {
  symbol: string;
  displaySymbol: string;
  baseCoin: string;
  quoteCoin: string;
  lastPrice: number;
};

// Performance optimizations
const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBitgetSymbol = (value: string): string => {
  const upper = value.trim().toUpperCase();
  return upper
    .replace(new RegExp(`${SPOT_SUFFIX}$`, "i"), "")
    .replace(/[-_]/g, "");
};

const normalizeLinearSymbol = (value: string): string =>
  value.trim().toUpperCase().replace(/[-_]/g, "");

const formatDisplaySymbol = (normalizedSymbol: string): { baseCoin: string; quoteCoin: string; displaySymbol: string } => {
  const quoteCoin = normalizedSymbol.endsWith("USDT") ? "USDT" : "";
  const baseCoin = quoteCoin
    ? normalizedSymbol.slice(0, -4)
    : normalizedSymbol;

  return {
    baseCoin,
    quoteCoin,
    displaySymbol: quoteCoin ? `${baseCoin}/USDT` : normalizedSymbol,
  };
};

const getTickersUrls = (exchange: Exchange) => {
  if (exchange === "binance") return BINANCE_TICKERS_URLS;
  if (exchange === "mexc") return [MEXC_TICKERS_URL];
  return [BITGET_TICKERS_URL];
};

const getMaxCoins = (exchange: Exchange) =>
  exchange === "mexc" ? MEXC_MAX_COINS : DEFAULT_MAX_COINS;

// Cache for recent response
const cacheByExchange = new Map<Exchange, { data: { coins: Coin[]; updatedAt: string }; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawExchange = (searchParams.get("exchange") ?? "bitget").trim().toLowerCase();
  const exchange: Exchange = EXCHANGES.includes(rawExchange as Exchange)
    ? (rawExchange as Exchange)
    : "bitget";

  try {
    // Return cached data if still valid
    const now = Date.now();
    const cached = cacheByExchange.get(exchange);

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        ...cached.data,
        exchange,
        total: cached.data.coins.length,
        cached: true,
      });
    }

    let response: Response | null = null;
    let lastStatus = 502;

    for (const url of getTickersUrls(exchange)) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout per endpoint

      try {
        const nextResponse = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": "PlanBeforeTrade/1.0",
          },
        });

        if (nextResponse.ok) {
          response = nextResponse;
          break;
        }

        lastStatus = nextResponse.status;
      } catch {
        // Try next endpoint
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          exchange,
          coins: [],
          total: 0,
          updatedAt: new Date().toISOString(),
          cached: false,
          sourceUnavailable: true,
          upstreamStatus: lastStatus,
          error: `Unable to load ${exchange.toUpperCase()} tickers.`,
        },
        { status: 200 }
      );
    }

    const payload = await response.json();
    const data = exchange === "bitget"
      ? (Array.isArray(payload?.data) ? payload.data : [])
      : (Array.isArray(payload) ? payload : []);

    const coins: Coin[] = data
      .map((ticker: Record<string, unknown>): Coin | null => {
        const rawSymbol = String(ticker.symbol ?? ticker.symbolName ?? "");
        const normalizedSymbol = exchange === "bitget"
          ? normalizeBitgetSymbol(rawSymbol)
          : normalizeLinearSymbol(rawSymbol);
        const lastPrice = toNumber(
          ticker.lastPr ?? ticker.last ?? ticker.close ?? ticker.price
        );

        if (!normalizedSymbol.endsWith("USDT") || lastPrice <= 0) {
          return null;
        }

        const display = formatDisplaySymbol(normalizedSymbol);

        return {
          symbol: normalizedSymbol,
          displaySymbol: display.displaySymbol,
          baseCoin: display.baseCoin,
          quoteCoin: display.quoteCoin,
          lastPrice,
        };
      })
      .filter((coin: Coin | null): coin is Coin => coin !== null)
      .sort((a: Coin, b: Coin) => a.baseCoin.localeCompare(b.baseCoin))
      .slice(0, getMaxCoins(exchange));

    // Update cache
    const updatedAt = new Date().toISOString();
    cacheByExchange.set(exchange, {
      data: { coins, updatedAt },
      timestamp: now,
    });

    return NextResponse.json({
      exchange,
      coins,
      total: coins.length,
      updatedAt,
      cached: false,
    });
  } catch {
    return NextResponse.json(
      {
        exchange,
        coins: [],
        total: 0,
        updatedAt: new Date().toISOString(),
        cached: false,
        sourceUnavailable: true,
        upstreamStatus: 502,
        error: `Failed to reach ${exchange.toUpperCase()} API.`,
      },
      { status: 200 }
    );
  }
}
