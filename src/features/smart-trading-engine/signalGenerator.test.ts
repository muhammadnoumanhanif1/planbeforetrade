// src/features/smart-trading-engine/signalGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateSignal, identifyTrend, Trend, SignalType, Candle } from './signalGenerator';

describe('Smart Trading Engine: Signal Generator', () => {
  const uptrendCandles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    timestamp: i,
    open: 100 + i * 2,
    high: 100 + i * 2 + 5,
    low: 100 + i * 2 - 2,
    close: 100 + i * 2 + 2,
    volume: 1000 + i * 50,
  }));

  const downtrendCandles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    timestamp: i,
    open: 200 - i * 2,
    high: 200 - i * 2 + 2,
    low: 200 - i * 2 - 5,
    close: 200 - i * 2 - 2,
    volume: 1500 - i * 50,
  }));

  const sidewaysCandles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
    timestamp: i,
    open: 150 + Math.sin(i) * 5,
    high: 155,
    low: 145,
    close: 150 + Math.cos(i) * 5,
    volume: 1000,
  }));

  it('should identify an uptrend', () => {
    const trend = identifyTrend(uptrendCandles, 20);
    expect(trend).toBe(Trend.UPTREND);
  });

  it('should identify a downtrend', () => {
    const trend = identifyTrend(downtrendCandles, 20);
    expect(trend).toBe(Trend.DOWNTREND);
  });

  it('should identify a sideways market', () => {
    const trend = identifyTrend(sidewaysCandles, 20);
    expect(trend).toBe(Trend.SIDEWAYS);
  });

  it('should generate a BUY signal in an uptrend near support', () => {
    const candles = [...uptrendCandles, ...uptrendCandles];
    const support = Math.min(...candles.slice(-20).map(c => c.low));
    candles[candles.length - 1].close = support; // Set price to actual support
    const signal = generateSignal(candles, 'BTCUSDT', 'Binance');
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe(SignalType.BUY);
    expect(signal?.riskRewardRatio).toBe('1:3');
  });

  it('should generate a SELL signal in a downtrend near resistance', () => {
    const candles = [...downtrendCandles, ...downtrendCandles];
    const resistance = Math.max(...candles.slice(-20).map(c => c.high));
    candles[candles.length - 1].close = resistance; // Set price to actual resistance
    const signal = generateSignal(candles, 'ETHUSDT', 'Bybit');
    expect(signal).not.toBeNull();
    expect(signal?.type).toBe(SignalType.SELL);
  });

  it('should not generate a signal in a sideways market', () => {
    const signal = generateSignal(sidewaysCandles, 'ADAUSDT', 'Binance');
    expect(signal).toBeNull();
  });
});

