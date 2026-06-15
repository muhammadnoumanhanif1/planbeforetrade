import type { EntryZone, MarketTrend, TradeAction } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TREND_WEIGHT = 0.35;
const DISTANCE_WEIGHT = 0.3;
const RSI_WEIGHT = 0.2;
const EMA_WEIGHT = 0.15;

const scoreRsi = (action: TradeAction, rsi: number) => {
  if (action === "BUY") {
    if (rsi >= 45 && rsi <= 60) return 100;
    if (rsi >= 40 && rsi < 45) return 75;
    if (rsi > 60 && rsi <= 65) return 60;
    return 35;
  }

  if (action === "SELL") {
    if (rsi >= 40 && rsi <= 55) return 100;
    if (rsi > 55 && rsi <= 60) return 75;
    if (rsi >= 35 && rsi < 40) return 60;
    return 35;
  }

  return 45;
};

const scoreEma = (action: TradeAction, trend: MarketTrend, ema20: number, ema50: number) => {
  if (action === "BUY") return trend === "UPTREND" && ema20 > ema50 ? 100 : 40;
  if (action === "SELL") return trend === "DOWNTREND" && ema20 < ema50 ? 100 : 40;
  return Math.abs(ema20 - ema50) / Math.max(Math.abs(ema50), 1) > 0.002 ? 55 : 45;
};

const scoreDistance = (distanceToEntryZone: number | null, entryZone: EntryZone) => {
  if (!entryZone || distanceToEntryZone === null) return 30;
  if (distanceToEntryZone === 0) return 100;
  if (distanceToEntryZone <= 0.0025) return 85;
  if (distanceToEntryZone <= 0.0075) return 65;
  if (distanceToEntryZone <= 0.015) return 45;
  return 25;
};

export const calculateConfidenceScore = (params: {
  trendStrength: number;
  distanceToEntryZone: number | null;
  entryZone: EntryZone;
  action: TradeAction;
  trend: MarketTrend;
  rsi: number;
  ema20: number;
  ema50: number;
}) => {
  const trendScore = clamp(params.trendStrength, 0, 100);
  const distanceScore = scoreDistance(params.distanceToEntryZone, params.entryZone);
  const rsiScore = scoreRsi(params.action, params.rsi);
  const emaScore = scoreEma(params.action, params.trend, params.ema20, params.ema50);

  const weighted =
    trendScore * TREND_WEIGHT +
    distanceScore * DISTANCE_WEIGHT +
    rsiScore * RSI_WEIGHT +
    emaScore * EMA_WEIGHT;
  return clamp(Math.round(weighted), 0, 100);
};
