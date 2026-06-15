import type { MarketCandle, SupportResistanceResult } from "./types";

export type BreakoutType = "BREAKOUT_BUY" | "BREAKOUT_SELL" | "NONE";

export type BreakoutResult = {
  type: BreakoutType;
  level: number | null;
  isRetesting: boolean;
  isConfirmed: boolean;
  volumeConfirmed: boolean;
  strongCandle: boolean;
  isFakeBreakout: boolean;
};

export const VOLUME_SPIKE_MULTIPLIER = 1.5;
export const MIN_CANDLE_BODY_RATIO = 0.5;

function avgVolume(candles: MarketCandle[]): number {
  const slice = candles.slice(-20);
  if (!slice.length) return 0;
  const total = slice.reduce((sum, c) => sum + (c.volume ?? 0), 0);
  return total / slice.length;
}

export function detectBreakout(
  candles: MarketCandle[],
  levels: SupportResistanceResult
): BreakoutResult {
  const none: BreakoutResult = {
    type: "NONE",
    level: null,
    isRetesting: false,
    isConfirmed: false,
    volumeConfirmed: false,
    strongCandle: false,
    isFakeBreakout: false,
  };

  if (candles.length < 2) return none;

  const last5 = candles.slice(-5);
  const lastCandle = last5[last5.length - 1];
  const avg = avgVolume(candles);

  const volumeConfirmed = avg > 0 && (lastCandle.volume ?? 0) > avg * VOLUME_SPIKE_MULTIPLIER;

  const range = lastCandle.high - lastCandle.low;
  const body = Math.abs(lastCandle.close - lastCandle.open);
  const strongCandle = range > 0 ? body / range > MIN_CANDLE_BODY_RATIO : false;

  const isFakeBreakout = !volumeConfirmed || !strongCandle;

  // Resistance breakout — BUY setup
  if (
    levels.nearestResistance !== null &&
    lastCandle.close > levels.nearestResistance
  ) {
    const resistance = levels.nearestResistance;
    const retestCandles = candles.slice(-4, -1); // last 3 before final candle
    const isRetesting = retestCandles.some(
      (c) => Math.abs(c.close - resistance) / resistance <= 0.005
    );
    const isConfirmed = isRetesting && lastCandle.close > resistance;

    return {
      type: "BREAKOUT_BUY",
      level: resistance,
      isRetesting,
      isConfirmed,
      volumeConfirmed,
      strongCandle,
      isFakeBreakout,
    };
  }

  // Support breakdown — SELL setup
  if (
    levels.nearestSupport !== null &&
    lastCandle.close < levels.nearestSupport
  ) {
    const support = levels.nearestSupport;
    const retestCandles = candles.slice(-4, -1);
    const isRetesting = retestCandles.some(
      (c) => Math.abs(c.close - support) / support <= 0.005
    );
    const isConfirmed = isRetesting && lastCandle.close < support;

    return {
      type: "BREAKOUT_SELL",
      level: support,
      isRetesting,
      isConfirmed,
      volumeConfirmed,
      strongCandle,
      isFakeBreakout,
    };
  }

  return none;
}
