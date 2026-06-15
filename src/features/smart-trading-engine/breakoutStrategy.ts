// src/features/smart-trading-engine/breakoutStrategy.ts

import { Candle } from './signalGenerator';

export const VOLUME_SPIKE_MULTIPLIER = 1.5;
export const MIN_CANDLE_BODY_RATIO = 0.6;

export interface BreakoutResult {
  type: 'BREAKOUT_BUY' | 'BREAKOUT_SELL' | 'RETEST_CONFIRM_BUY' | 'RETEST_CONFIRM_SELL' | 'NONE';
  level?: number;
}

/**
 * Detects a breakout from a support or resistance level.
 * @param candles - The historical candle data.
 * @param resistance - The resistance level.
 * @param support - The support level.
 * @returns A breakout result.
 */
export function detectBreakout(candles: Candle[], resistance: number, support: number): BreakoutResult {
  if (candles.length < 2) {
    return { type: 'NONE' };
  }

  const lastCandle = candles[candles.length - 1];
  const avgVolume = candles.slice(0, -1).reduce((acc, c) => acc + c.volume, 0) / (candles.length - 1);

  const isVolumeSpike = lastCandle.volume > avgVolume * VOLUME_SPIKE_MULTIPLIER;
  const bodySize = Math.abs(lastCandle.close - lastCandle.open);
  const totalRange = lastCandle.high - lastCandle.low;
  const isStrongCandle = totalRange > 0 && (bodySize / totalRange) >= MIN_CANDLE_BODY_RATIO;

  if (isVolumeSpike && isStrongCandle) {
    if (lastCandle.close > resistance) {
      return { type: 'BREAKOUT_BUY', level: resistance };
    }
    if (lastCandle.close < support) {
      return { type: 'BREAKOUT_SELL', level: support };
    }
  }

  return { type: 'NONE' };
}
