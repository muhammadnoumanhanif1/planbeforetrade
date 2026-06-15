export type MarketTrend = "UPTREND" | "DOWNTREND" | "SIDEWAYS";

export type TradeAction = "BUY" | "SELL" | "WAIT";

export type TradeStatus = "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";

export type MarketCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

// Multi-timeframe candle data
export type MultiTimeframeCandles = {
  htf: MarketCandle[]; // 1H timeframe (higher timeframe)
  ltf: MarketCandle[]; // 5M or 15M (lower timeframe)
};

// Entry confirmation details
export type EntryConfirmation = {
  confirmed: boolean;
  confirmationType: "bullish_engulfing" | "bearish_engulfing" | "rejection_wick" | "rsi_cross" | "volume_surge" | null;
  description: string;
  bullishConfirmations: {
    bullishEngulfing: boolean;
    strongRejectionWick: boolean;
    rsiCrossUp: boolean; // RSI < 40 -> up
  };
  bearishConfirmations: {
    bearishEngulfing: boolean;
    rejectionWickAtResistance: boolean;
    rsiCrossDown: boolean; // RSI > 60 -> down
  };
};

// Liquidity sweep detection
export type LiquiditySweepDetection = {
  detected: boolean;
  type: "support_liquidity_sweep" | "resistance_liquidity_sweep" | null;
  description: string;
  priceAction: {
    minPriceInLastCandles: number; // For BUY: dip below support
    maxPriceInLastCandles: number; // For SELL: spike above resistance
    recoveryStrength: number; // 0-100 recovery percentage
  };
};

// Entry zone strength scoring
export type EntryZoneStrength = {
  score: number; // 0-100
  factors: {
    recentStructure: number; // How tight recent swings are
    liquidityArea: number; // How many touches of level
    volatilityFactor: number; // Based on ATR
    timeframeConfluence: number; // Multi-timeframe confirmation
  };
  assessment: "very_tight" | "tight" | "normal" | "wide";
};

// Partial entry (DCA) system
export type PartialEntry = {
  enabled: boolean;
  parts: {
    part1: { percentage: number; level: number; // 30% at top of zone
  };
    part2: { percentage: number; level: number; // 40% at mid
  };
    part3: { percentage: number; level: number; // 30% at bottom
  };
  };
};

// Volume confirmation
export type VolumeConfirmation = {
  confirmed: boolean;
  entryCandleVolume: number;
  averageVolume: number;
  volumeRatio: number; // current / average
  description: string;
  minimumRatio: number; // Default: 1.2 (20% above average)
};

// Entry quality scoring
export type EntryQualityScore = {
  score: number; // 0-100
  components: {
    confirmationStrength: number; // 0-100
    volumeStrength: number; // 0-100
    zoneStrength: number; // 0-100
    trendAlignment: number; // 0-100
    timeframeAlignment: number; // 0-100
  };
  assessment: "excellent" | "good" | "acceptable" | "poor";
  passFilter: boolean; // score >= 70
};

export type TrendDetectionResult = {
  trend: MarketTrend;
  ema20: number;
  ema50: number;
  rsi: number;
  reasons: string[];
  trendStrength: number;
};

export type SupportResistanceResult = {
  nearestSupport: number | null;
  nearestResistance: number | null;
  supports: number[];
  resistances: number[];
};

export type EntryZone = [number, number] | null;

export type GeneratedSignal = {
  // === CORE SIGNAL IDENTIFICATION ===
  symbol: string;
  exchange?: string;
  signal_number?: string;
  trend: MarketTrend;
  action: TradeAction;
  strategy_type: string;
  status: TradeStatus;
  setup: TradeStatus;
  generatedAt: string;

  // === PRICE & ENTRY DATA ===
  entry_price: number | null;
  current_price: number | null;
  entry_zone: EntryZone;
  distanceToEntryZone: number | null;

  // === RISK MANAGEMENT ===
  stop_loss: number | null;
  take_profit: number | null;
  tp1: number | null; // 1R profit level
  tp2: number | null; // 2R profit level
  tp3: number | null; // 3R profit level
  risk: {
    riskRewardRatio: number;
    riskPerTradePercent: number;
    invalidationLevel: number | null;
  };

  // === CONFIRMATION & QUALITY SCORING ===
  entry_confirmation: EntryConfirmation;
  entry_quality_score: EntryQualityScore;
  
  // === VOLUME & STRUCTURE ===
  volume_confirmation: VolumeConfirmation;
  liquidity_sweep_detection: LiquiditySweepDetection;
  
  // === ENTRY ZONE ANALYSIS ===
  entry_zone_strength: EntryZoneStrength;
  
  // === PARTIAL ENTRY (DCA) ===
  partial_entry: PartialEntry;
  
  // === DELAYED ENTRY ===
  entry_delay_candles: number; // 1-2 candles to wait before entering
  candles_waited: number; // How many candles have been waited
  
  // === MULTI-TIMEFRAME ===
  htf_trend: MarketTrend; // 1H timeframe trend
  ltf_trend: MarketTrend; // 5M/15M timeframe trend
  timeframe_alignment: boolean; // HTF and LTF aligned?
  
  // === SCORING & CONFIDENCE ===
  confidence: number;
  ai_score: number;
  confidence_label: "HIGH" | "MEDIUM" | "LOW";

  // === TECHNICAL INDICATORS ===
  indicators: {
    ema20: number;
    ema50: number;
    rsi: number;
    volume: number;
    ema_alignment: boolean;
    atr: number; // Average True Range for volatility
  };

  // === SUPPORT & RESISTANCE ===
  levels: {
    nearestSupport: number | null;
    nearestResistance: number | null;
    entryZoneLow: number | null;
    entryZoneHigh: number | null;
  };

  // === METADATA ===
  notes: string[];
  isDuplicate: boolean;
  setupKey: string | null;
  passesAllFilters: boolean; // Final filter check
};

export type ScannedSignal = {
  symbol: string;
  trend: MarketTrend;
  setup: TradeStatus;
  entry_zone: EntryZone;
  confidence: number;
  distanceToEntryZone: number | null;
  current_price: number | null;
  signal: GeneratedSignal;
};
