"use client";

import Link from "next/link";
import { useState } from "react";

interface SignalCardProps {
  id: string;
  symbol: string;
  action: "BUY" | "SELL" | "WAIT";
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  aiScore: number;
  confidence: string;
  entryZone: [number, number] | null;
  stopLoss: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  status: "WAITING" | "READY" | "TRIGGERED" | "INVALID" | "CLOSED";
  currentPrice: number | null;
}

export function SignalCard({
  id,
  symbol,
  action,
  trend,
  aiScore,
  confidence,
  entryZone,
  stopLoss,
  tp1,
  tp2,
  tp3,
  status,
  currentPrice,
}: SignalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLong = action === "BUY";
  const bgGradient = isLong
    ? "from-emerald-600/20 to-emerald-700/10"
    : action === "SELL"
    ? "from-red-600/20 to-red-700/10"
    : "from-slate-600/20 to-slate-700/10";
  
  const borderColor = isLong
    ? "border-emerald-500/50 hover:border-emerald-400/80"
    : action === "SELL"
    ? "border-red-500/50 hover:border-red-400/80"
    : "border-slate-500/50 hover:border-slate-400/80";
  
  const actionColor = isLong ? "text-emerald-300" : action === "SELL" ? "text-red-300" : "text-slate-300";
  const trendColor = trend === "UPTREND" ? "text-emerald-400" : trend === "DOWNTREND" ? "text-red-400" : "text-slate-400";
  const accentBg = isLong
    ? "bg-emerald-500/20"
    : action === "SELL"
    ? "bg-red-500/20"
    : "bg-slate-500/20";

  const formatPrice = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return "-";
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  };

  const getConfidenceBadgeColor = () => {
    if (confidence === "HIGH") return "bg-emerald-600 text-white";
    if (confidence === "MEDIUM") return "bg-amber-600 text-white";
    return "bg-slate-600 text-white";
  };

  const getStatusBadge = () => {
    switch (status) {
      case "READY":
        return { icon: "🟢", text: "Ready", color: "text-emerald-400" };
      case "TRIGGERED":
        return { icon: "🔵", text: "Triggered", color: "text-blue-400" };
      case "WAITING":
        return { icon: "⚪", text: "Waiting", color: "text-slate-400" };
      case "INVALID":
        return { icon: "❌", text: "Invalid", color: "text-red-400" };
      case "CLOSED":
        return { icon: "🔒", text: "Closed", color: "text-slate-500" };
      default:
        return { icon: "❓", text: "Unknown", color: "text-slate-400" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <Link href={`/signals/${id}`}>
      <div
        className={`bg-gradient-to-br ${bgGradient} ${borderColor} border-2 rounded-xl p-4 sm:p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-${isLong ? "emerald" : action === "SELL" ? "red" : "slate"}-500/20 active:scale-98 backdrop-blur-sm`}
      >
        {/* Header Row: Symbol + Action Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{symbol}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Crypto Trading Signal</p>
          </div>
          <div className={`text-3xl sm:text-4xl font-black ${actionColor} bg-white/10 rounded-lg p-2`}>
            {action === "BUY" ? "↑" : action === "SELL" ? "↓" : "⏸"}
          </div>
        </div>

        {/* Trend + Score Row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${trendColor} border-current bg-white/10`}>
            {trend === "UPTREND" ? "📈" : trend === "DOWNTREND" ? "📉" : "↔️"} {trend}
          </span>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${getConfidenceBadgeColor()}`}>
            ⚡ {aiScore}% - {confidence}
          </span>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusBadge.color} bg-white/10`}>
            {statusBadge.icon} {statusBadge.text}
          </span>
        </div>

        {/* Price Details */}
        <div className="bg-black/30 rounded-lg p-3 mb-4 space-y-2">
          {currentPrice && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Current Price</span>
              <span className="text-lg font-bold text-white">${formatPrice(currentPrice)}</span>
            </div>
          )}
          {entryZone && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Entry Zone</span>
              <span className="text-sm font-bold text-blue-300">${formatPrice(entryZone[0])} - ${formatPrice(entryZone[1])}</span>
            </div>
          )}
          {stopLoss && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Stop Loss</span>
              <span className="text-sm font-bold text-red-300">${formatPrice(stopLoss)}</span>
            </div>
          )}
        </div>

        {/* TP Levels (Expandable) */}
        {(tp1 || tp2 || tp3) && (
          <>
            <button
              className="w-full text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg py-2 transition-all duration-200 mb-2"
              onClick={(e) => {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? "Hide" : "Show"} Take Profit Levels ↓
            </button>

            {isExpanded && (
              <div className="bg-black/40 rounded-lg p-3 mb-3 grid grid-cols-3 gap-2 animate-in fade-in-50 duration-200">
                {tp1 && (
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium mb-1">TP 1</p>
                    <p className="text-sm font-bold text-emerald-400">${formatPrice(tp1)}</p>
                  </div>
                )}
                {tp2 && (
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium mb-1">TP 2</p>
                    <p className="text-sm font-bold text-emerald-400">${formatPrice(tp2)}</p>
                  </div>
                )}
                {tp3 && (
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium mb-1">TP 3</p>
                    <p className="text-sm font-bold text-emerald-400">${formatPrice(tp3)}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-xs text-slate-500 font-medium">Tap to view full analysis</span>
          <span className="text-lg">→</span>
        </div>
      </div>
    </Link>
  );
}
