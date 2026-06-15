const BITGET_SPOT_SUFFIX_REGEX = /_SPBL$/i;

const normalizeBitgetSymbol = (value: string): string => {
  const upper = value.trim().toUpperCase();
  return upper.replace(BITGET_SPOT_SUFFIX_REGEX, "").replace(/[-_]/g, "");
};

const normalizeSpotSymbol = (value: string): string => value.trim().toUpperCase().replace(/[-_]/g, "");

export const EXCHANGES = {
  bitget: {
    id: "bitget",
    name: "Bitget",
    tickersUrl: "https://api.bitget.com/api/v2/spot/market/tickers",
    candlesUrl: "https://api.bitget.com/api/v2/spot/market/candles",
    normalizeSymbol: normalizeBitgetSymbol,
  },
  binance: {
    id: "binance",
    name: "Binance",
    tickersUrl: "https://api.binance.com/api/v3/ticker/24hr",
    candlesUrl: "https://api.binance.com/api/v3/klines",
    normalizeSymbol: normalizeSpotSymbol,
  },
  mexc: {
    id: "mexc",
    name: "MEXC",
    tickersUrl: "https://api.mexc.com/api/v3/ticker/24hr",
    candlesUrl: "https://api.mexc.com/api/v3/klines",
    normalizeSymbol: normalizeSpotSymbol,
  },
} as const;

export type ExchangeId = keyof typeof EXCHANGES;

export const parseExchangeId = (value: string | null | undefined): ExchangeId => {
  const normalized = value?.toLowerCase();
  return normalized && normalized in EXCHANGES ? (normalized as ExchangeId) : "bitget";
};
