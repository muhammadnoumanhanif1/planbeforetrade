/**
 * Entry Confirmation System
 * Detects bullish/bearish confirmation signals before allowing entry
 * 
 * BUY Confirmation:
 * - Bullish engulfing candle OR
 * - Strong rejection wick from support OR
 * - RSI crosses upward from oversold (<40 → up)
 * 
 * SELL Confirmation:
 * - Bearish engulfing candle OR
 * - Rejection wick from resistance OR
 * - RSI crosses downward from overbought (>60 → down)
 */

import type { MarketCandle, EntryConfirmation, MarketTrend } from "./types";

export function checkEntryConfirmation(
  trend: MarketTrend,
  candles: MarketCandle[],
  entryZone: [number, number] | null,
  support: number | null,
  resistance: number | null,
  rsi: number,
  rsiPrevious: number
): EntryConfirmation {
  if (!entryZone || candles.length < 2) {
    return {
      confirmed: false,
      confirmationType: null,
      description: "Insufficient data for confirmation",
      bullishConfirmations: {
        bullishEngulfing: false,
        strongRejectionWick: false,
        rsiCrossUp: false,
      },
      bearishConfirmations: {
        bearishEngulfing: false,
        rejectionWickAtResistance: false,
        rsiCrossDown: false,
      },
    };
  }

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  if (trend === "UPTREND") {
    return checkBuyConfirmation(lastCandle, prevCandle, entryZone, support, rsi, rsiPrevious);
  } else if (trend === "DOWNTREND") {
    return checkSellConfirmation(lastCandle, prevCandle, entryZone, resistance, rsi, rsiPrevious);
  }

  return {
    confirmed: false,
    confirmationType: null,
    description: "Sideways trend - no confirmation needed",
    bullishConfirmations: {
      bullishEngulfing: false,
      strongRejectionWick: false,
      rsiCrossUp: false,
    },
    bearishConfirmations: {
      bearishEngulfing: false,
      rejectionWickAtResistance: false,
      rsiCrossDown: false,
    },
  };
}

function checkBuyConfirmation(
  lastCandle: MarketCandle,
  prevCandle: MarketCandle,
  entryZone: [number, number],
  support: number | null,
  rsi: number,
  rsiPrevious: number
): EntryConfirmation {
  const [zoneLow, zoneHigh] = entryZone;

  // 1. BULLISH ENGULFING CANDLE
  const bullishEngulfing =
    lastCandle.close > lastCandle.open &&
    lastCandle.open <= prevCandle.close &&
    lastCandle.close >= prevCandle.open &&
    lastCandle.close > prevCandle.close;

  // 2. STRONG REJECTION WICK FROM SUPPORT
  let strongRejectionWick = false;
  if (support !== null) {
    const wickLength = Math.abs(lastCandle.low - support);
    const bodySize = Math.abs(lastCandle.close - lastCandle.open);
    const totalRange = lastCandle.high - lastCandle.low;
    
    // Wick at least 1.5x body size, bounced back up
    strongRejectionWick =
      lastCandle.low < support &&
      wickLength > bodySize * 1.5 &&
      lastCandle.close > support &&
      (wickLength / totalRange) > 0.5; // Wick is more than 50% of candle
  }

  // 3. RSI UPWARD CROSS FROM OVERSOLD
  // RSI was < 40 (oversold) and now crossed above 40
  const rsiCrossUp = rsiPrevious < 40 && rsi >= 40;

  const confirmations = [bullishEngulfing, strongRejectionWick, rsiCrossUp];
  const confirmed = confirmations.some((c) => c);

  let confirmationType: "bullish_engulfing" | "rejection_wick" | "rsi_cross" | null = null;
  let description = "";

  if (bullishEngulfing) {
    confirmationType = "bullish_engulfing";
    description = "Bullish engulfing candle detected at entry zone";
  } else if (strongRejectionWick) {
    confirmationType = "rejection_wick";
    description = "Strong rejection wick from support detected";
  } else if (rsiCrossUp) {
    confirmationType = "rsi_cross";
    description = `RSI crossed up from oversold (${rsiPrevious.toFixed(1)} → ${rsi.toFixed(1)})`;
  } else {
    description = "Waiting for buy confirmation (engulfing, rejection wick, or RSI cross)";
  }

  return {
    confirmed,
    confirmationType: confirmed ? confirmationType : null,
    description,
    bullishConfirmations: {
      bullishEngulfing,
      strongRejectionWick,
      rsiCrossUp,
    },
    bearishConfirmations: {
      bearishEngulfing: false,
      rejectionWickAtResistance: false,
      rsiCrossDown: false,
    },
  };
}

function checkSellConfirmation(
  lastCandle: MarketCandle,
  prevCandle: MarketCandle,
  entryZone: [number, number],
  resistance: number | null,
  rsi: number,
  rsiPrevious: number
): EntryConfirmation {
  const [zoneLow, zoneHigh] = entryZone;

  // 1. BEARISH ENGULFING CANDLE
  const bearishEngulfing =
    lastCandle.close < lastCandle.open &&
    lastCandle.open >= prevCandle.close &&
    lastCandle.close <= prevCandle.open &&
    lastCandle.close < prevCandle.close;

  // 2. REJECTION WICK FROM RESISTANCE
  let rejectionWickAtResistance = false;
  if (resistance !== null) {
    const wickLength = Math.abs(resistance - lastCandle.high);
    const bodySize = Math.abs(lastCandle.close - lastCandle.open);
    const totalRange = lastCandle.high - lastCandle.low;
    
    // Wick at least 1.5x body size, bounced back down
    rejectionWickAtResistance =
      lastCandle.high > resistance &&
      wickLength > bodySize * 1.5 &&
      lastCandle.close < resistance &&
      (wickLength / totalRange) > 0.5; // Wick is more than 50% of candle
  }

  // 3. RSI DOWNWARD CROSS FROM OVERBOUGHT
  // RSI was > 60 (overbought) and now crossed below 60
  const rsiCrossDown = rsiPrevious > 60 && rsi <= 60;

  const confirmations = [bearishEngulfing, rejectionWickAtResistance, rsiCrossDown];
  const confirmed = confirmations.some((c) => c);

  let confirmationType: "bearish_engulfing" | "rejection_wick" | "rsi_cross" | null = null;
  let description = "";

  if (bearishEngulfing) {
    confirmationType = "bearish_engulfing";
    description = "Bearish engulfing candle detected at entry zone";
  } else if (rejectionWickAtResistance) {
    confirmationType = "rejection_wick";
    description = "Rejection wick from resistance detected";
  } else if (rsiCrossDown) {
    confirmationType = "rsi_cross";
    description = `RSI crossed down from overbought (${rsiPrevious.toFixed(1)} → ${rsi.toFixed(1)})`;
  } else {
    description = "Waiting for sell confirmation (engulfing, rejection wick, or RSI cross)";
  }

  return {
    confirmed,
    confirmationType: confirmed ? confirmationType : null,
    description,
    bullishConfirmations: {
      bullishEngulfing: false,
      strongRejectionWick: false,
      rsiCrossUp: false,
    },
    bearishConfirmations: {
      bearishEngulfing,
      rejectionWickAtResistance,
      rsiCrossDown,
    },
  };
}
