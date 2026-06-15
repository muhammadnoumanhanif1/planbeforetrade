// src/components/MarketOpportunitiesTable.tsx

'use client';

import { MarketOpportunity } from '@/features/smart-trading-engine/marketScanner';

interface Props {
  opportunities: MarketOpportunity[];
}

export function MarketOpportunitiesTable({ opportunities }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Symbol</th>
            <th className="py-2 px-4 border-b">Exchange</th>
            <th className="py-2 px-4 border-b">Trend</th>
            <th className="py-2 px-4 border-b">Entry Zone</th>
            <th className="py-2 px-4 border-b">AI Score</th>
            <th className="py-2 px-4 border-b">Status</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((op) => (
            <tr key={op.symbol}>
              <td className="py-2 px-4 border-b">{op.symbol}</td>
              <td className="py-2 px-4 border-b">{op.exchange}</td>
              <td className="py-2 px-4 border-b">{op.trend}</td>
              <td className="py-2 px-4 border-b">{`${op.entryZone.min.toFixed(2)} - ${op.entryZone.max.toFixed(2)}`}</td>
              <td className="py-2 px-4 border-b">{op.aiScore}</td>
              <td className="py-2 px-4 border-b">{op.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
