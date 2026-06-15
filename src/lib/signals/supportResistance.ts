import type { MarketCandle, SupportResistanceResult } from "./types";

const SWING_WINDOW = 2;

const uniqueRounded = (values: number[], precision = 6) => {
  const multiplier = 10 ** precision;
  return Array.from(new Set(values.map((value) => Math.round(value * multiplier) / multiplier)));
};

export const detectSupportResistance = (
  candles: MarketCandle[],
  currentPrice: number
): SupportResistanceResult => {
  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = SWING_WINDOW; i < candles.length - SWING_WINDOW; i += 1) {
    const current = candles[i];
    let isLocalMin = true;
    let isLocalMax = true;

    for (let j = 1; j <= SWING_WINDOW; j += 1) {
      const left = candles[i - j];
      const right = candles[i + j];
      if (current.low >= left.low || current.low >= right.low) isLocalMin = false;
      if (current.high <= left.high || current.high <= right.high) isLocalMax = false;
    }

    if (isLocalMin) supports.push(current.low);
    if (isLocalMax) resistances.push(current.high);
  }

  const dedupedSupports = uniqueRounded(supports).sort((a, b) => b - a);
  const dedupedResistances = uniqueRounded(resistances).sort((a, b) => a - b);

  const nearestSupport =
    dedupedSupports.find((level) => level <= currentPrice) ??
    Math.min(...candles.map((candle) => candle.low));

  const nearestResistance =
    dedupedResistances.find((level) => level >= currentPrice) ??
    Math.max(...candles.map((candle) => candle.high));

  return {
    nearestSupport: Number.isFinite(nearestSupport) ? nearestSupport : null,
    nearestResistance: Number.isFinite(nearestResistance) ? nearestResistance : null,
    supports: dedupedSupports.slice(0, 10),
    resistances: dedupedResistances.slice(0, 10),
  };
};
