// src/components/AnalysisPanel.tsx
'use client';

import { FullSignal } from "@/features/market-structure-signals/MarketStructureSignalsClient";
import { AISignal } from "@/features/smart-trading-engine/aiScoring";
import { useState, useEffect } from 'react';

interface AnalysisPanelProps {
  signal: (FullSignal | AISignal | null);
  onClose: () => void;
}

// Mock data for demonstration
const fundamentalAnalysis = {
  summary: "The project has strong fundamentals, with a growing user base and a clear roadmap. Recent partnerships have been positive.",
  sentiment: "Bullish",
  news_highlights: [
    "Partnership with XYZ Corp announced.",
    "Mainnet v2.0 successfully launched.",
    "Community governance proposal passed.",
  ]
};

export default function AnalysisPanel({ signal, onClose }: AnalysisPanelProps) {
  if (!signal) return null;

  // Type guard to check if it's a FullSignal
  const isFullSignal = (sig: any): sig is FullSignal => {
    return sig && 'notes' in sig && 'levels' in sig && 'indicators' in sig;
  };

  const fullSignal = isFullSignal(signal) ? signal : null;
  const aiSignal = !isFullSignal(signal) ? (signal as AISignal) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4 font-sans">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg p-8 w-full max-w-4xl border border-gray-700">
        <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
          <h2 className="text-2xl font-bold">Analysis for {signal.symbol}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Technical Analysis Section */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="font-bold text-lg text-teal-300 mb-4">Technical Analysis</h3>
            {fullSignal ? (
              <>
                <p className="text-base text-gray-300 mb-4">{fullSignal.notes.join(" ")}</p>
                <div className="text-base space-y-2">
                  <p><strong>Key Support:</strong> <span className="font-mono text-cyan-400">{fullSignal.levels.nearestSupport}</span></p>
                  <p><strong>Key Resistance:</strong> <span className="font-mono text-red-400">{fullSignal.levels.nearestResistance}</span></p>
                </div>
                <div className="mt-5 text-base">
                  <h4 className="font-bold text-teal-300">Indicators:</h4>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-gray-300">
                    <li><strong>RSI:</strong> <span className="font-mono">{fullSignal.indicators.rsi}</span></li>
                    <li><strong>EMA20:</strong> <span className="font-mono">{fullSignal.indicators.ema20}</span></li>
                    <li><strong>EMA50:</strong> <span className="font-mono">{fullSignal.indicators.ema50}</span></li>
                  </ul>
                </div>
              </>
            ) : aiSignal ? (
              <>
                <p className="text-base text-gray-300 mb-4">AI Score: <strong>{aiSignal.aiScore}</strong></p>
                <div className="text-base space-y-2">
                  <p><strong>Entry Zone:</strong> <span className="font-mono text-cyan-400">${aiSignal.entryZone.min.toFixed(2)} - ${aiSignal.entryZone.max.toFixed(2)}</span></p>
                  <p><strong>Stop Loss:</strong> <span className="font-mono text-red-400">${aiSignal.stopLoss.toFixed(2)}</span></p>
                  <p><strong>Take Profit:</strong> <span className="font-mono text-green-400">${aiSignal.takeProfit.toFixed(2)}</span></p>
                </div>
              </>
            ) : null}
          </div>

          {/* Fundamental Analysis Section */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="font-bold text-lg text-teal-300 mb-4">Fundamental Analysis</h3>
             <p className="text-base text-gray-300 mb-4">{fundamentalAnalysis.summary}</p>
             <div className="text-base">
                <p><strong>Market Sentiment:</strong> <span className="font-semibold text-green-400">{fundamentalAnalysis.sentiment}</span></p>
             </div>
             <div className="mt-5 text-base">
                <h4 className="font-bold text-teal-300">Recent News:</h4>
                <ul className="list-disc list-inside space-y-2 mt-2 text-gray-300">
                    {fundamentalAnalysis.news_highlights.map(item => <li key={item}>{item}</li>)}
                </ul>
             </div>
          </div>
        </div>

        <div className="mt-8 text-right">
          <button onClick={onClose} className="px-5 py-2 bg-teal-500 text-white font-semibold rounded-md shadow-sm hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-50">Close</button>
        </div>
      </div>
    </div>
  );
}
