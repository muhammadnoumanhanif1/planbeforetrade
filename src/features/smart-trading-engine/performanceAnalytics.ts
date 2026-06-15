// src/features/smart-trading-engine/performanceAnalytics.ts

import { BacktestResult } from './backtestEngine';

/**
 * Generates equity curve data for visualization
 * Shows cumulative profit/loss over time
 */
export function generateEquityCurve(results: BacktestResult) {
  if (!results.profitCurve || results.profitCurve.length === 0) {
    return [];
  }

  return results.profitCurve.map((point, index) => ({
    name: (index + 1).toString(),
    R: point.rValue,
    tradeNumber: index + 1,
  }));
}

/**
 * VISUALIZATION (IMPORTANT)
 *
 * Display:
 * - Equity curve (profit over time)
 * - Win/Loss distribution
 * - Best performing coins
 */
