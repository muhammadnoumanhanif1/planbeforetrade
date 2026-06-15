export type Exchange = "bitget" | "binance" | "mexc";

export type CoinOption = {
  symbol: string;
  displaySymbol: string;
  baseCoin: string;
  quoteCoin: string;
  lastPrice: number;
};

export type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SmaData = {
  time: number;
  value: number;
};

export type OrderBlockData = {
  time: number;
  top: number;
  bottom: number;
};

export type AnalysisData = {
  exchange: Exchange;
  symbol: string;
  timeframe: string;
  lastPrice: number;
  predictedPrice: number;
  recommendation: "LONG" | "SHORT";
  takeProfits: number[];
  stopLosses: number[];
  support: number;
  resistance: number;
  confidence: number;
  indicators: {
    smaShort: number;
    smaLong: number;
    rsi: number;
    momentum: number;
    volatility: number;
  };
  candles: CandleData[];
  smaLine: SmaData[];
  orderBlocks: OrderBlockData[];
  signalGeneratedAt?: string;
  updatedAt: string;
  notes: string[];
  cached?: boolean;
};
