"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from "@/components/Navigation";
import styles from "../../page.module.css";

// Mock data for now, will be replaced by API call
const mockSummary = {
  totalTrades: 125,
  wins: 78,
  losses: 47,
  winRate: 62.4,
  totalR: 157.5,
  maxDrawdown: -15.2,
};

const mockEquityCurve = [
  { name: '1', R: 1 }, { name: '2', R: 2 }, { name: '3', R: 1 }, { name: '4', R: 4 },
  { name: '5', R: 3 }, { name: '6', R: 5 }, { name: '7', R: 6 }, { name: '8', R: 5 },
  { name: '9', R: 7 }, { name: '10', R: 8 },
];

const mockTrades = [
  { id: 1, symbol: 'BTCUSDT', entry: 68000, sl: 67000, tp: 71000, result: 'WIN', rGained: 3, date: '2026-04-22' },
  { id: 2, symbol: 'ETHUSDT', entry: 3500, sl: 3450, tp: 3650, result: 'WIN', rGained: 3, date: '2026-04-22' },
  { id: 3, symbol: 'BTCUSDT', entry: 69000, sl: 69500, tp: 68000, result: 'LOSS', rGained: -1, date: '2026-04-21' },
];

const mockInsights = {
    bestCoin: 'ETHUSDT',
    worstCoin: 'SOLUSDT',
    avgR: 1.26,
    longs: { wins: 50, losses: 20 },
    shorts: { wins: 28, losses: 27 },
}

export default function AdminBacktestingDashboard() {
  const [loading, setLoading] = useState(true);
  const [backtestData, setBacktestData] = useState<any>(null);

  useEffect(() => {
    runBacktest();
  }, []);

  const runBacktest = async () => {
    setLoading(true);
    // const response = await fetch('/api/backtesting/run', { method: 'POST', body: JSON.stringify(inputs) });
    // const data = await response.json();
    // setBacktestData(data);
    
    // Using mock data for now
    setTimeout(() => {
        setBacktestData({
            summary: mockSummary,
            equityCurve: mockEquityCurve,
            trades: mockTrades,
            insights: mockInsights,
        });
        setLoading(false);
    }, 1500);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>BACKTESTING DASHBOARD</h1>
              <p className={styles.subtitle}>Backtest trading strategies and analyze historical performance.</p>
            </div>
          </div>
        </header>
        <Navigation />

        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Input Controls */}
          <Card className="mb-8 bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Configure Backtest</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Symbol, Timeframe, Strategy Selectors */}
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Symbol</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white hover:border-slate-600 focus:border-blue-500">
                    <option>BTCUSDT</option>
                    <option>ETHUSDT</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Timeframe</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white hover:border-slate-600 focus:border-blue-500">
                    <option>1m</option>
                    <option>5m</option>
                    <option>15m</option>
                    <option>1h</option>
                    <option>4h</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Strategy</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white hover:border-slate-600 focus:border-blue-500">
                    <option>SMC + S/R</option>
                    <option>Breakout + Retest</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2">From</label>
                  <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white hover:border-slate-600 focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2">To</label>
                  <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white hover:border-slate-600 focus:border-blue-500" />
                </div>
                <button 
                  onClick={runBacktest} 
                  disabled={loading} 
                  className="lg:col-span-5 mt-auto bg-blue-600 hover:bg-blue-700 rounded p-2 font-semibold disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Running...' : 'Run Backtest'}
                </button>
              </div>
            </CardContent>
          </Card>

          {loading && !backtestData && (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400">Running backtest analysis...</p>
              </div>
            </div>
          )}
          
          {backtestData && (
            <>
              {/* Results Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {Object.entries(backtestData.summary).map(([key, value]: [string, any]) => (
                  <Card key={key} className="bg-slate-900/50 border-slate-700">
                    <CardContent className="pt-6">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {String(value)}{String(key).includes('Rate') ? '%' : ''}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Equity Curve Chart */}
              <Card className="mb-8 bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Equity Curve</CardTitle>
                  <CardDescription className="text-slate-400">
                    Cumulative return in R-units over the backtest period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={backtestData.equityCurve} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="R" stroke="#10b981" strokeWidth={2} dot={false} name="Cumulative R" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Trade History Table */}
              <Card className="mb-8 bg-slate-900/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Trade History</CardTitle>
                  <CardDescription className="text-slate-400">
                    Detailed list of all trades in the backtest
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-700">
                        <tr>
                          {Object.keys(mockTrades[0]).map(key => (
                            <th key={key} scope="col" className="px-6 py-3 font-semibold">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {backtestData.trades.map((trade: any) => (
                          <tr key={trade.id} className="border-b border-slate-700 hover:bg-slate-800/30">
                            <td className="px-6 py-4 font-medium text-white">{trade.id}</td>
                            <td className="px-6 py-4 text-slate-300">{trade.symbol}</td>
                            <td className="px-6 py-4 text-slate-300">{trade.entry}</td>
                            <td className="px-6 py-4 text-red-400">{trade.sl}</td>
                            <td className="px-6 py-4 text-green-400">{trade.tp}</td>
                            <td className="px-6 py-4">
                              <span className={String(trade.result) === 'WIN' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                                {String(trade.result)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{trade.rGained}</td>
                            <td className="px-6 py-4 text-slate-300">{trade.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Best Coin</p>
                      <p className="text-lg font-semibold text-green-400">{backtestData.insights.bestCoin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Worst Coin</p>
                      <p className="text-lg font-semibold text-red-400">{backtestData.insights.worstCoin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Average R/Trade</p>
                      <p className="text-lg font-semibold text-blue-400">{backtestData.insights.avgR}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Long Trades</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Wins</p>
                      <p className="text-lg font-semibold text-green-400">{backtestData.insights.longs.wins}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Losses</p>
                      <p className="text-lg font-semibold text-red-400">{backtestData.insights.longs.losses}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-900/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">Short Trades</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Wins</p>
                      <p className="text-lg font-semibold text-green-400">{backtestData.insights.shorts.wins}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Losses</p>
                      <p className="text-lg font-semibold text-red-400">{backtestData.insights.shorts.losses}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}