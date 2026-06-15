import { describe, expect, it } from "vitest";
import { formatSignalMessage } from "@/lib/formatSignal";

describe("formatSignalMessage", () => {
  it("escapes Telegram Markdown special characters from dynamic fields", () => {
    const message = formatSignalMessage({
      symbol: "ABC_DEF",
      action: "buy[test]",
      trend: "UP(TREND)",
      entry_zone: ["10.5", "11.0"],
      stop_loss: "9.9!",
      tp1: "12.0+",
      tp2: "13.0-",
      tp3: "14.0=",
      ai_score: 77,
      status: "ENTRY_HIT",
    });

    expect(message).toContain("*ABC\\_DEF*");
    expect(message).toContain("BUY\\[TEST\\]");
    expect(message).toContain("UP\\(TREND\\)");
    expect(message).toContain("9.9!");
    expect(message).toContain("12.0+");
    expect(message).toContain("13.0-");
    expect(message).toContain("14.0=");
    expect(message).toContain("ENTRY\\_HIT");
  });

  it("handles null/undefined-like values safely", () => {
    const message = formatSignalMessage({
      symbol: undefined,
      action: undefined,
      trend: undefined,
      entry_zone: null,
      stop_loss: null,
      tp1: undefined,
      tp2: null,
      tp3: undefined,
      confidence: 65,
      status: null,
    });

    expect(message).toContain("*N/A*");
    expect(message).toContain("UNKNOWN");
    expect(message).toContain("Trend: N/A");
    expect(message).toContain("Entry Zone: N/A");
    expect(message).toContain("Status: NEW");
  });
});
