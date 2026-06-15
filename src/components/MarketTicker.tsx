"use client";

interface Coin {
  symbol: string;
  trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  aiScore: number;
  priceChange?: number;
}

interface MarketTickerProps {
  coins: Coin[];
  loading?: boolean;
}

export function MarketTicker({ coins, loading }: MarketTickerProps) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-28 h-24 bg-slate-700/50 rounded-lg animate-pulse border border-slate-600/50"
          />
        ))}
      </div>
    );
  }

  if (coins.length === 0) {
    return <div className="text-xs text-slate-500 py-4">No coins available</div>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
      {coins.map((coin) => {
        const trendColor =
          coin.trend === "UPTREND"
            ? "from-emerald-600/30 to-emerald-700/20"
            : coin.trend === "DOWNTREND"
            ? "from-red-600/30 to-red-700/20"
            : "from-slate-600/30 to-slate-700/20";

        const trendTextColor =
          coin.trend === "UPTREND" ? "text-emerald-300" : coin.trend === "DOWNTREND" ? "text-red-300" : "text-slate-300";

        return (
          <div
            key={coin.symbol}
            className={`flex-shrink-0 bg-gradient-to-br ${trendColor} border border-slate-500/30 hover:border-slate-400/50 rounded-lg p-3 w-28 text-center transition-all duration-300 backdrop-blur-sm hover:shadow-lg`}
          >
            <h4 className="text-sm font-bold text-white truncate mb-1">{coin.symbol}</h4>
            <p className={`text-lg font-black mb-1 ${trendTextColor}`}>
              {coin.trend === "UPTREND" ? "📈" : coin.trend === "DOWNTREND" ? "📉" : "↔️"}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              <span className="text-emerald-400 font-bold">{coin.aiScore}%</span>
            </p>
            {coin.priceChange !== undefined && (
              <p className={`text-xs font-bold mt-1 ${coin.priceChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {coin.priceChange > 0 ? "↑" : "↓"} {Math.abs(coin.priceChange).toFixed(1)}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
