/**
 * Advanced Signal Enhancement System
 * Includes:
 * - Liquidity sweep detection
 * - Volume confirmation
 * - Entry zone strength analysis
 * - Partial entry (DCA) system
 * - Multi-timeframe alignment
 * - Delayed entry logic
 */

import type {
  MarketCandle,
  LiquiditySweepDetection,
  VolumeConfirmation,
  EntryZoneStrength,
  PartialEntry,
} from "./types";

/**
 * LIQUIDITY SWEEP DETECTION
 * Detects fake breakouts (liquidity sweeps)
 * 
 * BUY: Price dips below support then quickly returns
 * SELL: Price spikes above resistance then drops
 */
export function detectLiquiditySweep(
  candles: MarketCandle[],
  support: number | null,
  resistance: number | null,
  trend: "UPTREND" | "DOWNTREND"
): LiquiditySweepDetection {
  if (candles.length < 3 || (!support && !resistance)) {
    return {
      detected: false,
      type: null,
      description: "Insufficient data for liquidity sweep detection",
      priceAction: {
        minPriceInLastCandles: 0,
        maxPriceInLastCandles: 0,
        recoveryStrength: 0,
      },
    };
  }

  const lastThreeCandles = candles.slice(-3);
  const minPrice = Math.min(...lastThreeCandles.map((c) => c.low));
  const maxPrice = Math.max(...lastThreeCandles.map((c) => c.high));
  const lastClose = candles[candles.length - 1].close;

  if (trend === "UPTREND" && support !== null) {
    // Check if price dipped below support then recovered
    const dippedBelow = minPrice < support;
    const recovered = lastClose > support;
    const recoveryStrength = recovered ? ((lastClose - minPrice) / (support - minPrice)) * 100 : 0;

    if (dippedBelow && recovered && recoveryStrength > 70) {
      return {
        detected: true,
        type: "support_liquidity_sweep",
        description: `Liquidity sweep detected: Price dipped ${((support - minPrice) / support * 100).toFixed(2)}% below support and recovered ${recoveryStrength.toFixed(0)}%`,
        priceAction: {
          minPriceInLastCandles: minPrice,
          maxPriceInLastCandles: maxPrice,
          recoveryStrength: Math.min(100, Math.round(recoveryStrength)),
        },
      };
    }
  }

  if (trend === "DOWNTREND" && resistance !== null) {
    // Check if price spiked above resistance then fell
    const spikedAbove = maxPrice > resistance;
    const fell = lastClose < resistance;
    const recoveryStrength = fell ? ((maxPrice - lastClose) / (maxPrice - resistance)) * 100 : 0;

    if (spikedAbove && fell && recoveryStrength > 70) {
      return {
        detected: true,
        type: "resistance_liquidity_sweep",
        description: `Liquidity sweep detected: Price spiked ${((maxPrice - resistance) / resistance * 100).toFixed(2)}% above resistance and fell ${recoveryStrength.toFixed(0)}%`,
        priceAction: {
          minPriceInLastCandles: minPrice,
          maxPriceInLastCandles: maxPrice,
          recoveryStrength: Math.min(100, Math.round(recoveryStrength)),
        },
      };
    }
  }

  return {
    detected: false,
    type: null,
    description: "No liquidity sweep detected",
    priceAction: {
      minPriceInLastCandles: minPrice,
      maxPriceInLastCandles: maxPrice,
      recoveryStrength: 0,
    },
  };
}

/**
 * VOLUME CONFIRMATION
 * Checks if entry candle has higher-than-average volume
 */
export function checkVolumeConfirmation(
  candles: MarketCandle[],
  minimumRatio: number = 1.2 // 20% above average
): VolumeConfirmation {
  if (candles.length < 20) {
    return {
      confirmed: false,
      entryCandleVolume: 0,
      averageVolume: 0,
      volumeRatio: 0,
      description: "Insufficient candles for volume analysis",
      minimumRatio,
    };
  }

  // Use last 20 candles to calculate average (excluding current)
  const previousCandles = candles.slice(-21, -1);
  const averageVol = previousCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / previousCandles.length;
  const currentVolume = candles[candles.length - 1].volume || 0;
  const ratio = averageVol > 0 ? currentVolume / averageVol : 0;

  const confirmed = ratio >= minimumRatio;

  return {
    confirmed,
    entryCandleVolume: currentVolume,
    averageVolume: Math.round(averageVol),
    volumeRatio: parseFloat(ratio.toFixed(2)),
    description: confirmed
      ? `Volume confirmation: ${ratio.toFixed(2)}x average volume (threshold: ${minimumRatio}x)`
      : `Weak volume: ${ratio.toFixed(2)}x average (need ${minimumRatio}x)`,
    minimumRatio,
  };
}

