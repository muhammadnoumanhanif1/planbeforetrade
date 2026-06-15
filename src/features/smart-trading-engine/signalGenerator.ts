// src/features/smart-trading-engine/signalGenerator.ts

/**
 * CORE TRADING LOGIC (SMC + PRICE ACTION)
 *
 * BUY:
 * - Uptrend (HH, HL)
 * - Entry near SUPPORT
 *
 * SELL:
 * - Downtrend (LH, LL)
 * - Entry near RESISTANCE
 *
 * Avoid sideways market
 */

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export enum Trend {
  UPTREND = 'Uptrend',
  DOWNTREND = 'Downtrend',
  SIDEWAYS = 'Sideways',
}

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface Signal {
  type: SignalType;
  symbol: string;
  exchange: string;
  entryZone: {
    min: number;
    max: number;
  };
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: string;
}

/**
 * Determines the market trend based on a series of candles.
 * @param candles - An array of historical candle data.
 * @returns The identified trend (Uptrend, Downtrend, or Sideways).
 */
export function identifyTrend(candles: Candle[], period: number = 10): Trend {
  if (candles.length < period) {
    return Trend.SIDEWAYS;
  }

  const recentCandles = candles.slice(-period);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);

  let higherHighs = 0;
  let higherLows = 0;
  let lowerHighs = 0;
  let lowerLows = 0;

  for (let i = 1; i < highs.length; i++) {
    if (highs[i] > highs[i - 1]) higherHighs++;
    if (lows[i] > lows[i - 1]) higherLows++;
    if (highs[i] < highs[i - 1]) lowerHighs++;
    if (lows[i] < lows[i - 1]) lowerLows++;
  }

  if (higherHighs > period * 0.6 && higherLows > period * 0.6) {
    return Trend.UPTREND;
  }

  if (lowerHighs > period * 0.6 && lowerLows > period * 0.6) {
    return Trend.DOWNTREND;
  }

  return Trend.SIDEWAYS;
}

import { detectBreakout } from './breakoutStrategy';

// ... (keep existing interfaces and identifyTrend function)

/**
 * Generates trading signals based on market data and trading logic.
 * @param candles - An array of historical candle data for a specific symbol.
 * @param symbol - The trading symbol (e.g., 'BTCUSDT').
 * @param exchange - The exchange name (e.g., 'Binance').
 * @returns A trading signal or null if no signal is generated.
 */
export function generateSignal(candles: Candle[], symbol: string, exchange: string): Signal | null {
  if (candles.length < 20) return null;

  const trend = identifyTrend(candles, 20);
  const currentPrice = candles[candles.length - 1].close;
  
  const recentCandles = candles.slice(-20);
  const support = Math.min(...recentCandles.map(c => c.low));
  const resistance = Math.max(...recentCandles.map(c => c.high));

  // Strategy 1: Trend-following near S/R
  const isNearSupport = Math.abs(currentPrice - support) / support < 0.02;
  const isNearResistance = Math.abs(currentPrice - resistance) / resistance < 0.02;

  if (trend === Trend.UPTREND && isNearSupport) {
    const entryPrice = currentPrice;
    const stopLoss = entryPrice * 0.98;
    const takeProfit = entryPrice * 1.06; // 1:3 R:R

    return {
      type: SignalType.BUY,
      symbol,
      exchange,
      entryZone: { min: entryPrice * 0.99, max: entryPrice * 1.01 },
      stopLoss,
      takeProfit,
      riskRewardRatio: '1:3',
    };
  }

  if (trend === Trend.DOWNTREND && isNearResistance) {
    const entryPrice = currentPrice;
    const stopLoss = entryPrice * 1.02;
    const takeProfit = entryPrice * 0.94; // 1:3 R:R

    return {
      type: SignalType.SELL,
      symbol,
      exchange,
      entryZone: { min: entryPrice * 0.99, max: entryPrice * 1.01 },
      stopLoss,
      takeProfit,
      riskRewardRatio: '1:3',
    };
  }

  // Strategy 2: Breakout signals
  const breakoutResult = detectBreakout(candles, resistance, support);
  if (breakoutResult.type === 'BREAKOUT_BUY') {
    const entryPrice = breakoutResult.level!;
    const stopLoss = entryPrice * 0.98;
    const takeProfit = entryPrice * 1.06;
    return {
        type: SignalType.BUY,
        symbol,
        exchange,
        entryZone: { min: entryPrice, max: entryPrice * 1.01 },
        stopLoss,
        takeProfit,
        riskRewardRatio: '1:3',
      };
  }

  if (breakoutResult.type === 'BREAKOUT_SELL') {
    const entryPrice = breakoutResult.level!;
    const stopLoss = entryPrice * 1.02;
    const takeProfit = entryPrice * 0.94;
    return {
        type: SignalType.SELL,
        symbol,
        exchange,
        entryZone: { min: entryPrice * 0.99, max: entryPrice },
        stopLoss,
        takeProfit,
        riskRewardRatio: '1:3',
      };
  }


  return null;
}


