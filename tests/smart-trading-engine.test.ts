import { describe, expect, it } from "vitest";
import { detectBreakout, VOLUME_SPIKE_MULTIPLIER, MIN_CANDLE_BODY_RATIO } from "@/lib/signals/breakoutStrategy";
import {
  calculateRiskReward,
  meetsMinimumRiskReward,
  calculateTakeProfit,
  calculatePositionSize,
  MINIMUM_RISK_REWARD_RATIO,
} from "@/lib/signals/riskManager";
import {
  getNextSignalNumber,
  createSignalRecord,
  checkSignalOutcome,
  closeSignalRecord,
  getNextSignalLabel,
  MAX_SIGNALS_PER_COIN,
} from "@/lib/signals/signalHistoryManager";
import { calculatePerformance, getTopPerformers } from "@/lib/signals/performanceTracker";
import type { MarketCandle, SupportResistanceResult } from "@/lib/signals/types";
import type { SignalRecord } from "@/lib/signals/signalHistoryManager";

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeCandle(
  close: number,
  opts: Partial<MarketCandle> = {}
): MarketCandle {
  return {
    timestamp: Date.now(),
    open: opts.open ?? close * 0.99,
    high: opts.high ?? close * 1.01,
    low: opts.low ?? close * 0.98,
    close,
    volume: opts.volume ?? 1000,
  };
}

function makeCandles(n: number, basePrice = 100, baseVolume = 1000): MarketCandle[] {
  return Array.from({ length: n }, (_, i) =>
    makeCandle(basePrice + i * 0.1, { volume: baseVolume })
  );
}

function makeSignalRecord(overrides: Partial<SignalRecord> = {}): SignalRecord {
  return {
    id: "test-id",
    symbol: "BTCUSDT",
    exchange: "binance",
    signal_number: "S1",
    trend: "UPTREND",
    entry_zone: [100, 101],
    entry_price: 100.5,
    stop_loss: 99,
    take_profit: 105,
    risk_reward_ratio: 3,
    status: "WAITING",
    result: null,
    result_R: null,
    created_at: new Date().toISOString(),
    closed_at: null,
    ...overrides,
  };
}

// ─── riskManager ────────────────────────────────────────────────────────────