/**
 * ENTRY ZONE STRENGTH SCORING
 * Analyzes tightness and reliability of entry zone
 */
export function analyzeEntryZoneStrength(
  candles: MarketCandle[],
  entryZone: [number, number] | null,
  support: number | null,
  resistance: number | null,
  atr: number
): EntryZoneStrength {
  if (!entryZone) {
    return {
      score: 0,
      factors: {
        recentStructure: 0,
        liquidityArea: 0,
        volatilityFactor: 0,
        timeframeConfluence: 0,
      },
      assessment: "wide",
    };
  }

  const [zoneLow, zoneHigh] = entryZone;
  const zoneWidth = zoneHigh - zoneLow;
  const currentPrice = candles[candles.length - 1].close;

  // 1. RECENT STRUCTURE (how tight recent swings are)
  let recentStructure = 50;
  if (candles.length >= 5) {
    const recentCandles = candles.slice(-5);
    const recentRange = Math.max(...recentCandles.map((c) => c.high)) - Math.min(...recentCandles.map((c) => c.low));
    if (recentRange < zoneWidth * 0.5) {
      recentStructure = 85; // Very tight
    } else if (recentRange < zoneWidth) {
      recentStructure = 70; // Reasonably tight
    } else {
      recentStructure = 40; // Loose
    }
  }

  // 2. LIQUIDITY AREA (how many touches of level)
  let liquidityArea = 50;
  if (support !== null) {
    const touchesSupport = candles.filter((c) => Math.abs(c.low - support) < zoneWidth * 0.1).length;
    liquidityArea = Math.min(100, 50 + touchesSupport * 8);
  } else if (resistance !== null) {
    const touchesResistance = candles.filter((c) => Math.abs(c.high - resistance) < zoneWidth * 0.1).length;
    liquidityArea = Math.min(100, 50 + touchesResistance * 8);
  }

  // 3. VOLATILITY FACTOR (based on ATR vs zone width)
  // Smaller zone relative to volatility = tighter = better
  let volatilityFactor = 50;
  if (atr > 0) {
    const ratio = zoneWidth / atr;
    if (ratio < 0.5) {
      volatilityFactor = 90; // Very tight
    } else if (ratio < 1.0) {
      volatilityFactor = 75; // Tight
    } else if (ratio < 1.5) {
      volatilityFactor = 55; // Normal
    } else {
      volatilityFactor = 30; // Wide
    }
  }

  // 4. TIMEFRAME CONFLUENCE (placeholder, should integrate multi-TF data)
  // Assume 70 for now - would improve with actual multi-TF analysis
  const timeframeConfluence = 70;

  // WEIGHTED SCORE
  const weights = {
    structure: 0.25,
    liquidity: 0.25,
    volatility: 0.30,
    confluence: 0.20,
  };

  const finalScore =
    recentStructure * weights.structure +
    liquidityArea * weights.liquidity +
    volatilityFactor * weights.volatility +
    timeframeConfluence * weights.confluence;

  const clampedScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  // Assessment
  let assessment: "very_tight" | "tight" | "normal" | "wide";
  if (clampedScore >= 80) {
    assessment = "very_tight";
  } else if (clampedScore >= 65) {
    assessment = "tight";
  } else if (clampedScore >= 45) {
    assessment = "normal";
  } else {
    assessment = "wide";
  }

  return {
    score: clampedScore,
    factors: {
      recentStructure: Math.round(recentStructure),
      liquidityArea: Math.round(liquidityArea),
      volatilityFactor: Math.round(volatilityFactor),
      timeframeConfluence: Math.round(timeframeConfluence),
    },
    assessment,
  };
}

