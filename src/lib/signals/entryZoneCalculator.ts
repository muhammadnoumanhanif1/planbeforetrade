import type { EntryZone, TradeAction } from "./types";

const round = (value: number, decimals = 6) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const calculateEntryZone = (params: {
  action: TradeAction;
  support: number | null;
  resistance: number | null;
  thresholdPercent: number;
}): EntryZone => {
  const { action, support, resistance, thresholdPercent } = params;

  if (action === "BUY" && support && support > 0) {
    const threshold = support * thresholdPercent;
    return [round(support), round(support + threshold)];
  }

  if (action === "SELL" && resistance && resistance > 0) {
    const threshold = resistance * thresholdPercent;
    return [round(resistance - threshold), round(resistance)];
  }

  return null;
};

export const getDistanceToEntryZone = (price: number, entryZone: EntryZone): number | null => {
  if (!entryZone || !Number.isFinite(price) || price <= 0) return null;
  const [low, high] = entryZone;
  if (price >= low && price <= high) return 0;
  if (price < low) return Math.abs((low - price) / price);
  return Math.abs((price - high) / price);
};
