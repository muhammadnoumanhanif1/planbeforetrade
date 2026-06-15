// src/components/BacktestResultDisplay.tsx
'use client';

import { BacktestResult } from '@/features/smart-trading-engine/backtestEngine';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { generateEquityCurve } from '@/features/smart-trading-engine/performanceAnalytics';

interface Props {
  results: BacktestResult;
}

export function BacktestResultDisplay({ results }: Props) {
  const equityCurve = generateEquityCurve(results);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-2">Backtest Results</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="p-4 bg-gray-100 rounded">
          <div className="text-sm text-gray-500">Total Trades</div>
          <div className="text-2xl font-bold">{results.totalTrades}</div>
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <div className="text-sm text-gray-500">Win Rate</div>
          <div className="text-2xl font-bold">{results.winRate}</div>
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <div className="text-sm text-gray-500">Total R</div>
          <div className={`text-2xl font-bold ${results.totalR >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {results.totalR.toFixed(2)}R
          </div>
        </div>
        <div className="p-4 bg-gray-100 rounded">
          <div className="text-sm text-gray-500">Max Drawdown</div>
          <div className="text-2xl font-bold text-red-500">-{results.maxDrawdown.toFixed(2)}R</div>
        </div>
      </div>

      <h3 className="text-lg font-bold mt-6 mb-2">Equity Curve</h3>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={equityCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tradeNumber" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="rValue" stroke="#8884d8" name="R Value" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
