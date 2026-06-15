import { getUSDTBalance, getSymbolPrice, getExchangeInfo, type PlacedOrder } from "./binanceClient";

export const RISK_PER_TRADE_PERCENT = 0.01; // 1% risk per trade
export const MAX_ACTIVE_TRADES = 2;
export const DAILY_LOSS_LIMIT_R = 3;

export interface RiskParams {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
}

export interface PositionSizeResult {
  quantity: number;
  riskAmount: number;
  positionValue: number;
  riskPercent: number;
}

export async function calculatePositionSize(params: RiskParams): Promise<PositionSizeResult> {
  const { symbol, entryPrice, stopLoss } = params;

  const balance = await getUSDTBalance();
  const riskAmount = balance * RISK_PER_TRADE_PERCENT;

  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  if (riskPerUnit <= 0) {
    throw new Error(`Invalid risk per unit: ${riskPerUnit} (entry ${entryPrice}, SL ${stopLoss})`);
  }

  let quantity = riskAmount / riskPerUnit;

  const exchange = await getExchangeInfo(symbol);
  quantity = Math.floor(quantity / exchange.stepSize) * exchange.stepSize;

  if (quantity < exchange.minQty) {
    throw new Error(
      `Quantity ${quantity} below min ${exchange.minQty} for ${symbol}`
    );
  }

  const positionValue = quantity * entryPrice;
  const riskPercent = (riskAmount / balance) * 100;

  return {
    quantity,
    riskAmount,
    positionValue,
    riskPercent,
  };
}

export interface ActiveTrade {
  symbol: string;
  side: string;
  entryPrice: number;
  quantity: number;
  openTime: number;
  unrealizedPnl?: number;
}

const activeTrades: Map<string, ActiveTrade> = new Map();

export function addActiveTrade(trade: ActiveTrade): void {
  if (activeTrades.size >= MAX_ACTIVE_TRADES) {
    throw new Error(`Max active trades (${MAX_ACTIVE_TRADES}) reached`);
  }
  activeTrades.set(trade.symbol, trade);
}

export function removeActiveTrade(symbol: string): void {
  activeTrades.delete(symbol);
}

export function getActiveTrade(symbol: string): ActiveTrade | undefined {
  return activeTrades.get(symbol);
}

export function getActiveTrades(): ActiveTrade[] {
  return Array.from(activeTrades.values());
}

export function getActiveCount(): number {
  return activeTrades.size;
}

const dailyLosses: number[] = [];
const DAY_MS = 24 * 60 * 60 * 1000;

export function recordTradeResult(pnlR: number): void {
  if (pnlR < 0) {
    dailyLosses.push(Date.now());
  }
}

export function getDailyLossCount(): number {
  const cutoff = Date.now() - DAY_MS;
  while (dailyLosses.length > 0 && dailyLosses[0] < cutoff) {
    dailyLosses.shift();
  }
  return dailyLosses.length;
}

export function isRiskLimitReached(): boolean {
  return getDailyLossCount() >= DAILY_LOSS_LIMIT_R;
}

export function canOpenNewTrade(): boolean {
  return getActiveCount() < MAX_ACTIVE_TRADES && !isRiskLimitReached();
}

export function formatRiskReport(): string {
  const active = getActiveCount();
  const dailyLosses = getDailyLossCount();
  return `Active: ${active}/${MAX_ACTIVE_TRADES} | Daily losses: ${dailyLosses}/${DAILY_LOSS_LIMIT_R}`;
}