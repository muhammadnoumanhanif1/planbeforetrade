// src/app/market-opportunities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AISignal, SignalRank } from '@/features/smart-trading-engine/aiScoring';
import AnalysisPanel from '@/components/AnalysisPanel'; // Import the new component
import { getLivePrice } from '@/lib/livePrice';


export default function MarketOpportunitiesPage() {
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<AISignal | null>(null); // State for the analysis panel

  useEffect(() => {
    const fetchSignalsAndPrices = async () => {
      // Don't set loading to true on interval refreshes
      if (!signals.length) setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/scan');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to fetch signals');
        }
        const data: AISignal[] = await response.json();
        setSignals(data);

        // Fetch live prices for the new signals
        const pricePromises = data.map(signal => getLivePrice(signal.symbol));
        const prices = await Promise.all(pricePromises);
        const priceMap: Record<string, number> = {};
        data.forEach((signal, index) => {
          priceMap[signal.symbol] = prices[index];
        });
        setLivePrices(priceMap);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignalsAndPrices();
  }, [signals.length]);

  const handleRowClick = (signal: AISignal) => {
    setSelectedSignal(signal);
  };

  const handleClosePanel = () => {
    setSelectedSignal(null);
  };

  const getRankColor = (rank: SignalRank) => {
    switch (rank) {
      case SignalRank.HIGH: return 'bg-green-100 text-green-800';
      case SignalRank.MEDIUM: return 'bg-yellow-100 text-yellow-800';
      case SignalRank.LOW: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Market Opportunities</h1>

      {isLoading && <p>Loading signals...</p>}
      {error && <div className="my-4 p-4 text-red-700 bg-red-100 border border-red-400 rounded-lg">{error}</div>}

      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Zone</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {signals.map((signal) => (
                <tr key={signal.symbol} onClick={() => handleRowClick(signal)} className="cursor-pointer hover:bg-gray-50">
                  <td className="py-4 px-6 whitespace-nowrap font-medium text-gray-900">{signal.symbol}</td>
                  <td className="py-4 px-6 whitespace-nowrap font-mono">
                    ${livePrices[signal.symbol]?.toFixed(2) ?? '...'}
                  </td>
                  <td className={`py-4 px-6 whitespace-nowrap font-semibold ${signal.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{signal.type}</td>
                  <td className="py-4 px-6 whitespace-nowrap">{signal.entryZone.min.toFixed(2)} - {signal.entryZone.max.toFixed(2)}</td>
                  <td className="py-4 px-6 whitespace-nowrap font-bold">{signal.aiScore}</td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRankColor(signal.rank)}`}>
                      {signal.rank}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      WAITING
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnalysisPanel signal={selectedSignal} onClose={handleClosePanel} />
    </div>
  );
}
