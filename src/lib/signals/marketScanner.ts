import { generateMarketStructureSignal, type GenerateSignalOptions } from "./signalGenerator";
import type { GeneratedSignal, MarketCandle, ScannedSignal } from "./types";

export const DEFAULT_SCANNER_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

export const parseScannerSymbols = (configuredSymbols: string | null | undefined): string[] => {
  const fromConfig =
    configuredSymbols
      ?.split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean) ?? [];

  const unique = Array.from(new Set(fromConfig.length ? fromConfig : DEFAULT_SCANNER_SYMBOLS));
  return unique;
};

export const toScannedSignal = (signal: GeneratedSignal): ScannedSignal => ({
  symbol: signal.symbol,
  trend: signal.trend,
  setup: signal.setup,
  entry_zone: signal.entry_zone,
  confidence: signal.confidence,
  distanceToEntryZone: signal.distanceToEntryZone,
  current_price: signal.current_price,
  signal,
});

export const sortSignalPriority = (signals: ScannedSignal[]) => {
  return [...signals].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;

    const aDistance = a.distanceToEntryZone ?? Number.POSITIVE_INFINITY;
    const bDistance = b.distanceToEntryZone ?? Number.POSITIVE_INFINITY;
    return aDistance - bDistance;
  });
};

export const scanMarketSignals = async (params: {
  symbols: string[];
  loadCandles: (symbol: string) => Promise<MarketCandle[]>;
  previousSetupKeys: Record<string, string | null>;
  options?: GenerateSignalOptions;
}) => {
  const { symbols, loadCandles, previousSetupKeys, options } = params;

  const scanned = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const candles = await loadCandles(symbol);
        if (candles.length < 60) return null;
        const signal = generateMarketStructureSignal(symbol, candles.slice(-100), previousSetupKeys[symbol] ?? null, options);
        return toScannedSignal(signal);
      } catch {
        return null;
      }
    })
  );

  const signals = scanned.filter((item): item is ScannedSignal => item !== null);
  const prioritizedSignals = sortSignalPriority(signals);

  return {
    signals: prioritizedSignals,
    topOpportunities: prioritizedSignals.slice(0, 5),
  };
};
