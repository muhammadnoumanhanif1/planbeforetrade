// src/app/backtest/page.tsx
'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BacktestResult } from '@/features/smart-trading-engine/backtestEngine';

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-03-31');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe,
          startDate: `${startDate}T00:00:00Z`,
          endDate: `${endDate}T23:59:59Z`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to run backtest');
      }

      const data: BacktestResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Backtesting Engine</h1>

      <form onSubmit={handleRunBacktest} className="mb-8 p-4 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">Symbol</label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="timeframe" className="block text-sm font-medium text-gray-700">Timeframe</label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </form>

      {error && <div className="my-4 p-4 text-red-700 bg-red-100 border border-red-400 rounded-lg">{error}</div>}

      {result && (
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-xl font-bold mb-4">Backtest Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="p-4 bg-gray-100 rounded-lg text-center">
              <div className="text-sm text-gray-500">Total Trades</div>
              <div className="text-2xl font-bold">{result.totalTrades}</div>
            </div>
            <div className="p-4 bg-green-100 rounded-lg text-center">
              <div className="text-sm text-gray-500">Wins</div>
              <div className="text-2xl font-bold">{result.wins}</div>
            </div>
            <div className="p-4 bg-red-100 rounded-lg text-center">
              <div className="text-sm text-gray-500">Losses</div>
              <div className="text-2xl font-bold">{result.losses}</div>
            </div>
            <div className="p-4 bg-blue-100 rounded-lg text-center">
              <div className="text-sm text-gray-500">Win Rate</div>
              <div className="text-2xl font-bold">{result.winRate.toFixed(2)}%</div>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg text-center">
              <div className="text-sm text-gray-500">Total R</div>
              <div className="text-2xl font-bold">{result.totalR.toFixed(2)}R</div>
            </div>
            <div className="p-4 bg-orange-100 rounded-lg text-center">
              <div className="text-sm text-gray-500">Max Drawdown</div>
              <div className="text-2xl font-bold">{result.maxDrawdown.toFixed(2)}R</div>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-4">Profit Curve</h3>
          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <LineChart data={result.profitCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
                />
                <YAxis label={{ value: 'R Value', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(2)}R`, "Profit"]}
                />
                <Legend />
                <Line type="monotone" dataKey="rValue" stroke="#8884d8" strokeWidth={2} dot={false} name="Total R" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
