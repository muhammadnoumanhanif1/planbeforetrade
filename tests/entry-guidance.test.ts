import { describe, expect, it } from "vitest";
import { getEntryGuidance } from "@/features/analysis/AnalysisDashboard";
import type { AnalysisData } from "@/features/analysis/types";

const baseAnalysis: AnalysisData = {
  exchange: "binance",
  symbol: "BTCUSDT",
  timeframe: "1h",
  lastPrice: 100,
  predictedPrice: 102,
  recommendation: "LONG",
  takeProfits: [],
  stopLosses: [],
  support: 100,
  resistance: 110,
  confidence: 50,
  indicators: {
    smaShort: 0,
    smaLong: 0,
    rsi: 50,
    momentum: 0,
    volatility: 0,
  },
  candles: [],
  smaLine: [],
  orderBlocks: [],
  updatedAt: "",
  notes: [],
};

describe("getEntryGuidance", () => {
  it("returns inside-zone guidance for LONG when price is within range", () => {
    const guidance = getEntryGuidance(baseAnalysis, 101);
    expect(guidance?.inZone).toBe(true);
    expect(guidance?.direction).toBe("inside");
  });

  it("returns above-zone guidance for LONG when price is higher", () => {
    const guidance = getEntryGuidance(baseAnalysis, 103);
    expect(guidance?.inZone).toBe(false);
    expect(guidance?.direction).toBe("above");
    expect(guidance?.distancePercent).toBeGreaterThan(0);
  });

  it("returns below-zone guidance for SHORT when price is lower", () => {
    const shortAnalysis = { ...baseAnalysis, recommendation: "SHORT", resistance: 200 };
    const guidance = getEntryGuidance(shortAnalysis, 197);
    expect(guidance?.inZone).toBe(false);
    expect(guidance?.direction).toBe("below");
  });

  it("returns null when reference levels are invalid", () => {
    const invalidAnalysis = { ...baseAnalysis, support: 0 };
    expect(getEntryGuidance(invalidAnalysis, 100)).toBeNull();
  });
});