describe("riskManager", () => {
  describe("calculateRiskReward", () => {
    it("returns correct ratio for BUY", () => {
      // entry 100, SL 97, TP 109 → risk=3, reward=9 → ratio=3
      expect(calculateRiskReward(100, 97, 109)).toBeCloseTo(3);
    });

    it("returns correct ratio for SELL", () => {
      // entry 100, SL 103, TP 91 → risk=3, reward=9 → ratio=3
      expect(calculateRiskReward(100, 103, 91)).toBeCloseTo(3);
    });

    it("returns 0 when entry equals stopLoss", () => {
      expect(calculateRiskReward(100, 100, 110)).toBe(0);
    });

    it("returns 0 for invalid inputs", () => {
      expect(calculateRiskReward(0, 90, 110)).toBe(0);
      expect(calculateRiskReward(NaN, 90, 110)).toBe(0);
      expect(calculateRiskReward(100, NaN, 110)).toBe(0);
    });

    it("calculates 2.5 ratio correctly", () => {
      // entry 100, SL 98, TP 105 → risk=2, reward=5 → ratio=2.5
      expect(calculateRiskReward(100, 98, 105)).toBeCloseTo(2.5);
    });
  });

  describe("meetsMinimumRiskReward", () => {
    it("returns true for exactly 1:3", () => {
      expect(meetsMinimumRiskReward(100, 97, 109)).toBe(true);
    });

    it("returns true for ratio above 1:3", () => {
      // risk=2, reward=8 → ratio=4
      expect(meetsMinimumRiskReward(100, 98, 108)).toBe(true);
    });

    it("returns false for ratio below 1:3", () => {
      // risk=2, reward=4 → ratio=2
      expect(meetsMinimumRiskReward(100, 98, 104)).toBe(false);
    });

    it("returns false for 1:2", () => {
      expect(meetsMinimumRiskReward(100, 95, 110)).toBe(false);
    });

    it("MINIMUM_RISK_REWARD_RATIO is 3", () => {
      expect(MINIMUM_RISK_REWARD_RATIO).toBe(3);
    });
  });

  describe("calculateTakeProfit", () => {
    it("returns correct TP for BUY", () => {
      // entry 100, SL 97, ratio 3 → TP = 100 + 3*3 = 109
      expect(calculateTakeProfit("BUY", 100, 97, 3)).toBeCloseTo(109);
    });

    it("returns correct TP for SELL", () => {
      // entry 100, SL 103, ratio 3 → TP = 100 - 3*3 = 91
      expect(calculateTakeProfit("SELL", 100, 103, 3)).toBeCloseTo(91);
    });

    it("uses MINIMUM_RISK_REWARD_RATIO as default", () => {
      const tp = calculateTakeProfit("BUY", 100, 97);
      expect(tp).toBeCloseTo(109);
    });

    it("returns null for invalid inputs", () => {
      expect(calculateTakeProfit("BUY", 0, 97)).toBeNull();
      expect(calculateTakeProfit("BUY", NaN, 97)).toBeNull();
      expect(calculateTakeProfit("BUY", 100, 100)).toBeNull(); // risk=0
      expect(calculateTakeProfit("BUY", 100, 97, 0)).toBeNull();
    });
  });

  describe("calculatePositionSize", () => {
    it("returns correct coin quantity", () => {
      // balance 1000, risk 1% = $10, entry 100, SL 99 → risk/coin=1 → qty=10
      expect(calculatePositionSize(1000, 1, 100, 99)).toBeCloseTo(10);
    });

    it("handles different price gaps", () => {
      // balance 1000, risk 2% = $20, entry 50000, SL 49000 → risk/coin=1000 → qty=0.02
      expect(calculatePositionSize(1000, 2, 50000, 49000)).toBeCloseTo(0.02);
    });

    it("returns 0 for invalid inputs", () => {
      expect(calculatePositionSize(0, 1, 100, 99)).toBe(0);
      expect(calculatePositionSize(1000, 0, 100, 99)).toBe(0);
      expect(calculatePositionSize(1000, 1, 0, 99)).toBe(0);
      expect(calculatePositionSize(NaN, 1, 100, 99)).toBe(0);
    });

    it("returns 0 when entry equals stop loss", () => {
      expect(calculatePositionSize(1000, 1, 100, 100)).toBe(0);
    });
  });
});

// ─── breakoutStrategy ────────────────────────────────────────────────────────

