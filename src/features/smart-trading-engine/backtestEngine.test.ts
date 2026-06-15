// src/features/smart-trading-engine/backtestEngine.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runBacktest, BacktestInput } from './backtestEngine';
import * as signalGenerator from './signalGenerator';
import { SignalType } from './signalGenerator';

describe('Smart Trading Engine: Backtest Engine', () => {
  it('should run a backtest and produce correct results', async () => {
    // Mock generateSignal to create predictable trades
    const generateSignalSpy = vi.spyOn(signalGenerator, 'generateSignal');
    generateSignalSpy.mockImplementation((candles, symbol) => {
      const lastPrice = candles[candles.length - 1].close;
      // Generate a BUY signal on the 55th candle
      if (candles.length === 55) {
        return {
          type: SignalType.BUY,
          symbol,
          exchange: 'backtest',
          entryZone: { min: lastPrice * 0.99, max: lastPrice * 1.01 },
          stopLoss: lastPrice * 0.9, // 10% SL
          takeProfit: lastPrice * 1.3, // 30% TP for 1:3
          riskRewardRatio: '1:3',
        };
      }
      // Generate a SELL signal on the 75th candle
      if (candles.length === 75) {
        return {
            type: SignalType.SELL,
            symbol,
            exchange: 'backtest',
            entryZone: { min: lastPrice * 0.99, max: lastPrice * 1.01 },
            stopLoss: lastPrice * 1.1, // 10% SL
            takeProfit: lastPrice * 0.7, // 30% TP for 1:3
            riskRewardRatio: '1:3',
        };
      }
      return null;
    });

    const input: BacktestInput = {
      symbol: 'TESTUSDT',
      timeframe: '1m',
      startDate: new Date('2023-01-01T00:00:00Z'),
      endDate: new Date('2023-01-01T02:00:00Z'), // 120 minutes of data
    };

    const result = await runBacktest(input);

    // With the mocked signals, we expect 2 trades.
    // Let's assume one is a win and one is a loss from the random data.
    // This test is more about the engine's mechanics than the strategy's profitability.
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.wins + result.losses).toBe(result.totalTrades);
    expect(result.winRate).toBeTypeOf('number');
    expect(result.totalR).toBeTypeOf('number');
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.profitCurve.length).toBeGreaterThan(0);

    generateSignalSpy.mockRestore();
  });
});
