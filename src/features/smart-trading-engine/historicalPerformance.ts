// src/features/smart-trading-engine/historicalPerformance.ts

import { createBrowserClient } from '@/lib/supabase-client';
import { Trend } from './signalGenerator';

/**
 * Creates a unique signature for a trade setup.
 * @param trend - The market trend.
 * @param signalType - The type of signal (BUY/SELL).
 * @returns A unique string signature.
 */
export function createSetupSignature(trend: Trend, signalType: string): string {
  return `${trend}:${signalType}`;
}

/**
 * Retrieves the historical win rate for a given setup signature.
 * @param signature - The setup signature.
 * @returns The historical win rate (0-1) or null if not found.
 */
export async function getHistoricalWinRate(signature: string): Promise<number | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from('historical_performance')
    .select('win_rate')
    .eq('setup_signature', signature)
    .single();

  if (error || !data) {
    return null;
  }

  return data.win_rate;
}

/**
 * Updates the historical performance data for a setup.
 * @param signature - The setup signature.
 * @param isWin - Whether the trade was a win.
 */
export async function updateHistoricalPerformance(signature: string, isWin: boolean) {
    const supabase = createBrowserClient();
    const { data: existing } = await supabase
        .from('historical_performance')
        .select('*')
        .eq('setup_signature', signature)
        .single();

    if (existing) {
        const newTotalTrades = existing.total_trades + 1;
        const currentWins = existing.total_trades * existing.win_rate;
        const newWins = isWin ? currentWins + 1 : currentWins;
        const newWinRate = newWins / newTotalTrades;
        
        await supabase.from('historical_performance').update({
            total_trades: newTotalTrades,
            win_rate: newWinRate,
        }).eq('id', existing.id);
    } else {
        await supabase.from('historical_performance').insert({
            setup_signature: signature,
            total_trades: 1,
            win_rate: isWin ? 1 : 0,
            average_R: isWin ? 3 : -1,
        });
    }
}