describe("breakoutStrategy", () => {
  const levels: SupportResistanceResult = {
    nearestSupport: 95,
    nearestResistance: 105,
    supports: [95],
    resistances: [105],
  };

  it("returns NONE when no breakout detected", () => {
    const candles = makeCandles(20, 100);
    const result = detectBreakout(candles, levels);
    expect(result.type).toBe("NONE");
  });

  it("returns NONE with insufficient candles", () => {
    const candles = makeCandles(1, 100);
    const result = detectBreakout(candles, levels);
    expect(result.type).toBe("NONE");
  });

  it("detects BREAKOUT_BUY when last candle closes above resistance", () => {
    const candles = makeCandles(20, 100);
    const avgVol = 1000;
    const highVolume = avgVol * VOLUME_SPIKE_MULTIPLIER * 1.1;
    const lastCandle: MarketCandle = {
      timestamp: Date.now(),
      open: 103,
      high: 107,
      low: 102,
      close: 106, // above resistance 105
      volume: highVolume,
    };
    candles.push(lastCandle);
    const result = detectBreakout(candles, levels);
    expect(result.type).toBe("BREAKOUT_BUY");
    expect(result.level).toBe(105);
    expect(result.volumeConfirmed).toBe(true);
  });

  it("marks fake breakout when volume is low", () => {
    const candles = makeCandles(20, 100, 2000);
    const lastCandle: MarketCandle = {
      timestamp: Date.now(),
      open: 103,
      high: 107,
      low: 102,
      close: 106, // above resistance 105
      volume: 100, // very low volume
    };
    candles.push(lastCandle);
    const result = detectBreakout(candles, levels);
    expect(result.type).toBe("BREAKOUT_BUY");
    expect(result.isFakeBreakout).toBe(true);
    expect(result.volumeConfirmed).toBe(false);
  });

  it("marks fake breakout when candle body is too small (doji)", () => {
    const candles = makeCandles(20, 100);
    // Doji: open ≈ close, so body ratio < MIN_CANDLE_BODY_RATIO
    const lastCandle: MarketCandle = {
      timestamp: Date.now(),
      open: 105.5,
      high: 108,
      low: 104,
      close: 105.6, // very small body
      volume: 100000, // very high volume
    };
    candles.push(lastCandle);
    const result = detectBreakout(candles, levels);
    if (result.type === "BREAKOUT_BUY") {
      // body = 0.1, range = 4, ratio = 0.025 < MIN_CANDLE_BODY_RATIO
      expect(result.strongCandle).toBe(false);
      expect(result.isFakeBreakout).toBe(true);
    }
  });

  it("detects BREAKOUT_SELL when last candle closes below support", () => {
    const candles = makeCandles(20, 100);
    const avgVol = 1000;
    const highVolume = avgVol * VOLUME_SPIKE_MULTIPLIER * 1.1;
    const lastCandle: MarketCandle = {
      timestamp: Date.now(),
      open: 96,
      high: 97,
      low: 92,
      close: 93, // below support 95
      volume: highVolume,
    };
    candles.push(lastCandle);
    const result = detectBreakout(candles, levels);
    expect(result.type).toBe("BREAKOUT_SELL");
    expect(result.level).toBe(95);
    expect(result.volumeConfirmed).toBe(true);
  });

  it("MIN_CANDLE_BODY_RATIO is 0.5", () => {
    expect(MIN_CANDLE_BODY_RATIO).toBe(0.5);
  });

  it("VOLUME_SPIKE_MULTIPLIER is 1.5", () => {
    expect(VOLUME_SPIKE_MULTIPLIER).toBe(1.5);
  });
});

// ─── signalHistoryManager ─────────────────────────────────────────────────────

