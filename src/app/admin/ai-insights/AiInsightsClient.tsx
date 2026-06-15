"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Weight = {
  version: number;
  trend_weight: number;
  volume_weight: number;
  rsi_weight: number;
  entry_quality_weight: number;
  historical_performance_weight: number;
  created_at: string;
};

type Performance = {
  symbol: string;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_r: number;
};

export function AiInsightsClient() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/ai-insights");
        if (!res.ok) {
          throw new Error("Failed to fetch AI insights.");
        }
        const data = await res.json();
        setWeights(data.weights || []);
        setPerformance(data.performance || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-slate-400">Loading AI insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-900/30 border border-red-700 text-red-200 px-6 py-4 rounded-lg flex items-start gap-4">
          <div className="text-xl mt-0.5">⚠️</div>
          <div>
            <h3 className="font-semibold mb-1">Error Loading Data</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedPerformance = [...(performance || [])].sort((a, b) => b.total_trades - a.total_trades);
  const bestPerformers = sortedPerformance.filter(p => p.win_rate > 0.6 && p.total_trades > 10).slice(0, 5);
  const worstPerformers = sortedPerformance.filter(p => p.win_rate < 0.4 && p.total_trades > 10).slice(0, 5);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-4xl font-bold text-white">AI Insights Dashboard</h1>
          <span className="text-sm px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
            {weights.length > 0 ? `v${weights[weights.length - 1]?.version}` : 'No weights'}
          </span>
        </div>
        <p className="text-slate-400">Monitor AI model performance and weight evolution over time.</p>
      </div>

      {/* Weight Evolution Chart */}
      {weights.length > 0 && (
        <Card className="mb-6 bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Weight Evolution</CardTitle>
            <CardDescription className="text-slate-400">
              How the AI model's weights have adapted based on historical performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weights} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="version" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line type="monotone" dataKey="trend_weight" stroke="#3b82f6" name="Trend" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="volume_weight" stroke="#10b981" name="Volume" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="rsi_weight" stroke="#f59e0b" name="RSI" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="entry_quality_weight" stroke="#ef4444" name="Entry Quality" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="historical_performance_weight" stroke="#8b5cf6" name="Historical" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {bestPerformers.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span>✅</span> Best Performing Setups
              </CardTitle>
              <CardDescription className="text-slate-400">
                Top 5 setups with win rate &gt;60% and &gt;10 trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTable data={bestPerformers} />
            </CardContent>
          </Card>
        )}
        {worstPerformers.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <span>❌</span> Worst Performing Setups
              </CardTitle>
              <CardDescription className="text-slate-400">
                Bottom 5 setups with win rate &lt;40% and &gt;10 trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceTable data={worstPerformers} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full Performance Table */}
      {sortedPerformance.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">All Setup Performance</CardTitle>
            <CardDescription className="text-slate-400">
              Complete performance metrics for all recorded trading setups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceTable data={sortedPerformance} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {sortedPerformance.length === 0 && weights.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-slate-400 mb-2">No performance data available</p>
              <p className="text-sm text-slate-500">Recorded trades will appear here as they are logged to the system.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PerformanceTable({ data }: { data: Performance[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-300 font-semibold">Symbol</TableHead>
            <TableHead className="text-right text-slate-300 font-semibold">Trades</TableHead>
            <TableHead className="text-right text-slate-300 font-semibold">Wins</TableHead>
            <TableHead className="text-right text-slate-300 font-semibold">Losses</TableHead>
            <TableHead className="text-right text-slate-300 font-semibold">Win Rate</TableHead>
            <TableHead className="text-right text-slate-300 font-semibold">Avg. R</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow className="border-slate-700">
              <TableCell colSpan={6} className="text-center py-6 text-slate-400">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((p, idx) => (
              <TableRow key={idx} className="border-slate-700 hover:bg-slate-800/50">
                <TableCell className="font-medium text-white">{p.symbol}</TableCell>
                <TableCell className="text-right text-slate-300">{p.total_trades}</TableCell>
                <TableCell className="text-right">
                  <span className="text-green-400 font-semibold">{p.wins}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-red-400 font-semibold">{p.losses}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-semibold ${p.win_rate > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                    {(p.win_rate * 100).toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right text-slate-300 font-medium">{p.avg_r.toFixed(2)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
