import type { EntryZone, MarketTrend, TradeAction, TradeStatus } from "./types";

// 20% of zone width confirms momentum continuation inside the entry zone.
const TRIGGER_OFFSET_PERCENT = 0.2;

export const resolveTradeStatus = (params: {
  action: TradeAction;
  trend: MarketTrend;
  currentPrice: number;
  entryZone: EntryZone;
  support: number | null;
  resistance: number | null;
}): TradeStatus => {
  const { action, trend, currentPrice, entryZone, support, resistance } = params;

  if (action === "WAIT" || !entryZone) return "WAITING";

  if (
    (action === "BUY" && (trend !== "UPTREND" || (support !== null && currentPrice < support * 0.9975))) ||
    (action === "SELL" && (trend !== "DOWNTREND" || (resistance !== null && currentPrice > resistance * 1.0025)))
  ) {
    return "INVALID";
  }

  const [zoneLow, zoneHigh] = entryZone;
  if (currentPrice >= zoneLow && currentPrice <= zoneHigh) {
    const triggerOffset = (zoneHigh - zoneLow) * TRIGGER_OFFSET_PERCENT;
    if (action === "BUY" && currentPrice >= zoneLow + triggerOffset) return "TRIGGERED";
    if (action === "SELL" && currentPrice <= zoneHigh - triggerOffset) return "TRIGGERED";
    return "READY";
  }

  return "WAITING";
};

export const getDeduplicatedSignal = <T extends { setupKey: string | null; status: TradeStatus; notes: string[] }>(
  signal: T,
  previousSetupKey: string | null
): { signal: T; isDuplicate: boolean } => {
  if (!signal.setupKey || !previousSetupKey) {
    return { signal, isDuplicate: false };
  }

  const isDuplicate = signal.setupKey === previousSetupKey;
  if (!isDuplicate) {
    return { signal, isDuplicate: false };
  }

  return {
    signal: {
      ...signal,
      notes: [...signal.notes, "Duplicate setup detected. Keeping setup and only refreshing status."],
    },
    isDuplicate: true,
  };
};