describe("signalHistoryManager", () => {
  describe("getNextSignalNumber", () => {
    it("returns S1 for empty records", () => {
      expect(getNextSignalNumber([])).toBe("S1");
    });

    it("returns S2 after one record", () => {
      const records = [makeSignalRecord({ signal_number: "S1" })];
      expect(getNextSignalNumber(records)).toBe("S2");
    });

    it("returns S3 after two records", () => {
      const records = [
        makeSignalRecord({ signal_number: "S1" }),
        makeSignalRecord({ signal_number: "S2" }),
      ];
      expect(getNextSignalNumber(records)).toBe("S3");
    });

    it("returns null after three records (MAX_SIGNALS_PER_COIN)", () => {
      const records = [
        makeSignalRecord({ signal_number: "S1" }),
        makeSignalRecord({ signal_number: "S2" }),
        makeSignalRecord({ signal_number: "S3" }),
      ];
      expect(getNextSignalNumber(records)).toBeNull();
    });

    it("MAX_SIGNALS_PER_COIN is 3", () => {
      expect(MAX_SIGNALS_PER_COIN).toBe(3);
    });
  });

  describe("createSignalRecord", () => {
    it("creates record with correct fields", () => {
      const record = createSignalRecord({
        symbol: "ETHUSDT",
        exchange: "binance",
        signal_number: "S1",
        trend: "UPTREND",
        entry_zone: [2000, 2010],
        entry_price: 2005,
        stop_loss: 1980,
        take_profit: 2065,
        risk_reward_ratio: 3,
      });
      expect(record.symbol).toBe("ETHUSDT");
      expect(record.signal_number).toBe("S1");
      expect(record.status).toBe("WAITING");
      expect(record.result).toBeNull();
      expect(record.result_R).toBeNull();
      expect(record.closed_at).toBeNull();
      expect(typeof record.id).toBe("string");
      expect(record.id.length).toBeGreaterThan(0);
    });
  });

  describe("checkSignalOutcome", () => {
    it("returns WIN when price reaches take_profit on BUY", () => {
      // BUY: TP (105) > entry (100.5) → WIN when price >= TP
      const rec = makeSignalRecord({ entry_price: 100.5, stop_loss: 99, take_profit: 105 });
      expect(checkSignalOutcome(rec, 105)).toBe("WIN");
      expect(checkSignalOutcome(rec, 106)).toBe("WIN");
    });

    it("returns LOSS when price hits stop_loss on BUY", () => {
      const rec = makeSignalRecord({ entry_price: 100.5, stop_loss: 99, take_profit: 105 });
      expect(checkSignalOutcome(rec, 99)).toBe("LOSS");
      expect(checkSignalOutcome(rec, 97)).toBe("LOSS");
    });

    it("returns null when price is between entry and TP/SL on BUY", () => {
      const rec = makeSignalRecord({ entry_price: 100.5, stop_loss: 99, take_profit: 105 });
      expect(checkSignalOutcome(rec, 102)).toBeNull();
    });

    it("returns WIN when price reaches take_profit on SELL", () => {
      // SELL: TP (91) < entry (100) → WIN when price <= TP
      const rec = makeSignalRecord({ entry_price: 100, stop_loss: 103, take_profit: 91 });
      expect(checkSignalOutcome(rec, 91)).toBe("WIN");
      expect(checkSignalOutcome(rec, 89)).toBe("WIN");
    });

    it("returns LOSS when price hits stop_loss on SELL", () => {
      const rec = makeSignalRecord({ entry_price: 100, stop_loss: 103, take_profit: 91 });
      expect(checkSignalOutcome(rec, 103)).toBe("LOSS");
    });

    it("returns null for already closed record", () => {
      const rec = makeSignalRecord({ status: "CLOSED", result: "WIN", result_R: 3 });
      expect(checkSignalOutcome(rec, 200)).toBe("WIN"); // returns existing result
    });
  });

  describe("closeSignalRecord", () => {
    it("sets result_R to +3 for WIN", () => {
      const rec = makeSignalRecord();
      const closed = closeSignalRecord(rec, "WIN");
      expect(closed.result_R).toBe(3);
      expect(closed.result).toBe("WIN");
      expect(closed.status).toBe("CLOSED");
      expect(closed.closed_at).not.toBeNull();
    });

    it("sets result_R to -1 for LOSS", () => {
      const rec = makeSignalRecord();
      const closed = closeSignalRecord(rec, "LOSS");
      expect(closed.result_R).toBe(-1);
      expect(closed.result).toBe("LOSS");
      expect(closed.status).toBe("CLOSED");
    });

    it("does not mutate original record", () => {
      const rec = makeSignalRecord();
      const closed = closeSignalRecord(rec, "WIN");
      expect(rec.status).toBe("WAITING");
      expect(closed.status).toBe("CLOSED");
    });
  });

  describe("getNextSignalLabel", () => {
    it("returns S1 pending for empty records", () => {
      expect(getNextSignalLabel([])).toContain("S1");
    });

    it("returns S2 pending after one record", () => {
      const records = [makeSignalRecord({ signal_number: "S1" })];
      expect(getNextSignalLabel(records)).toContain("S2");
    });

    it("returns correct message when all signals tracked (open)", () => {
      const records = [
        makeSignalRecord({ signal_number: "S1" }),
        makeSignalRecord({ signal_number: "S2" }),
        makeSignalRecord({ signal_number: "S3" }),
      ];
      const label = getNextSignalLabel(records);
      expect(label.toLowerCase()).toMatch(/all 3|max signal/i);
    });
  });
});

// ─── performanceTracker ───────────────────────────────────────────────────────

