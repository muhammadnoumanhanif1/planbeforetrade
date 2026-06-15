// tests/breakoutStrategy.test.ts

import { describe, it, expect } from 'vitest';
import { detectBreakout, VOLUME_SPIKE_MULTIPLIER, MIN_CANDLE_BODY_RATIO } from '../src/features/smart-trading-engine/breakoutStrategy';
import { Candle } from '../src/features/smart-trading-engine/signalGenerator';

function makeCandle(close: number, opts: Partial<Candle> = {}): Candle {
    return {
      timestamp: Date.now(),
      open: opts.open ?? close * 0.99,
      high: opts.high ?? close * 1.01,
      low: opts.low ?? close * 0.98,
      close,
      volume: opts.volume ?? 1000,
    };
  }
  
  function makeCandles(n: number, basePrice = 100, baseVolume = 1000): Candle[] {
    return Array.from({ length: n }, (_, i) =>
      makeCandle(basePrice + i * 0.1, { volume: baseVolume })
    );
  }

describe('breakoutStrategy', () => {
  const resistance = 105;
  const support = 95;

  it('should detect a BUY breakout', () => {
    const candles = makeCandles(20, 100);
    const breakoutCandle = makeCandle(106, {
      open: 104,
      volume: 2000 * VOLUME_SPIKE_MULTIPLIER,
    });
    const result = detectBreakout([...candles, breakoutCandle], resistance, support);
    expect(result.type).toBe('BREAKOUT_BUY');
    expect(result.level).toBe(resistance);
  });

  it('should detect a SELL breakout', () => {
    const candles = makeCandles(20, 100);
    const breakoutCandle = makeCandle(94, {
      open: 96,
      volume: 2000 * VOLUME_SPIKE_MULTIPLIER,
    });
    const result = detectBreakout([...candles, breakoutCandle], resistance, support);
    expect(result.type).toBe('BREAKOUT_SELL');
    expect(result.level).toBe(support);
  });

  it('should not detect a breakout on low volume', () => {
    const candles = makeCandles(20, 100);
    const breakoutCandle = makeCandle(106, { open: 104, volume: 500 });
    const result = detectBreakout([...candles, breakoutCandle], resistance, support);
    expect(result.type).toBe('NONE');
  });

  it('should not detect a breakout on a weak candle', () => {
    const candles = makeCandles(20, 100);
    // A doji candle with small body
    const weakCandle = makeCandle(106, { open: 105.9, volume: 2000 * VOLUME_SPIKE_MULTIPLIER });
    const result = detectBreakout([...candles, weakCandle], resistance, support);
    expect(result.type).toBe('NONE');
  });
});
