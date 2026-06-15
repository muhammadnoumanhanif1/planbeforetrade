// src/features/smart-trading-engine/marketScanner.test.ts
import { describe, it, expect, vi } from 'vitest';
import { scanMarket } from './marketScanner';
import * as signalGenerator from './signalGenerator';
import * as aiScoring from './aiScoring';
import { SignalType, Signal } from './signalGenerator';
import { SignalRank } from './aiScoring';

describe('Smart Trading Engine: Market Scanner', () => {
  it('should scan the market, rank signals, and sort them', async () => {
    // Mock generateSignal
    const generateSignalSpy = vi.spyOn(signalGenerator, 'generateSignal');
    generateSignalSpy.mockImplementation((candles, symbol) => {
      if (['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(symbol)) {
        return {
          type: symbol === 'ETHUSDT' ? SignalType.SELL : SignalType.BUY,
          symbol,
          exchange: 'Binance',
          entryZone: { min: 1, max: 2 },
          stopLoss: 0.9,
          takeProfit: 2.2,
          riskRewardRatio: '1:3',
        };
      }
      return null;
    });

    // Mock rankSignal
    const rankSignalSpy = vi.spyOn(aiScoring, 'rankSignal');
    rankSignalSpy.mockImplementation((signal: Signal) => {
      let aiScore = 50;
      if (signal.symbol === 'BTCUSDT') aiScore = 85;
      if (signal.symbol === 'ETHUSDT') aiScore = 75;
      if (signal.symbol === 'SOLUSDT') aiScore = 95;
      return {
        ...signal,
        aiScore,
        rank: aiScore >= 80 ? SignalRank.HIGH : SignalRank.MEDIUM,
      };
    });

    const signals = await scanMarket('Binance');

    expect(signals).toHaveLength(3);
    expect(signals.map(s => s.symbol)).toEqual(['SOLUSDT', 'BTCUSDT', 'ETHUSDT']);
    expect(signals[0].aiScore).toBe(95);
    expect(signals[1].aiScore).toBe(85);
    expect(signals[2].aiScore).toBe(75);
    expect(signals[0].rank).toBe(SignalRank.HIGH);

    generateSignalSpy.mockRestore();
    rankSignalSpy.mockRestore();
  });
});

