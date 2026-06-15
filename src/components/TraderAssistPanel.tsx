// src/components/TraderAssistPanel.tsx
'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const EntryDistanceIndicator = dynamic(
  () => import('./EntryDistanceIndicator').then(mod => mod.EntryDistanceIndicator),
  { ssr: false }
);

export function TraderAssistPanel() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercentage, setRiskPercentage] = useState(1);
  const [entryPrice, setEntryPrice] = useState(65000); // State for entry price
  const [stopLossPrice, setStopLossPrice] = useState(64000);
  const [takeProfitPrice, setTakeProfitPrice] = useState(68000);

  const { positionSize, riskAmount, rewardAmount, riskRewardRatio } = useMemo(() => {
    const riskAmount = accountSize * (riskPercentage / 100);
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    const positionSize = riskPerShare > 0 ? riskAmount / riskPerShare : 0;
    const rewardPerShare = Math.abs(takeProfitPrice - entryPrice);
    const rewardAmount = positionSize * rewardPerShare;
    const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;

    return {
      positionSize,
      riskAmount,
      rewardAmount,
      riskRewardRatio,
    };
  }, [accountSize, riskPercentage, entryPrice, stopLossPrice, takeProfitPrice]);

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Trader Assist</h2>
      
      {/* Risk Calculator */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Risk Calculator</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label htmlFor="accountSize" className="block mb-1">Account Size ($)</label>
            <input
              type="number"
              id="accountSize"
              value={accountSize}
              onChange={(e) => setAccountSize(parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-gray-700"
            />
          </div>
          <div>
            <label htmlFor="riskPercentage" className="block mb-1">Risk (%)</label>
            <input
              type="number"
              id="riskPercentage"
              value={riskPercentage}
              onChange={(e) => setRiskPercentage(parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-gray-700"
            />
          </div>
          <div>
            <label htmlFor="entryPrice" className="block mb-1">Entry Price</label>
            <input
              type="number"
              id="entryPrice"
              value={entryPrice}
              onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-gray-700"
            />
          </div>
          <div>
            <label htmlFor="stopLossPrice" className="block mb-1">Stop Loss</label>
            <input
              type="number"
              id="stopLossPrice"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(parseFloat(e.target.value))}
              className="w-full p-2 rounded bg-gray-700"
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-900 rounded">
          <p><strong>Position Size:</strong> {positionSize.toFixed(4)} BTC</p>
          <p><strong>Risk Amount:</strong> ${riskAmount.toFixed(2)}</p>
          <p><strong>Risk/Reward Ratio:</strong> {riskRewardRatio.toFixed(2)}R</p>
        </div>
      </div>

      {/* Entry Distance Indicator */}
      <EntryDistanceIndicator entryPrice={entryPrice} symbol="BTCUSDT" />
    </div>
  );
}
