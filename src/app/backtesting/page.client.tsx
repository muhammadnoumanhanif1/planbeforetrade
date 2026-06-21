"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from '../page.module.css';
import { Navigation } from '@/components/Navigation';

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


export default function BacktestingDashboard() {
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
        {/* Header */}
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

        {/* Input Controls */}
        <div className={styles.card}>
          <h2>Configure Backtest</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {/* Symbol, Timeframe, Strategy Selectors */}
            <label className={styles.label}>
              Symbol
              <select className={styles.input}>
                <option>BTCUSDT</option>
                <option>ETHUSDT</option>
              </select>
            </label>
            <label className={styles.label}>
              Timeframe
              <select className={styles.input}>
                <option>1m</option>
                <option>5m</option>
                <option>15m</option>
                <option>1h</option>
                <option>4h</option>
              </select>
            </label>
            <label className={styles.label}>
              Strategy
              <select className={styles.input}>
                <option>SMC + S/R</option>
                <option>Breakout + Retest</option>
              </select>
            </label>
            <label className={styles.label}>
              From
              <input type="date" className={styles.input} />
            </label>
            <label className={styles.label}>
              To
              <input type="date" className={styles.input} />
            </label>
            <button
              onClick={runBacktest}
              disabled={loading}
              className={styles.button}
              style={{ alignSelf: 'flex-end' }}
            >
              {loading ? 'Running...' : 'Run Backtest'}
            </button>
          </div>
        </div>

        {loading && !backtestData && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ color: '#94a3b8' }}>Running backtest analysis...</div>
          </div>
        )}

        {backtestData && (
          <>
            {/* Results Summary */}
            <section className={styles.grid}>
              {Object.entries(backtestData.summary).map(([key, value]: [string, any]) => (
                <div key={key} className={styles.card} style={{ minHeight: 120 }}>
                  <p className={styles.labelText}>{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className={styles.priceValue}>
                    {String(value)}{String(key).includes('Rate') ? '%' : ''}
                  </p>
                </div>
              ))}
            </section>

            {/* Equity Curve Chart */}
            <div className={styles.card}>
              <h2>Equity Curve</h2>
              <p className={styles.helperRow}>Cumulative return in R-units over the backtest period</p>
              <div style={{ width: '100%', height: 400, marginTop: 20 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={backtestData.equityCurve} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="R" stroke="#10b981" strokeWidth={2} dot={false} name="Cumulative R" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trade History Table */}
            <div className={styles.card}>
              <h2>Trade History</h2>
              <p className={styles.helperRow} style={{ marginBottom: 16 }}>Detailed list of all trades in the backtest</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {Object.keys(mockTrades[0]).map(key => (
                        <th key={key} scope="col" style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#e2e8f0' }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backtestData.trades.map((trade: any) => (
                      <tr key={trade.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
                        <td style={{ padding: '12px', color: '#e2e8f0', fontWeight: 500 }}>{trade.id}</td>
                        <td style={{ padding: '12px', color: '#cbd5e1' }}>{trade.symbol}</td>
                        <td style={{ padding: '12px', color: '#cbd5e1' }}>${trade.entry}</td>
                        <td style={{ padding: '12px', color: '#cbd5e1' }}>${trade.sl}</td>
                        <td style={{ padding: '12px', color: '#cbd5e1' }}>${trade.tp}</td>
                        <td style={{ padding: '12px', color: trade.result === 'WIN' ? '#34a853' : '#ff6b6b', fontWeight: 600 }}>
                          {trade.result}
                        </td>
                        <td style={{ padding: '12px', color: trade.rGained > 0 ? '#34a853' : '#ff6b6b', fontWeight: 600 }}>
                          {trade.rGained > 0 ? '+' : ''}{trade.rGained}R
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.8em' }}>{trade.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insights */}
            <section className={styles.grid}>
              <div className={styles.card}>
                <h3 style={{ marginTop: 0 }}>Performance Insights</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <p className={styles.labelText}>Best Performing Coin</p>
                    <p className={styles.priceValue}>{backtestData.insights.bestCoin}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Worst Performing Coin</p>
                    <p className={styles.priceValue}>{backtestData.insights.worstCoin}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Average R per Trade</p>
                    <p className={styles.priceValue}>{backtestData.insights.avgR.toFixed(2)}R</p>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <h3 style={{ marginTop: 0 }}>Trade Direction Analysis</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <p className={styles.labelText}>Long Trades</p>
                    <p className={styles.priceValue} style={{ color: '#34a853' }}>
                      {backtestData.insights.longs.wins}W / {backtestData.insights.longs.losses}L
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Short Trades</p>
                    <p className={styles.priceValue} style={{ color: '#ff6b6b' }}>
                      {backtestData.insights.shorts.wins}W / {backtestData.insights.shorts.losses}L
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