/**
 * PARTIAL ENTRY (DCA) SYSTEM
 * Splits entry into 3 parts: 30% top, 40% middle, 30% bottom
 */
export function generatePartialEntryPlan(
  entryZone: [number, number] | null,
  trend: "UPTREND" | "DOWNTREND"
): PartialEntry {
  if (!entryZone) {
    return {
      enabled: false,
      parts: {
        part1: { percentage: 0, level: 0 },
        part2: { percentage: 0, level: 0 },
        part3: { percentage: 0, level: 0 },
      },
    };
  }

  const [zoneLow, zoneHigh] = entryZone;
  const zoneWidth = zoneHigh - zoneLow;

  // For UPTREND (BUY):
  // part1: 30% at top of zone (closest to resistance)
  // part2: 40% at middle
  // part3: 30% at bottom (closest to support)
  //
  // For DOWNTREND (SELL):
  // part1: 30% at bottom of zone (closest to support)
  // part2: 40% at middle
  // part3: 30% at top (closest to resistance)

  if (trend === "UPTREND") {
    return {
      enabled: true,
      parts: {
        part1: { percentage: 30, level: zoneHigh - zoneWidth * 0.25 }, // 75% mark
        part2: { percentage: 40, level: zoneLow + zoneWidth * 0.5 }, // 50% mark (middle)
        part3: { percentage: 30, level: zoneLow + zoneWidth * 0.1 }, // 10% mark (near bottom)
      },
    };
  } else {
    // DOWNTREND
    return {
      enabled: true,
      parts: {
        part1: { percentage: 30, level: zoneLow + zoneWidth * 0.25 }, // 25% mark
        part2: { percentage: 40, level: zoneLow + zoneWidth * 0.5 }, // 50% mark (middle)
        part3: { percentage: 30, level: zoneHigh - zoneWidth * 0.1 }, // 90% mark (near top)
      },
    };
  }
}

/**
 * DELAYED ENTRY LOGIC
 * Wait for 1-2 candle confirmations before allowing entry
 */
export function calculateDelayedEntry(
  entryConfirmed: boolean,
  candlesWaited: number,
  requiredDelayCandles: number = 1
): { canEnter: boolean; description: string } {
  if (entryConfirmed && candlesWaited >= requiredDelayCandles) {
    return {
      canEnter: true,
      description: `Entry confirmed after ${candlesWaited} candle(s) - Ready to enter`,
    };
  }

  if (entryConfirmed) {
    return {
      canEnter: false,
      description: `Entry confirmed, waiting ${requiredDelayCandles - candlesWaited} more candle(s)`,
    };
  }

  return {
    canEnter: false,
    description: `Waiting for entry confirmation (${candlesWaited}/${requiredDelayCandles} candles)`,
  };
}

/**
 * SIGNAL FILTER
 * Determines if signal should be generated based on quality criteria
 */
export function applySignalFilters(
  entryConfirmed: boolean,
  volumeConfirmed: boolean,
  entryQualityScore: number,
  trendStrength: number,
  liquiditySweepDetected: boolean
): { passesFilter: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Filter 1: Entry confirmation required
  if (!entryConfirmed) {
    reasons.push("No entry confirmation detected");
  }

  // Filter 2: Volume confirmation (relaxed to warning - does not block trade)
  // We do not add to blocker reasons, allowing signals with normal/lower volume to pass.

  // Filter 3: Quality score must be >= 60 (lowered from 70)
  if (entryQualityScore < 60) {
    reasons.push(`Entry quality score too low (${entryQualityScore} < 60)`);
  }

  // Filter 4: Trend strength must be >= 30 (lowered from 40)
  if (trendStrength < 30) {
    reasons.push("Trend strength too weak");
  }

  // Filter 5: Reject if strong liquidity sweep without confirmation
  if (liquiditySweepDetected && !entryConfirmed) {
    reasons.push("Liquidity sweep detected without confirmation - potential fake");
  }

  const passesFilter = reasons.length === 0;

  return {
    passesFilter,
    reasons: passesFilter ? ["All filters passed - signal is valid"] : reasons,
  };
}
