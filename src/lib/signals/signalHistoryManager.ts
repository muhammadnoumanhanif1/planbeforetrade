import type { EntryZone, MarketTrend, TradeStatus } from "./types";

export type SignalNumber = "S1" | "S2" | "S3";
export const MAX_SIGNALS_PER_COIN = 3;

export type SignalRecord = {
  id: string;
  symbol: string;
  exchange: string;
  signal_number: SignalNumber;
  trend: MarketTrend;
  entry_zone: EntryZone;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward_ratio: number;
  status: TradeStatus | "CLOSED";
  result: "WIN" | "LOSS" | null;
  result_R: number | null;
  created_at: string;
  entry_hit_at: string | null;
  closed_at: string | null;
  current_price?: number | null;
};

export type SignalHistory = Record<string, SignalRecord[]>;

const SIGNAL_NUMBERS: SignalNumber[] = ["S1", "S2", "S3"];

export function getNextSignalNumber(records: SignalRecord[]): SignalNumber | null {
  if (records.length >= MAX_SIGNALS_PER_COIN) return null;
  return SIGNAL_NUMBERS[records.length] ?? null;
}

let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `sig_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createSignalRecord(params: {
  symbol: string;
  exchange: string;
  signal_number: SignalNumber;
  trend: MarketTrend;
  entry_zone: EntryZone;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward_ratio: number;
  current_price?: number | null;
}): SignalRecord {
  return {
    id: generateId(),
    symbol: params.symbol,
    exchange: params.exchange,
    signal_number: params.signal_number,
    trend: params.trend,
    entry_zone: params.entry_zone,
    entry_price: params.entry_price,
    stop_loss: params.stop_loss,
    take_profit: params.take_profit,
    risk_reward_ratio: params.risk_reward_ratio,
    status: "WAITING",
    result: null,
    result_R: null,
    created_at: new Date().toISOString(),
    entry_hit_at: null,
    closed_at: null,
    current_price: params.current_price ?? null,
  };
}

export function checkSignalOutcome(
  record: SignalRecord,
  currentPrice: number
): "WIN" | "LOSS" | null {
  if (record.status === "CLOSED" || record.result !== null) return record.result;
  if (!Number.isFinite(currentPrice)) return null;

  if (record.take_profit !== null && record.entry_price !== null) {
    // BUY: TP is above entry, SL is below; SELL: TP is below entry, SL is above
    const isBuy =
      record.take_profit > (record.entry_price ?? 0);

    if (isBuy) {
      if (currentPrice >= record.take_profit) return "WIN";
      if (record.stop_loss !== null && currentPrice <= record.stop_loss) return "LOSS";
    } else {
      if (currentPrice <= record.take_profit) return "WIN";
      if (record.stop_loss !== null && currentPrice >= record.stop_loss) return "LOSS";
    }
  }

  return null;
}

export function closeSignalRecord(
  record: SignalRecord,
  result: "WIN" | "LOSS"
): SignalRecord {
  return {
    ...record,
    status: "CLOSED",
    result,
    result_R: result === "WIN" ? 3 : -1,
    closed_at: new Date().toISOString(),
  };
}

export function getNextSignalLabel(records: SignalRecord[]): string {
  const open = records.filter((r) => r.status !== "CLOSED");
  if (open.length >= MAX_SIGNALS_PER_COIN) {
    return "All 3 signals tracked. Awaiting closure.";
  }
  const nextNum = getNextSignalNumber(records);
  if (nextNum === null) return "Max signals reached.";
  return `Next Signal: ${nextNum} pending...`;
}
