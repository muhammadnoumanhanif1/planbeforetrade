import { describe, expect, it } from "vitest";
import { clampStopLossDistance } from "@/lib/signals/signalGenerator";

describe("clampStopLossDistance", () => {
  it("clamps tight BUY stops up to 2%", () => {
    expect(clampStopLossDistance("BUY", 100, 99)).toBeCloseTo(98, 6);
  });

  it("clamps wide BUY stops down to 5%", () => {
    expect(clampStopLossDistance("BUY", 100, 90)).toBeCloseTo(95, 6);
  });

  it("keeps BUY stop within 2-5%", () => {
    expect(clampStopLossDistance("BUY", 100, 98)).toBeCloseTo(98, 6);
    expect(clampStopLossDistance("BUY", 100, 95)).toBeCloseTo(95, 6);
  });

  it("clamps tight SELL stops up to 2%", () => {
    expect(clampStopLossDistance("SELL", 100, 101)).toBeCloseTo(102, 6);
  });

  it("clamps wide SELL stops down to 5%", () => {
    expect(clampStopLossDistance("SELL", 100, 112)).toBeCloseTo(105, 6);
  });

  it("returns null when stop loss is missing", () => {
    expect(clampStopLossDistance("BUY", 100, null)).toBeNull();
  });
});
