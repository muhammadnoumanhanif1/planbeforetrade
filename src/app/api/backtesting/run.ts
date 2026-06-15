// src/app/api/backtest/run/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // In a real app, you'd parse the request body to get backtest parameters
  // const { symbol, timeframe, startDate, endDate, strategy } = await request.json();

  // For now, return mock data after a short delay to simulate processing
  await new Promise(resolve => setTimeout(resolve, 1500));

  const mockData = {
    summary: {
      totalTrades: 125,
      wins: 78,
      losses: 47,
      winRate: 62.4,
      totalR: 157.5,
      maxDrawdown: -15.2,
    },
    equityCurve: Array.from({ length: 125 }, (_, i) => ({
      trade: i + 1,
      r: (Math.random() > 0.4 ? 3 : -1) + (i > 0 ? Math.random() * 2 - 1 : 0),
    })).reduce((acc, curr) => {
      const lastR = acc.length > 0 ? acc[acc.length - 1].cumulativeR : 0;
      acc.push({ trade: curr.trade, cumulativeR: lastR + curr.r });
      return acc;
    }, [] as { trade: number; cumulativeR: number }[]),
    trades: [
      { id: 1, symbol: 'BTCUSDT', entry: 68000, sl: 67000, tp: 71000, result: 'WIN', rGained: 3, date: '2026-04-22' },
      { id: 2, symbol: 'ETHUSDT', entry: 3500, sl: 3450, tp: 3650, result: 'WIN', rGained: 3, date: '2026-04-22' },
      { id: 3, symbol: 'BTCUSDT', entry: 69000, sl: 69500, tp: 68000, result: 'LOSS', rGained: -1, date: '2026-04-21' },
      // Add more mock trades if needed
    ],
    insights: {
        bestCoin: 'ETHUSDT',
        worstCoin: 'SOLUSDT',
        avgR: 1.26,
        longs: { wins: 50, losses: 20 },
        shorts: { wins: 28, losses: 27 },
    }
  };

  return NextResponse.json(mockData);
}
