// src/lib/rsi.ts

import { Candle } from "@/features/smart-trading-engine/signalGenerator";

export function calculateRSI(candles: Candle[], period: number = 14): number | null {
    if (candles.length < period) {
      return null;
    }
  
    const changes = candles.map((c, i) => (i > 0 ? c.close - candles[i - 1].close : 0));
    const gains = changes.map(c => (c > 0 ? c : 0));
    const losses = changes.map(c => (c < 0 ? -c : 0));
  
    let avgGain = gains.slice(1, period + 1).reduce((acc, val) => acc + val, 0) / period;
    let avgLoss = losses.slice(1, period + 1).reduce((acc, val) => acc + val, 0) / period;
  
    for (let i = period + 1; i < candles.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }
  
    if (avgLoss === 0) {
      return 100;
    }
  
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
  
    return rsi;
  }
  