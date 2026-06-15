import { useState } from 'react';

export interface TradeData {
  symbol: string;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  strategy_type: string;
  result: 'WIN' | 'LOSS';
  result_r: number;
  ai_score?: number;
  entry_zone?: Record<string, any>;
  stop_loss?: number;
  take_profit?: number;
  indicators?: {
    rsi?: number;
    ema_alignment?: boolean;
    volume?: number;
  };
}

export function useAiLearning() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordTrade = async (trade: TradeData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-learning/record-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trade),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record trade');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const recalculateWeights = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-learning/recalculate-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recalculate weights');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    recordTrade,
    recalculateWeights,
    loading,
    error,
  };
}
