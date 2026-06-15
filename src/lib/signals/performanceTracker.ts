import type { SignalRecord } from "./signalHistoryManager";

export type CoinStats = {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  totalR: number;
  avgR: number;
};

export type PerformanceSummary = {
  totalTrades: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  totalR: number;
  avgR: number;
  bySymbol: Record<string, CoinStats>;
};

export function calculatePerformance(records: SignalRecord[]): PerformanceSummary {
  const bySymbol: Record<string, CoinStats> = {};

  for (const record of records) {
    if (!bySymbol[record.symbol]) {
      bySymbol[record.symbol] = {
        symbol: record.symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        winRate: 0,
        totalR: 0,
        avgR: 0,
      };
    }
    const stats = bySymbol[record.symbol];
    stats.trades += 1;
    if (record.result === "WIN") {
      stats.wins += 1;
      stats.totalR += record.result_R ?? 3;
    } else if (record.result === "LOSS") {
      stats.losses += 1;
      stats.totalR += record.result_R ?? -1;
    } else {
      stats.pending += 1;
    }
  }

  for (const stats of Object.values(bySymbol)) {
    const closed = stats.wins + stats.losses;
    stats.winRate = closed > 0 ? stats.wins / closed : 0;
    stats.avgR = closed > 0 ? stats.totalR / closed : 0;
  }

  let totalTrades = 0;
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let totalR = 0;

  for (const stats of Object.values(bySymbol)) {
    totalTrades += stats.trades;
    wins += stats.wins;
    losses += stats.losses;
    pending += stats.pending;
    totalR += stats.totalR;
  }

  const closedTotal = wins + losses;
  const winRate = closedTotal > 0 ? wins / closedTotal : 0;
  const avgR = closedTotal > 0 ? totalR / closedTotal : 0;

  return { totalTrades, wins, losses, pending, winRate, totalR, avgR, bySymbol };
}

export function getTopPerformers(summary: PerformanceSummary, n = 5): CoinStats[] {
  return Object.values(summary.bySymbol)
    .sort((a, b) => b.winRate - a.winRate || b.totalR - a.totalR)
    .slice(0, n);
}

export function formatPerformanceSummary(summary: PerformanceSummary): string {
  const wr = (summary.winRate * 100).toFixed(1);
  return (
    `Trades: ${summary.totalTrades} | ` +
    `Wins: ${summary.wins} | ` +
    `Losses: ${summary.losses} | ` +
    `Pending: ${summary.pending} | ` +
    `Win Rate: ${wr}% | ` +
    `Total R: ${summary.totalR.toFixed(1)} | ` +
    `Avg R: ${summary.avgR.toFixed(2)}`
  );
}
