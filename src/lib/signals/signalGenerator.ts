import { detectMarketTrend, calculateRsi } from "./trendDetector";
import { detectSupportResistance } from "./supportResistance";
import { calculateEntryZone, getDistanceToEntryZone } from "./entryZoneCalculator";
import { resolveTradeStatus, getDeduplicatedSignal } from "./signalStatusManager";
import { calculateConfidenceScore } from "./confidenceScore";
import { getConfidenceLabel } from "@/lib/ai-learning/engine";
import { detectBreakout } from "./breakoutStrategy";
import { meetsMinimumRiskReward } from "./riskManager";
import type { GeneratedSignal, MarketCandle, TradeAction } from "./types";

// Import new enhancement modules
import { checkEntryConfirmation } from "./entryConfirmationSystem";
import { calculateEntryQualityScore } from "./entryQualityScoring";
import {
  detectLiquiditySweep,
  checkVolumeConfirmation,
  analyzeEntryZoneStrength,
  generatePartialEntryPlan,
  applySignalFilters,
} from "./advancedSignalEnhancements";
import { analyzeMultiTimeframe } from "./multiTimeframeAnalysis";

const DEFAULT_ENTRY_ZONE_THRESHOLD = 0.02;
const DEFAULT_STOP_BUFFER = 0.002;
const MIN_STOP_DISTANCE = 0.02;
const MAX_STOP_DISTANCE = 0.05;
const RSI_BULLISH_THRESHOLD = 55;
const RSI_BEARISH_THRESHOLD = 45;

// Calculate Average True Range for volatility measurement
const calculateATR = (candles: MarketCandle[], period: number = 14): number => {
  if (candles.length < period) {
    return 0;
  }

  let trueRanges: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    const high = current.high;
    const low = current.low;
    const prevClose = i > 0 ? candles[i - 1].close : current.close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  // Calculate simple moving average of true ranges (SMA)
  const atrValues = trueRanges.slice(-period);
  const atr = atrValues.reduce((sum, tr) => sum + tr, 0) / period;
  
  return atr;
};

const buildSetupKey = (params: {
  symbol: string;
  trend: string;
  action: TradeAction;
  entryZone: [number, number];
  stopLoss: number | null;
  takeProfit: number | null;
}) =>
  JSON.stringify({
    s: params.symbol,
    t: params.trend,
    a: params.action,
    z: params.entryZone,
    sl: round(params.stopLoss),
    tp: round(params.takeProfit),
  });

const round = (value: number | null, decimals = 6) => {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

type SetupKeyPayload = {
  s: string;
  t: string;
  a: TradeAction;
  z: [number, number];
  sl: number | null;
  tp: number | null;
};

const parseSetupKey = (value: string | null): SetupKeyPayload | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SetupKeyPayload>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.s !== "string" || typeof parsed.t !== "string" || typeof parsed.a !== "string") {
      return null;
    }
    if (!Array.isArray(parsed.z) || parsed.z.length !== 2) return null;
    const [low, high] = parsed.z;
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
    const sl = parsed.sl;
    const tp = parsed.tp;
    return {
      s: parsed.s,
      t: parsed.t,
      a: parsed.a as TradeAction,
      z: [low, high],
      sl: typeof sl === "number" && Number.isFinite(sl) ? sl : null,
      tp: typeof tp === "number" && Number.isFinite(tp) ? tp : null,
    };
  } catch {
    return null;
  }
};

const normalizeEntryZone = (entryZone: [number, number] | null) => {
  if (!entryZone) return null;
  const low = round(entryZone[0]);
  const high = round(entryZone[1]);
  if (low === null || high === null) return null;
  return [low, high] as [number, number];
};

const ENTRY_ZONE_MATCH_TOLERANCE = 1e-6;

const isSameEntryZone = (a: [number, number] | null, b: [number, number] | null) => {
  if (!a || !b) return false;
  return (
    Math.abs(a[0] - b[0]) <= ENTRY_ZONE_MATCH_TOLERANCE &&
    Math.abs(a[1] - b[1]) <= ENTRY_ZONE_MATCH_TOLERANCE
  );
};

const isNear = (price: number, level: number | null, threshold: number) => {
  if (!Number.isFinite(price) || level === null || !Number.isFinite(level) || price <= 0) return false;
  return Math.abs(price - level) / price <= threshold;
};

