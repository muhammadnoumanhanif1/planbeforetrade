// src/components/EntryDistanceIndicator.tsx
'use client';

import { useEffect, useState } from 'react';

interface Props {
  entryPrice: number;
  symbol: string;
}

export function EntryDistanceIndicator({ entryPrice, symbol }: Props) {
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    // In a real app, you would use a WebSocket to get live price updates.
    // For this example, we'll simulate price updates every 2 seconds.
    const interval = setInterval(() => {
      // Simulate a small price fluctuation
      setCurrentPrice(prev => entryPrice + (Math.random() - 0.5) * (entryPrice * 0.01));
    }, 2000);

    return () => clearInterval(interval);
  }, [entryPrice, symbol]);

  if (!currentPrice) return null;

  const distance = ((currentPrice - entryPrice) / entryPrice) * 100;
  const color = distance > 0 ? 'text-red-500' : 'text-green-500';

  return (
    <div className="p-2 bg-gray-800 text-white rounded-lg mt-4">
      <h3 className="font-semibold">Entry Distance</h3>
      <div className="mt-1">
        <p>Current Price: ${currentPrice.toFixed(2)}</p>
        <p>Distance to Entry: <span className={`font-bold ${color}`}>{distance.toFixed(2)}%</span></p>
      </div>
    </div>
  );
}
