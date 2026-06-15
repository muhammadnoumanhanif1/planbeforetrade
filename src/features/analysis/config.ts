import type { Exchange } from "./types";

export const EXCHANGE_OPTIONS: { value: Exchange; label: string }[] = [
  { value: "binance", label: "Binance" },
  { value: "bitget", label: "Bitget" },
  { value: "mexc", label: "MEXC" },
];

export const TIMEFRAME_OPTIONS = [
  { value: "1min", label: "1m" },
  { value: "3min", label: "3m" },
  { value: "5min", label: "5m" },
  { value: "15min", label: "15m" },
  { value: "30min", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "6h", label: "6h" },
  { value: "12h", label: "12h" },
  { value: "1day", label: "1D" },
  { value: "1week", label: "1W" },
];
