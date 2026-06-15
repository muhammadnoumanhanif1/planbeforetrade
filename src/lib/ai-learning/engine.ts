export type TradeResult = "WIN" | "LOSS";

export type AiTradeRecord = {
  symbol: string;
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  strategy_type: string;
  result: TradeResult;
  result_r: number;
  ai_score: number;
  indicators: {
    rsi: number;
    ema_alignment: boolean;
    volume: number;
  };
  created_at: string;
};

export type AiWeights = {
  trend_weight: number;
  volume_weight: number;
  rsi_weight: number;
  entry_quality_weight: number;
  historical_performance_weight: number;
};

export type SetupStats = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgR: number;
};

export const DEFAULT_AI_WEIGHTS: AiWeights = {
  trend_weight: 0.24,
  volume_weight: 0.18,
  rsi_weight: 0.2,
  entry_quality_weight: 0.16,
  historical_performance_weight: 0.22,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isFavorableRsiForTrend = (trend: AiTradeRecord["trend"], rsi: number) => {
  if (trend === "UPTREND") return rsi <= 45;
  if (trend === "DOWNTREND") return rsi >= 55;
  return true;
};

const normalizeWeights = (weights: AiWeights): AiWeights => {
  const total =
    weights.trend_weight +
    weights.volume_weight +
    weights.rsi_weight +
    weights.entry_quality_weight +
    weights.historical_performance_weight;

  if (!Number.isFinite(total) || total <= 0) return DEFAULT_AI_WEIGHTS;

  return {
    trend_weight: weights.trend_weight / total,
    volume_weight: weights.volume_weight / total,
    rsi_weight: weights.rsi_weight / total,
    entry_quality_weight: weights.entry_quality_weight / total,
    historical_performance_weight: weights.historical_performance_weight / total,
  };
};

const getSetupKey = (trade: Pick<AiTradeRecord, "symbol" | "trend" | "strategy_type">) =>
  `${trade.symbol}::${trade.trend}::${trade.strategy_type}`;

export const buildSetupStats = (trades: AiTradeRecord[]) => {
  const bucket = new Map<string, SetupStats>();

  for (const trade of trades) {
    const key = getSetupKey(trade);
    const current = bucket.get(key) ?? { trades: 0, wins: 0, losses: 0, winRate: 0, avgR: 0 };
    const nextTrades = current.trades + 1;
    const nextWins = current.wins + (trade.result === "WIN" ? 1 : 0);
    const nextLosses = current.losses + (trade.result === "LOSS" ? 1 : 0);
    const nextAvgR = (current.avgR * current.trades + Number(trade.result_r || 0)) / nextTrades;

    bucket.set(key, {
      trades: nextTrades,
      wins: nextWins,
      losses: nextLosses,
      winRate: nextWins / nextTrades,
      avgR: nextAvgR,
    });
  }

  return bucket;
};

export const getConfidenceLabel = (score: number): "HIGH" | "MEDIUM" | "LOW" => {
  if (score >= 75) return "HIGH";
  if (score >= 55) return "MEDIUM";
  return "LOW";
};

export const calculateAdaptiveAiScore = (params: {
  baseScore: number;
  symbol: string;
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  strategyType: string;
  rsi: number;
  volume: number;
  entryQuality: number;
  weights: AiWeights;
  setupStats: Map<string, SetupStats>;
}) => {
  const normalizedWeights = normalizeWeights(params.weights);
  const setup = params.setupStats.get(`${params.symbol}::${params.trend}::${params.strategyType}`);
  const setupWinRate = setup?.winRate ?? 0.5;
  const setupAvgR = setup?.avgR ?? 0;

  const trendScore = clamp(setupWinRate * 100, 20, 95);
  const volumeScore = clamp(params.volume > 0 ? 65 : 40, 20, 90);
  const rsiBias =
    params.trend === "UPTREND"
      ? params.rsi <= 45
      : params.trend === "DOWNTREND"
        ? params.rsi >= 55
        : params.rsi >= 45 && params.rsi <= 55;
  const rsiScore = rsiBias ? 78 : 42;
  const entryQualityScore = clamp(params.entryQuality, 20, 95);
  const historicalPerformanceScore = clamp(setupWinRate * 85 + setupAvgR * 8 + 20, 10, 95);

  const learnedScore =
    trendScore * normalizedWeights.trend_weight +
    volumeScore * normalizedWeights.volume_weight +
    rsiScore * normalizedWeights.rsi_weight +
    entryQualityScore * normalizedWeights.entry_quality_weight +
    historicalPerformanceScore * normalizedWeights.historical_performance_weight;

  return clamp(Math.round(params.baseScore * 0.35 + learnedScore * 0.65), 0, 100);
};

export const recalculateAiWeights = (trades: AiTradeRecord[]): AiWeights => {
  if (trades.length < 10) return DEFAULT_AI_WEIGHTS;

  const wins = trades.filter((trade) => trade.result === "WIN");
  const totalTrades = trades.length;
  const globalWinRate = wins.length / totalTrades;
  const averageR =
    trades.reduce((sum, trade) => sum + (Number.isFinite(trade.result_r) ? trade.result_r : 0), 0) /
    totalTrades;

  const favorableRsiWins = wins.filter((trade) => isFavorableRsiForTrend(trade.trend, trade.indicators.rsi)).length;
  const favorableRsiRate = favorableRsiWins / Math.max(1, wins.length);

  const emaAlignedWins = wins.filter((trade) => trade.indicators.ema_alignment).length;
  const emaAlignedRate = emaAlignedWins / Math.max(1, wins.length);

  const positiveVolumeRate = wins.filter((trade) => trade.indicators.volume > 0).length / Math.max(1, wins.length);

  const base = {
    trend_weight: clamp(0.15 + globalWinRate * 0.25 + emaAlignedRate * 0.1, 0.12, 0.42),
    volume_weight: clamp(0.12 + positiveVolumeRate * 0.22, 0.08, 0.34),
    rsi_weight: clamp(0.12 + favorableRsiRate * 0.24, 0.08, 0.36),
    entry_quality_weight: clamp(0.12 + (globalWinRate + Math.max(averageR, -1)) * 0.09, 0.08, 0.32),
    historical_performance_weight: clamp(0.14 + globalWinRate * 0.22 + Math.max(0, averageR) * 0.05, 0.1, 0.4),
  };

  return normalizeWeights(base);
};

export const getLatestWeights = async (): Promise<AiWeights> => {
  // This is a client-side safe version
  // Server implementation is in src/lib/ai-learning/server.ts
  try {
    const response = await fetch('/api/ai-learning/weights');
    if (!response.ok) throw new Error('Failed to fetch weights');
    const data = await response.json();
    return data || DEFAULT_AI_WEIGHTS;
  } catch {
    return DEFAULT_AI_WEIGHTS;
  }
};
