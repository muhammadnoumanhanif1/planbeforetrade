import type { MarketCandle, MarketTrend, TrendDetectionResult } from "./types";

const SWING_LOOKBACK = 2;
const MAX_VOTE_DIFFERENCE = 4;
const STRUCTURE_BONUS_WEIGHT = 0.35;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const calculateEma = (values: number[], period: number): number => {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let index = 1; index < values.length; index += 1) {
    ema = values[index] * k + ema * (1 - k);
  }
  return ema;
};

export const calculateRsi = (closes: number[], period = 14): number => {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return clamp(100 - 100 / (1 + rs), 0, 100);
};

const detectSwings = (candles: MarketCandle[]) => {
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = SWING_LOOKBACK; i < candles.length - SWING_LOOKBACK; i += 1) {
    const current = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let offset = 1; offset <= SWING_LOOKBACK; offset += 1) {
      const left = candles[i - offset];
      const right = candles[i + offset];
      if (current.high <= left.high || current.high <= right.high) isSwingHigh = false;
      if (current.low >= left.low || current.low >= right.low) isSwingLow = false;
    }

    if (isSwingHigh) highs.push(current.high);
    if (isSwingLow) lows.push(current.low);
  }

  return { highs, lows };
};

const inferStructureTrend = (highs: number[], lows: number[]): MarketTrend => {
  if (highs.length < 2 || lows.length < 2) return "SIDEWAYS";
  const recentHighs = highs.slice(-2);
  const recentLows = lows.slice(-2);
  const higherHighs = recentHighs[1] > recentHighs[0];
  const higherLows = recentLows[1] > recentLows[0];
  const lowerHighs = recentHighs[1] < recentHighs[0];
  const lowerLows = recentLows[1] < recentLows[0];

  if (higherHighs && higherLows) return "UPTREND";
  if (lowerHighs && lowerLows) return "DOWNTREND";
  return "SIDEWAYS";
};

export const detectMarketTrend = (candles: MarketCandle[]): TrendDetectionResult => {
  const closes = candles.map((candle) => candle.close);
  const ema20 = calculateEma(closes, 20);
  const ema50 = calculateEma(closes, 50);
  const rsi = calculateRsi(closes, 14);
  const { highs, lows } = detectSwings(candles);
  const structureTrend = inferStructureTrend(highs, lows);
  const reasons: string[] = [];

  let upVotes = 0;
  let downVotes = 0;

  if (structureTrend === "UPTREND") {
    upVotes += 2;
    reasons.push("Market structure shows higher highs and higher lows.");
  } else if (structureTrend === "DOWNTREND") {
    downVotes += 2;
    reasons.push("Market structure shows lower highs and lower lows.");
  } else {
    reasons.push("Market structure is currently mixed.");
  }

  if (ema20 > ema50) {
    upVotes += 1;
    reasons.push("EMA 20 is above EMA 50.");
  } else if (ema20 < ema50) {
    downVotes += 1;
    reasons.push("EMA 20 is below EMA 50.");
  }

  if (rsi > 55) upVotes += 1;
  else if (rsi < 45) downVotes += 1;

  const trend: MarketTrend =
    upVotes >= 3 && upVotes > downVotes
      ? "UPTREND"
      : downVotes >= 3 && downVotes > upVotes
        ? "DOWNTREND"
        : "SIDEWAYS";

  if (trend === "SIDEWAYS") {
    reasons.push("Signals are not aligned strongly enough for a directional trend.");
  }

  const voteStrength = clamp(Math.abs(upVotes - downVotes) / MAX_VOTE_DIFFERENCE, 0, 1);
  const structureBonus = structureTrend !== "SIDEWAYS" ? STRUCTURE_BONUS_WEIGHT : 0;
  const trendStrength = clamp(Math.round((voteStrength * 0.65 + structureBonus) * 100), 0, 100);

  return { trend, ema20, ema50, rsi, reasons, trendStrength };
};
