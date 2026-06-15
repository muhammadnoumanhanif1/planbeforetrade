// src/lib/ai-learning/server.ts
// Server-only AI learning utilities
'use server';

import { createAdminClient } from "@/lib/supabase-server";
import { AiTradeRecord, AiWeights, recalculateAiWeights, DEFAULT_AI_WEIGHTS } from "./engine";

/**
 * Get latest weights from database
 */
export async function getLatestWeightsFromDb(): Promise<AiWeights> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_weights")
      .select("*")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return DEFAULT_AI_WEIGHTS;
    }

    return data;
  } catch (error) {
    console.error('Error fetching AI weights:', error);
    return DEFAULT_AI_WEIGHTS;
  }
}

/**
 * Save updated weights to database
 */
export async function saveWeights(weights: AiWeights, version: number, metadata: Record<string, any> = {}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("ai_weights")
      .insert({
        version,
        ...weights,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      });

    if (error) {
      console.error('Error saving weights:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in saveWeights:', error);
    return false;
  }
}

/**
 * Record a completed trade
 */
export async function recordTrade(trade: Omit<AiTradeRecord, 'created_at'>): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("ai_trade_history")
      .insert({
        ...trade,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error recording trade:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in recordTrade:', error);
    return false;
  }
}

/**
 * Get recent trades for analysis
 */
export async function getRecentTrades(limit: number = 100): Promise<AiTradeRecord[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ai_trade_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error fetching trades:', error);
    return [];
  }
}

/**
 * Recalculate and update weights based on recent trades
 */
export async function recalculateAndUpdateWeights(): Promise<{
  success: boolean;
  newWeights?: AiWeights;
  version?: number;
}> {
  try {
    // Get recent trades
    const trades = await getRecentTrades(500);
    
    if (trades.length < 10) {
      return { success: false };
    }

    // Get current version
    const currentWeights = await getLatestWeightsFromDb();
    const { data: latestVersion } = await createAdminClient()
      .from("ai_weights")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    const newVersion = (latestVersion?.version || 1) + 1;

    // Recalculate weights
    const newWeights = recalculateAiWeights(trades);

    // Save to database
    const saved = await saveWeights(newWeights, newVersion, {
      trades_analyzed: trades.length,
      algorithm: 'adaptive_learning',
    });

    if (saved) {
      return {
        success: true,
        newWeights,
        version: newVersion,
      };
    }

    return { success: false };
  } catch (error) {
    console.error('Error in recalculateAndUpdateWeights:', error);
    return { success: false };
  }
}

/**
 * Get performance metrics by symbol, trend, and strategy
 */
export async function getPerformanceMetrics() {
  try {
    const admin = createAdminClient();
    const { data: trades } = await admin
      .from("ai_trade_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!trades || trades.length === 0) {
      return {
        by_symbol: {},
        by_trend: {},
        by_strategy: {},
      };
    }

    const metrics: any = {
      by_symbol: {},
      by_trend: {},
      by_strategy: {},
    };

    trades.forEach((trade: AiTradeRecord) => {
      // By Symbol
      if (!metrics.by_symbol[trade.symbol]) {
        metrics.by_symbol[trade.symbol] = {
          total_trades: 0,
          wins: 0,
          losses: 0,
          win_rate: 0,
          avg_r: 0,
        };
      }
      const sym = metrics.by_symbol[trade.symbol];
      sym.total_trades++;
      if (trade.result === 'WIN') sym.wins++;
      else sym.losses++;
      sym.avg_r = (sym.avg_r * (sym.total_trades - 1) + trade.result_r) / sym.total_trades;
      sym.win_rate = sym.total_trades > 0 ? (sym.wins / sym.total_trades) * 100 : 0;

      // By Trend
      if (!metrics.by_trend[trade.trend]) {
        metrics.by_trend[trade.trend] = {
          total_trades: 0,
          wins: 0,
          losses: 0,
          win_rate: 0,
          avg_r: 0,
        };
      }
      const trend = metrics.by_trend[trade.trend];
      trend.total_trades++;
      if (trade.result === 'WIN') trend.wins++;
      else trend.losses++;
      trend.avg_r = (trend.avg_r * (trend.total_trades - 1) + trade.result_r) / trend.total_trades;
      trend.win_rate = trend.total_trades > 0 ? (trend.wins / trend.total_trades) * 100 : 0;

      // By Strategy
      if (!metrics.by_strategy[trade.strategy_type]) {
        metrics.by_strategy[trade.strategy_type] = {
          total_trades: 0,
          wins: 0,
          losses: 0,
          win_rate: 0,
          avg_r: 0,
        };
      }
      const strategy = metrics.by_strategy[trade.strategy_type];
      strategy.total_trades++;
      if (trade.result === 'WIN') strategy.wins++;
      else strategy.losses++;
      strategy.avg_r = (strategy.avg_r * (strategy.total_trades - 1) + trade.result_r) / strategy.total_trades;
      strategy.win_rate = strategy.total_trades > 0 ? (strategy.wins / strategy.total_trades) * 100 : 0;
    });

    return metrics;
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return {
      by_symbol: {},
      by_trend: {},
      by_strategy: {},
    };
  }
}
