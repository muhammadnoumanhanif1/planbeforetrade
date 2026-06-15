/**
 * Multi-Timeframe Analysis System
 * 
 * Uses:
 * - Higher Timeframe (HTF): 1H for trend definition
 * - Lower Timeframe (LTF): 5M or 15M for entry confirmation
 * 
 * Rules:
 * - HTF defines the primary trend
 * - LTF used for precise entry timing
 * - Both must align for maximum confidence
 */

import { detectMarketTrend } from "./trendDetector";
import type { MarketCandle, MarketTrend } from "./types";

export interface MultiTimeframeAnalysis {
  htfTrend: MarketTrend;
  ltfTrend: MarketTrend;
  aligned: boolean;
  strength: number; // 0-100, higher if both agree
  description: string;
  tradingSignal: "BUY" | "SELL" | "WAIT";
}

/**
 * Analyze multi-timeframe alignment
 * Ensures HTF and LTF trends are in agreement
 */
export function analyzeMultiTimeframe(
  htfCandles: MarketCandle[],
  ltfCandles: MarketCandle[],
  htfTimeframe: string = "1h",
  ltfTimeframe: string = "5m"
): MultiTimeframeAnalysis {
  // Detect trends on both timeframes
  const htfTrendResult = detectMarketTrend(htfCandles);
  const ltfTrendResult = detectMarketTrend(ltfCandles);

  const htfTrend = htfTrendResult.trend;
  const ltfTrend = ltfTrendResult.trend;

  // Check alignment
  const aligned =
    (htfTrend === "UPTREND" && (ltfTrend === "UPTREND" || ltfTrend === "SIDEWAYS")) ||
    (htfTrend === "DOWNTREND" && (ltfTrend === "DOWNTREND" || ltfTrend === "SIDEWAYS")) ||
    (htfTrend === "SIDEWAYS" && ltfTrend === "SIDEWAYS");

  // Calculate strength based on alignment
  // More alignment = higher strength
  let strength = 50; // baseline

  if (htfTrend === ltfTrend) {
    // Perfect alignment
    strength = 85 + Math.min(10, Math.abs(htfTrendResult.trendStrength - ltfTrendResult.trendStrength) / 10);
  } else if (
    (htfTrend === "UPTREND" && ltfTrend === "SIDEWAYS") ||
    (htfTrend === "DOWNTREND" && ltfTrend === "SIDEWAYS")
  ) {
    // HTF trend with LTF consolidation - good for entry
    strength = 75;
  } else if (
    (htfTrend === "SIDEWAYS" && ltfTrend === "UPTREND") ||
    (htfTrend === "SIDEWAYS" && ltfTrend === "DOWNTREND")
  ) {
    // HTF ranging, LTF trending - medium confidence
    strength = 55;
  } else {
    // Conflicting trends
    strength = 30;
  }

  // Clamp strength 0-100
  strength = Math.max(0, Math.min(100, Math.round(strength)));

  // Determine trading signal based on HTF trend (HTF is primary)
  let tradingSignal: "BUY" | "SELL" | "WAIT";

  if (htfTrend === "UPTREND") {
    tradingSignal = "BUY";
  } else if (htfTrend === "DOWNTREND") {
    tradingSignal = "SELL";
  } else {
    tradingSignal = "WAIT";
  }

  // Build description
  let description = "";
  if (htfTrend === ltfTrend) {
    description = `Perfect alignment: ${htfTrend} on ${htfTimeframe} and ${ltfTimeframe}`;
  } else if (aligned) {
    description = `Aligned: ${htfTimeframe} ${htfTrend} with ${ltfTimeframe} ${ltfTrend}`;
  } else {
    description = `Conflicting: ${htfTimeframe} ${htfTrend} vs ${ltfTimeframe} ${ltfTrend}`;
  }

  return {
    htfTrend,
    ltfTrend,
    aligned,
    strength,
    description,
    tradingSignal,
  };
}

/**
 * Get HTF-LTF trading rules
 * Explains when to trade based on timeframe alignment
 */
