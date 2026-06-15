export const MINIMUM_RISK_REWARD_RATIO = 3;

export function calculateRiskReward(
  entry: number,
  stopLoss: number,
  takeProfit: number
): number {
  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(stopLoss) ||
    !Number.isFinite(takeProfit) ||
    entry <= 0
  ) {
    return 0;
  }
  const risk = Math.abs(entry - stopLoss);
  if (risk === 0) return 0;
  const reward = Math.abs(takeProfit - entry);
  return reward / risk;
}

export function meetsMinimumRiskReward(
  entry: number,
  stopLoss: number,
  takeProfit: number
): boolean {
  return calculateRiskReward(entry, stopLoss, takeProfit) >= MINIMUM_RISK_REWARD_RATIO;
}

export function calculateTakeProfit(
  action: "BUY" | "SELL",
  entryPrice: number,
  stopLoss: number,
  ratio: number = MINIMUM_RISK_REWARD_RATIO
): number | null {
  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopLoss) ||
    !Number.isFinite(ratio) ||
    entryPrice <= 0 ||
    ratio <= 0
  ) {
    return null;
  }
  const risk = Math.abs(entryPrice - stopLoss);
  if (risk === 0) return null;
  return action === "BUY"
    ? entryPrice + risk * ratio
    : entryPrice - risk * ratio;
}

export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): number {
  if (
    !Number.isFinite(accountBalance) ||
    !Number.isFinite(riskPercent) ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopLoss) ||
    accountBalance <= 0 ||
    riskPercent <= 0 ||
    entryPrice <= 0
  ) {
    return 0;
  }
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerCoin = Math.abs(entryPrice - stopLoss);
  if (riskPerCoin === 0) return 0;
  return riskAmount / riskPerCoin;
}
