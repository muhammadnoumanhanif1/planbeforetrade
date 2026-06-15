// src/features/smart-trading-engine/backtestEngine.ts
import { Candle, generateSignal, Signal, SignalType } from './signalGenerator';

/**
 * BACKTESTING ENGINE
 */

export interface BacktestInput {
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '1h';
  startDate: Date;
  endDate: Date;
}

export interface BacktestResult {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalR: number;
  maxDrawdown: number;
  profitCurve: { timestamp: number; rValue: number }[];
}

interface SimulatedTrade {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  type: SignalType;
  isActive: boolean;
  resultR: number | null;
}

// Mock function to fetch historical data for backtesting
async function fetchHistoricalData(input: BacktestInput): Promise<Candle[]> {
  console.log(`Fetching historical data for ${input.symbol} from ${input.startDate} to ${input.endDate}`);
  // In a real application, fetch data from your data source
  const candles: Candle[] = [];
  let currentDate = new Date(input.startDate);
  while (currentDate <= input.endDate) {
    const open = 100 + Math.random() * 50 + (currentDate.getTime() - input.startDate.getTime()) / 86400000 * (Math.random() - 0.4);
    const close = open + (Math.random() - 0.5) * 5;
    const high = Math.max(open, close) + Math.random() * 2;
    const low = Math.min(open, close) - Math.random() * 2;
    candles.push({
      timestamp: currentDate.getTime(),
      open, high, low, close,
      volume: 10000 + Math.random() * 5000,
    });
    currentDate.setMinutes(currentDate.getMinutes() + 1); // Assuming 1m timeframe for mock
  }
  return candles;
}

/**
 * Runs a backtest of the trading strategy.
 * @param input - The backtest parameters.
 * @returns The results of the backtest.
 */
export async function runBacktest(input: BacktestInput, candles?: Candle[]): Promise<BacktestResult> {
  const historicalCandles = candles || await fetchHistoricalData(input);
  if (historicalCandles.length < 50) {
    throw new Error('Not enough historical data for backtest.');
  }

  let trades: SimulatedTrade[] = [];
  let activeTrade: SimulatedTrade | null = null;
  let totalR = 0;
  let maxDrawdown = 0;
  let peakR = 0;
  const profitCurve: { timestamp: number; rValue: number }[] = [];

  for (let i = 49; i < historicalCandles.length; i++) {
    const currentCandles = historicalCandles.slice(0, i + 1);
    const signal = generateSignal(currentCandles, input.symbol, 'binance');

    if (signal && !activeTrade) {
      const entryPrice = signal.entryZone.max; // Use entry zone for entry price
      const risk = entryPrice * 0.02; // 2% risk
      const stopLoss = signal.stopLoss;
      const takeProfit = signal.takeProfit;

      activeTrade = {
        entryPrice,
        stopLoss,
        takeProfit,
        type: signal.type as any,
        isActive: true,
        resultR: null,
      };
    }

    if (activeTrade) {
        const currentCandle = historicalCandles[i];
        if (activeTrade.type === 'BUY' || (activeTrade.type as any) === SignalType.BUY) {
            if (currentCandle.low <= activeTrade.stopLoss) {
                activeTrade.resultR = -1;
                totalR -= 1;
                activeTrade.isActive = false;
            } else if (currentCandle.high >= activeTrade.takeProfit) {
                activeTrade.resultR = 3; // 3R profit
                totalR += 3;
                activeTrade.isActive = false;
            }
        } else { // SELL
            if (currentCandle.high >= activeTrade.stopLoss) {
                activeTrade.resultR = -1;
                totalR -= 1;
                activeTrade.isActive = false;
            } else if (currentCandle.low <= activeTrade.takeProfit) {
                activeTrade.resultR = 3;
                totalR += 3;
                activeTrade.isActive = false;
            }
        }
        if (!activeTrade.isActive) {
            trades.push(activeTrade);
            activeTrade = null;
        }
    }

    profitCurve.push({ timestamp: historicalCandles[i].timestamp, rValue: totalR });
    if (totalR > peakR) {
        peakR = totalR;
    }
    const drawdown = peakR - totalR;
    if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
    }
  }

  const wins = trades.filter(t => t.resultR && t.resultR > 0).length;
  const losses = trades.filter(t => t.resultR && t.resultR < 0).length;

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? wins / trades.length : 0,
    totalR,
    maxDrawdown,
    profitCurve,
  };
}