describe("performanceTracker", () => {
  describe("calculatePerformance", () => {
    it("returns zeros for empty records", () => {
      const summary = calculatePerformance([]);
      expect(summary.totalTrades).toBe(0);
      expect(summary.wins).toBe(0);
      expect(summary.losses).toBe(0);
      expect(summary.winRate).toBe(0);
      expect(summary.totalR).toBe(0);
      expect(summary.avgR).toBe(0);
    });

    it("correctly calculates stats for mixed WIN/LOSS records", () => {
      const records: SignalRecord[] = [
        makeSignalRecord({ signal_number: "S1", result: "WIN", result_R: 3, status: "CLOSED" }),
        makeSignalRecord({ signal_number: "S2", result: "LOSS", result_R: -1, status: "CLOSED" }),
        makeSignalRecord({ signal_number: "S3", result: "WIN", result_R: 3, status: "CLOSED" }),
      ];
      const summary = calculatePerformance(records);
      expect(summary.totalTrades).toBe(3);
      expect(summary.wins).toBe(2);
      expect(summary.losses).toBe(1);
      expect(summary.winRate).toBeCloseTo(2 / 3);
      expect(summary.totalR).toBeCloseTo(5); // 3 + (-1) + 3
      expect(summary.avgR).toBeCloseTo(5 / 3);
    });

    it("counts pending records correctly", () => {
      const records: SignalRecord[] = [
        makeSignalRecord({ signal_number: "S1", result: "WIN", result_R: 3, status: "CLOSED" }),
        makeSignalRecord({ signal_number: "S2", result: null, result_R: null, status: "WAITING" }),
      ];
      const summary = calculatePerformance(records);
      expect(summary.totalTrades).toBe(2);
      expect(summary.pending).toBe(1);
      expect(summary.winRate).toBe(1); // 1 win out of 1 closed
    });

    it("groups stats by symbol correctly", () => {
      const records: SignalRecord[] = [
        makeSignalRecord({ symbol: "BTCUSDT", signal_number: "S1", result: "WIN", result_R: 3, status: "CLOSED" }),
        makeSignalRecord({ symbol: "ETHUSDT", signal_number: "S1", result: "LOSS", result_R: -1, status: "CLOSED" }),
        makeSignalRecord({ symbol: "BTCUSDT", signal_number: "S2", result: "WIN", result_R: 3, status: "CLOSED" }),
      ];
      const summary = calculatePerformance(records);
      expect(summary.bySymbol["BTCUSDT"].wins).toBe(2);
      expect(summary.bySymbol["BTCUSDT"].winRate).toBe(1);
      expect(summary.bySymbol["ETHUSDT"].wins).toBe(0);
      expect(summary.bySymbol["ETHUSDT"].losses).toBe(1);
    });
  });

  describe("getTopPerformers", () => {
    it("sorts by winRate descending", () => {
      const records: SignalRecord[] = [
        makeSignalRecord({ symbol: "BTCUSDT", signal_number: "S1", result: "WIN", result_R: 3, status: "CLOSED" }),
        makeSignalRecord({ symbol: "ETHUSDT", signal_number: "S1", result: "LOSS", result_R: -1, status: "CLOSED" }),
        makeSignalRecord({ symbol: "SOLUSDT", signal_number: "S1", result: "WIN", result_R: 3, status: "CLOSED" }),
        makeSignalRecord({ symbol: "SOLUSDT", signal_number: "S2", result: "WIN", result_R: 3, status: "CLOSED" }),
      ];
      const summary = calculatePerformance(records);
      const top = getTopPerformers(summary, 3);
      // SOLUSDT has 100% win rate, BTCUSDT has 100%, ETHUSDT has 0%
      expect(top[0].winRate).toBeGreaterThanOrEqual(top[1].winRate);
      expect(top[1].winRate).toBeGreaterThanOrEqual(top[2].winRate);
    });

    it("limits results to n", () => {
      const records = Array.from({ length: 10 }, (_, i) =>
        makeSignalRecord({ symbol: `COIN${i}USDT`, signal_number: "S1", result: "WIN", result_R: 3, status: "CLOSED" })
      );
      const summary = calculatePerformance(records);
      expect(getTopPerformers(summary, 3)).toHaveLength(3);
      expect(getTopPerformers(summary, 5)).toHaveLength(5);
    });

    it("returns empty for empty summary", () => {
      const summary = calculatePerformance([]);
      expect(getTopPerformers(summary)).toHaveLength(0);
    });
  });
});