export function getMultiTimeframeRules(
  htfTrend: MarketTrend,
  ltfTrend: MarketTrend
): {
  canTrade: boolean;
  tradingBias: "BUY" | "SELL" | "NEUTRAL";
  rules: string[];
} {
  const rules: string[] = [];

  // Primary rule: Follow HTF trend
  rules.push(`Primary trend (HTF): ${htfTrend}`);
  rules.push(`Secondary trend (LTF): ${ltfTrend}`);

  let canTrade = true;
  let tradingBias: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";

  // UPTREND Rules
  if (htfTrend === "UPTREND") {
    tradingBias = "BUY";
    rules.push("✓ BUY entries allowed (HTF uptrend)");

    if (ltfTrend === "UPTREND") {
      rules.push("✓ LTF confirms uptrend - enter on dips");
      canTrade = true;
    } else if (ltfTrend === "SIDEWAYS") {
      rules.push("⚠ LTF consolidating - enter on HTF setup confirmation");
      canTrade = true;
    } else {
      // LTF DOWNTREND against HTF UPTREND
      rules.push("⚠ LTF downtrend conflicts HTF - use stricter confirmation");
      canTrade = true; // Can still trade but with caution
    }

    rules.push("✗ SELL entries not allowed (against HTF trend)");
  }

  // DOWNTREND Rules
  else if (htfTrend === "DOWNTREND") {
    tradingBias = "SELL";
    rules.push("✓ SELL entries allowed (HTF downtrend)");

    if (ltfTrend === "DOWNTREND") {
      rules.push("✓ LTF confirms downtrend - enter on bounces");
      canTrade = true;
    } else if (ltfTrend === "SIDEWAYS") {
      rules.push("⚠ LTF consolidating - enter on HTF setup confirmation");
      canTrade = true;
    } else {
      // LTF UPTREND against HTF DOWNTREND
      rules.push("⚠ LTF uptrend conflicts HTF - use stricter confirmation");
      canTrade = true; // Can still trade but with caution
    }

    rules.push("✗ BUY entries not allowed (against HTF trend)");
  }

  // SIDEWAYS Rules
  else {
    tradingBias = "NEUTRAL";
    rules.push("⚠ HTF sideways - avoid bias trades");

    if (ltfTrend === "UPTREND" || ltfTrend === "DOWNTREND") {
      rules.push(`? LTF has ${ltfTrend} - use for scalping only`);
    } else {
      rules.push("✗ Both timeframes sideways - wait for clear direction");
      canTrade = false;
    }
  }

  return {
    canTrade,
    tradingBias,
    rules,
  };
}

/**
 * Validate signal against multi-timeframe rules
 */
export function validateSignalAgainstMultiTimeframe(
  signalAction: "BUY" | "SELL" | "WAIT",
  htfTrend: MarketTrend,
  ltfTrend: MarketTrend,
  timeframeAligned: boolean
): {
  valid: boolean;
  confidence: number;
  reason: string;
} {
  const rules = getMultiTimeframeRules(htfTrend, ltfTrend);

  if (!rules.canTrade && signalAction !== "WAIT") {
    return {
      valid: false,
      confidence: 10,
      reason: `Signal ${signalAction} rejected: HTF ${htfTrend} + LTF ${ltfTrend} doesn't allow trading`,
    };
  }

  if (signalAction === "BUY" && rules.tradingBias !== "BUY" && rules.tradingBias !== "NEUTRAL") {
    return {
      valid: false,
      confidence: 20,
      reason: `BUY signal rejected: HTF bias is ${rules.tradingBias}`,
    };
  }

  if (signalAction === "SELL" && rules.tradingBias !== "SELL" && rules.tradingBias !== "NEUTRAL") {
    return {
      valid: false,
      confidence: 20,
      reason: `SELL signal rejected: HTF bias is ${rules.tradingBias}`,
    };
  }

  // Perfect scenario: HTF and LTF aligned
  if (timeframeAligned && htfTrend === ltfTrend) {
    return {
      valid: true,
      confidence: 95,
      reason: "Perfect multi-timeframe alignment - high confidence signal",
    };
  }

  // Good scenario: HTF trend with LTF consolidation
  if (timeframeAligned && ltfTrend === "SIDEWAYS") {
    return {
      valid: true,
      confidence: 80,
      reason: "HTF trend confirmed, LTF consolidating - good entry opportunity",
    };
  }

  // Medium scenario: Conflicting but tradeable
  if (!timeframeAligned && signalAction === rules.tradingBias) {
    return {
      valid: true,
      confidence: 55,
      reason: "Timeframes not aligned - use stricter entry confirmation",
    };
  }

  return {
    valid: true,
    confidence: 70,
    reason: "Signal valid but check multi-timeframe context",
  };
}
