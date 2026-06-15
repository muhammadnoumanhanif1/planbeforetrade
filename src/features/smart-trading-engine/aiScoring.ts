// src/features/smart-trading-engine/aiScoring.ts
import { Signal, Trend } from './signalGenerator';

/**
 * AI Signal Ranking
 */

export enum SignalRank {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
}

export interface AISignal extends Signal {
    aiScore: number;
    rank: SignalRank;
    confidence_label: string;
}

export function rankSignal(signal: Signal): AISignal {
    const baseScore = Math.random() * 50 + 50;
    const aiScore = Math.round(baseScore);
    const rank = aiScore >= 80 ? SignalRank.HIGH : aiScore >= 60 ? SignalRank.MEDIUM : SignalRank.LOW;
    const confidence_label = rank === SignalRank.HIGH ? "HIGH" : rank === SignalRank.MEDIUM ? "MEDIUM" : "LOW";
    return {
        ...signal,
        aiScore,
        rank,
        confidence_label,
    };
}