export const clampStopLossDistance = (
  action: TradeAction,
  entryPrice: number | null,
  stopLoss: number | null
) => {
  if (
    entryPrice === null ||
    stopLoss === null ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopLoss) ||
    entryPrice <= 0
  ) {
    return stopLoss;
  }
  if (action !== "BUY" && action !== "SELL") return stopLoss;
  const distanceRatio = Math.abs(entryPrice - stopLoss) / entryPrice;
  if (!Number.isFinite(distanceRatio) || distanceRatio === 0) return stopLoss;
  if (distanceRatio >= MIN_STOP_DISTANCE && distanceRatio <= MAX_STOP_DISTANCE) return stopLoss;
  const targetDistance = distanceRatio < MIN_STOP_DISTANCE ? MIN_STOP_DISTANCE : MAX_STOP_DISTANCE;
  return action === "BUY"
    ? entryPrice * (1 - targetDistance)
    : entryPrice * (1 + targetDistance);
};

export type GenerateSignalOptions = {
  entryThreshold?: number;
  stopBuffer?: number;
  riskRewardRatio?: 2 | 3;
  riskPerTradePercent?: number;
  exchange?: string;
};

export const generateMarketStructureSignal = (
  symbol: string,
  candles: MarketCandle[],
  previousSetupKey: string | null = null,
  options: GenerateSignalOptions = {}
): GeneratedSignal => {
  const entryThreshold = options.entryThreshold ?? DEFAULT_ENTRY_ZONE_THRESHOLD;
  const stopBuffer = options.stopBuffer ?? DEFAULT_STOP_BUFFER;
  const riskRewardRatio = options.riskRewardRatio ?? 3;
  const riskPerTradePercent = options.riskPerTradePercent ?? 1;

  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle?.close ?? 0;
  const trendInfo = detectMarketTrend(candles);
  const levels = detectSupportResistance(candles, currentPrice);

  const nearSupport = isNear(currentPrice, levels.nearestSupport, entryThreshold);
  const nearResistance = isNear(currentPrice, levels.nearestResistance, entryThreshold);
  const bullishCandle = lastCandle.close > lastCandle.open;
  const bearishCandle = lastCandle.close < lastCandle.open;
  const bullishConfirmation = trendInfo.rsi <= RSI_BULLISH_THRESHOLD || bullishCandle;
  const bearishConfirmation = trendInfo.rsi >= RSI_BEARISH_THRESHOLD || bearishCandle;

  const buySetup =
    trendInfo.trend === "UPTREND" &&
    levels.nearestSupport !== null &&
    (nearSupport || bullishConfirmation);

  const sellSetup =
    trendInfo.trend === "DOWNTREND" &&
    levels.nearestResistance !== null &&
    (nearResistance || bearishConfirmation);

  let action: TradeAction = "WAIT";
  const notes: string[] = [...trendInfo.reasons];

  if (buySetup) {
    action = "BUY";
    notes.push("BUY setup found: uptrend with support-backed confirmation.");
  } else if (sellSetup) {
    action = "SELL";
    notes.push("SELL setup found: downtrend with resistance-backed confirmation.");
  } else {
    notes.push("No valid setup found. Waiting for trend + level alignment.");
  }

  const breakout = detectBreakout(candles, levels);

  if (breakout.type === "BREAKOUT_BUY" && !breakout.isFakeBreakout) {
    notes.push("Breakout BUY setup detected on resistance.");
    if (action === "WAIT" && breakout.isConfirmed) {
      action = "BUY";
    }
  } else if (breakout.type === "BREAKOUT_SELL" && !breakout.isFakeBreakout) {
    notes.push("Breakout SELL setup detected on support.");
    if (action === "WAIT" && breakout.isConfirmed) {
      action = "SELL";
    }
  }

  const entryZone = calculateEntryZone({
    action,
    support: levels.nearestSupport,
    resistance: levels.nearestResistance,
    thresholdPercent: entryThreshold,
  });

  const entryPrice = entryZone ? (entryZone[0] + entryZone[1]) / 2 : null;
  const statusForLock = resolveTradeStatus({
    action,
    trend: trendInfo.trend,
    currentPrice,
    entryZone,
    support: levels.nearestSupport,
    resistance: levels.nearestResistance,
  });
  const normalizedEntryZone = normalizeEntryZone(entryZone);
  const previousSetup = parseSetupKey(previousSetupKey);
  const shouldLockStopLoss =
    statusForLock === "TRIGGERED" &&
    previousSetup !== null &&
    previousSetup.s === symbol &&
    previousSetup.t === trendInfo.trend &&
    previousSetup.a === action &&
    isSameEntryZone(normalizedEntryZone, previousSetup.z);

  const baseStopLoss =
    action === "BUY" && levels.nearestSupport
      ? levels.nearestSupport * (1 - stopBuffer)
      : action === "SELL" && levels.nearestResistance
        ? levels.nearestResistance * (1 + stopBuffer)
        : null;
  const stopLoss =
    shouldLockStopLoss && previousSetup?.sl !== null
      ? previousSetup.sl
      : clampStopLossDistance(action, entryPrice, baseStopLoss);

  const risk = entryPrice !== null && stopLoss !== null ? Math.abs(entryPrice - stopLoss) : null;

  const takeProfit =
    action === "BUY" && entryPrice !== null && risk !== null
      ? entryPrice + risk * riskRewardRatio
      : action === "SELL" && entryPrice !== null && risk !== null
        ? entryPrice - risk * riskRewardRatio
        : null;

  const tp1 =
    action === "BUY" && entryPrice !== null && risk !== null
      ? entryPrice + risk * 1
      : action === "SELL" && entryPrice !== null && risk !== null
        ? entryPrice - risk * 1
        : null;

  const tp2 =
    action === "BUY" && entryPrice !== null && risk !== null
      ? entryPrice + risk * 2
      : action === "SELL" && entryPrice !== null && risk !== null
        ? entryPrice - risk * 2
        : null;
  
  const tp3 =
    action === "BUY" && entryPrice !== null && risk !== null
      ? entryPrice + risk * 3
      : action === "SELL" && entryPrice !== null && risk !== null
        ? entryPrice - risk * 3
        : null;

  // Validate minimum R:R; reject signals below 1:3
  if (
    entryPrice !== null &&
    stopLoss !== null &&
    takeProfit !== null &&
    !meetsMinimumRiskReward(entryPrice, stopLoss, takeProfit)
  ) {
    notes.push("Signal rejected: R:R below 1:3 minimum.");
    action = "WAIT";
  }

  const distanceToEntryZone = getDistanceToEntryZone(currentPrice, entryZone);

  const status = resolveTradeStatus({
    action,
    trend: trendInfo.trend,
    currentPrice,
    entryZone,
    support: levels.nearestSupport,
    resistance: levels.nearestResistance,
  });

  const confidence = calculateConfidenceScore({
    trendStrength: trendInfo.trendStrength,
    distanceToEntryZone,
    entryZone,
    action,
    trend: trendInfo.trend,
    rsi: trendInfo.rsi,
    ema20: trendInfo.ema20,
    ema50: trendInfo.ema50,
  });

  const setupKey =
    action === "WAIT" || !entryZone
      ? null
      : buildSetupKey({
          symbol,
          trend: trendInfo.trend,
          action,
          entryZone,
          stopLoss,
          takeProfit,
        });

  const emaAlignment =
    (action === "BUY" && trendInfo.ema20 > trendInfo.ema50) ||
    (action === "SELL" && trendInfo.ema20 < trendInfo.ema50);

  // Calculate ATR for volatility analysis
  const atr = calculateATR(candles, 14);

  // === NEW ENHANCEMENTS ===

  // 1. Entry Confirmation System
  const prevCloses = candles.slice(0, -1).map((c) => c.close);
  const rsiPrevious = calculateRsi(prevCloses, 14);
  
  const entryConfirmation = checkEntryConfirmation(
    trendInfo.trend,
    candles,
    entryZone,
    levels.nearestSupport,
    levels.nearestResistance,
    trendInfo.rsi,
    rsiPrevious
  );

  // 2. Volume Confirmation
  const volumeConfirmation = checkVolumeConfirmation(candles, 1.2);

  // 3. Liquidity Sweep Detection
  const liquidityTrend: "UPTREND" | "DOWNTREND" = 
    trendInfo.trend === "UPTREND" ? "UPTREND" : 
    trendInfo.trend === "DOWNTREND" ? "DOWNTREND" : 
    "UPTREND"; // Default to uptrend for sideways
    
  const liquiditySweepDetection = detectLiquiditySweep(
    candles,
    levels.nearestSupport,
    levels.nearestResistance,
    liquidityTrend
  );

  // 4. Entry Zone Strength
  const entryZoneStrength = analyzeEntryZoneStrength(
    candles,
    entryZone,
    levels.nearestSupport,
    levels.nearestResistance,
    atr
  );

  // 5. Partial Entry (DCA) Plan
  const dcaTrend: "UPTREND" | "DOWNTREND" = 
    action === "BUY" ? "UPTREND" : action === "SELL" ? "DOWNTREND" : "UPTREND";
  
  const partialEntry = generatePartialEntryPlan(entryZone, dcaTrend);

  // 6. Entry Quality Scoring
  // Assess confirmation strength (0-100 scale)
  let confirmationStrength = 0;
  if (entryConfirmation.confirmed) {
    if (entryConfirmation.confirmationType === "bullish_engulfing" || 
        entryConfirmation.confirmationType === "bearish_engulfing") {
      confirmationStrength = 90;
    } else if (entryConfirmation.confirmationType === "rejection_wick") {
      confirmationStrength = 80;
    } else if (entryConfirmation.confirmationType === "rsi_cross") {
      confirmationStrength = 70;
    }
  }

  const entryQualityScore = calculateEntryQualityScore(
    confirmationStrength,
    volumeConfirmation.confirmed,
    volumeConfirmation.volumeRatio,
    entryZoneStrength,
    true, // trendAlignment - simplified for now
    true, // timeframeAlignment - simplified for now
    distanceToEntryZone
  );

  // 7. Signal Filters
  const signalFilters = applySignalFilters(
    entryConfirmation.confirmed,
    volumeConfirmation.confirmed,
    entryQualityScore.score,
    trendInfo.trendStrength,
    liquiditySweepDetection.detected
  );

  // Update action based on filters
  let finalAction: TradeAction = action;
  if (action !== "WAIT" && !signalFilters.passesFilter) {
    finalAction = "WAIT";
    notes.push(...signalFilters.reasons);
  }

  const finalStatus = resolveTradeStatus({
    action: finalAction,
    trend: trendInfo.trend,
    currentPrice,
    entryZone,
    support: levels.nearestSupport,
    resistance: levels.nearestResistance,
  });

  const baseSignal: GeneratedSignal = {
    symbol,
    exchange: options.exchange ?? "",
    trend: trendInfo.trend,
    action: finalAction,
    strategy_type: "SMC + S/R",
    status: finalStatus,
    setup: finalStatus,
    entry_price: round(entryPrice),
    current_price: round(currentPrice),
    entry_zone: entryZone ? [round(entryZone[0]) ?? entryZone[0], round(entryZone[1]) ?? entryZone[1]] : null,
    stop_loss: round(stopLoss),
    take_profit: round(takeProfit),
    tp1: round(tp1),
    tp2: round(tp2),
    tp3: round(tp3),
    confidence,
    ai_score: confidence,
    confidence_label: getConfidenceLabel(confidence),
    notes,
    isDuplicate: false,
    setupKey,
    generatedAt: new Date().toISOString(),
    indicators: {
      ema20: round(trendInfo.ema20) || 0,
      ema50: round(trendInfo.ema50) || 0,
      rsi: round(trendInfo.rsi, 2) || 0,
      volume: round(lastCandle.volume ?? 0, 2) || 0,
      ema_alignment: emaAlignment,
      atr: round(atr, 6) || 0,
    },
    levels: {
      nearestSupport: round(levels.nearestSupport),
      nearestResistance: round(levels.nearestResistance),
      entryZoneLow: entryZone ? round(entryZone[0]) : null,
      entryZoneHigh: entryZone ? round(entryZone[1]) : null,
    },
    risk: {
      riskRewardRatio,
      riskPerTradePercent,
      invalidationLevel: action === "BUY" ? round(levels.nearestSupport) : action === "SELL" ? round(levels.nearestResistance) : null,
    },
    distanceToEntryZone,
    
    // === NEW ENHANCEMENT FIELDS ===
    entry_confirmation: entryConfirmation,
    entry_quality_score: entryQualityScore,
    volume_confirmation: volumeConfirmation,
    liquidity_sweep_detection: liquiditySweepDetection,
    entry_zone_strength: entryZoneStrength,
    partial_entry: partialEntry,
    htf_trend: trendInfo.trend,
    ltf_trend: trendInfo.trend,
    timeframe_alignment: true, // Simplified - would use multi-timeframe data in full implementation
    entry_delay_candles: 1,
    candles_waited: 0,
    passesAllFilters: signalFilters.passesFilter,
  };

  const deduped = getDeduplicatedSignal(baseSignal, previousSetupKey);

  return {
    ...deduped.signal,
    isDuplicate: deduped.isDuplicate,
  };
};
