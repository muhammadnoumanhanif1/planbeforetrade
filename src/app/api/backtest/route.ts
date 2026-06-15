// src/app/api/backtest/route.ts
import { NextResponse } from 'next/server';
import { runBacktest, BacktestInput } from '@/features/smart-trading-engine/backtestEngine';
import { getFromCache } from '@/lib/cache';

// Define the Candle type, as it's not globally available
interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, timeframe, startDate, endDate } = body;

    if (!symbol || !timeframe || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const input: BacktestInput = {
      symbol,
      timeframe,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    const result = await runBacktest(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Backtest API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to run backtest', details: errorMessage }, { status: 500 });
  }
}

async function fetchHistoricalData(
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string
): Promise<Candle[]> {
  const cacheKey = `historical:${symbol}:${timeframe}:${startDate}:${endDate}`;
  return getFromCache(cacheKey, async () => {
    console.log(`Fetching historical data for ${symbol} (${timeframe}) from ${startDate} to ${endDate}`);
    // In a real app, fetch from an exchange API. For now, generate mock data.
    const candles: Candle[] = [];
    let price = 60000 + Math.random() * 10000;
    const numCandles = 500; // Generate a fixed number of candles for the mock
    for (let i = 0; i < numCandles; i++) {
      const open = price;
      const close = price + (Math.random() - 0.48) * 500; // Slight upward bias
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;
      candles.push({
        time: Date.now() - (numCandles - i) * 3600000, // Hourly candles
        open,
        high,
        low,
        close,
        volume: 1000 + Math.random() * 500,
      });
      price = close;
    }
    return candles;
  });
}
