export type PositionSide = "long" | "short";

export interface PositionInput {
  entryPrice: number;
  leverage: number;
  positionSizeInCoin: number;
  walletBalance: number;
  isIsolated: boolean;
  side: PositionSide;
}

export interface ExchangeResult {
  name: string;
  liquidationPrice: number;
  distanceToLiquidation: number;
  maintenanceMarginRate: number;
  maintenanceMarginAmount: number;
  marginBalance: number;
  notional: number;
}

interface ExchangeDefinition {
  name: string;
  maintenanceTiers: readonly [threshold: number, rate: number][];
  strategy: "binance" | "bitget" | "mexc";
}

const EXCHANGES: ExchangeDefinition[] = [
  {
    name: "Binance",
    maintenanceTiers: [
      [50_000, 0.004],
      [250_000, 0.005],
      [1_000_000, 0.01],
      [5_000_000, 0.02],
      [Number.POSITIVE_INFINITY, 0.025],
    ],
    strategy: "binance",
  },
  {
    name: "Bitget",
    maintenanceTiers: [
      [50_000, 0.0045],
      [250_000, 0.006],
      [1_000_000, 0.01],
      [5_000_000, 0.02],
      [Number.POSITIVE_INFINITY, 0.025],
    ],
    strategy: "bitget",
  },
  {
    name: "MEXC",
    maintenanceTiers: [
      [50_000, 0.004],
      [250_000, 0.005],
      [1_000_000, 0.0075],
      [5_000_000, 0.01],
      [Number.POSITIVE_INFINITY, 0.0125],
    ],
    strategy: "mexc",
  },
];

export function validatePositionInput(position: PositionInput): string[] {
  const errors: string[] = [];

  if (!isPositive(position.entryPrice)) {
    errors.push("Entry price must be greater than zero.");
  }

  if (!isPositive(position.leverage)) {
    errors.push("Leverage must be greater than zero.");
  }

  if (!isPositive(position.positionSizeInCoin)) {
    errors.push("Position size must be greater than zero.");
  }

  if (!isNonNegative(position.walletBalance)) {
    errors.push("Wallet balance cannot be negative.");
  }

  if (position.side !== "long" && position.side !== "short") {
    errors.push("Side must be long or short.");
  }

  return errors;
}

export function calculateExchangeResults(position: PositionInput): ExchangeResult[] {
  return EXCHANGES.map((exchange) => calculateExchangeResult(exchange, position));
}

export function findSafestExchange(results: ExchangeResult[]): ExchangeResult | null {
  if (results.length === 0) {
    return null;
  }

  return results.reduce((best, current) =>
    current.distanceToLiquidation > best.distanceToLiquidation ? current : best
  );
}

function calculateExchangeResult(exchange: ExchangeDefinition, position: PositionInput): ExchangeResult {
  const notional = position.entryPrice * position.positionSizeInCoin;
  const maintenanceMarginRate = getMaintenanceMarginRate(exchange.maintenanceTiers, notional);
  const maintenanceMarginAmount = notional * maintenanceMarginRate;
  const marginBalance = position.isIsolated
    ? Math.max((position.entryPrice * position.positionSizeInCoin) / position.leverage, position.walletBalance)
    : position.walletBalance;
  const sideSign = position.side === "long" ? 1 : -1;

  let liquidationPrice: number;

  if (exchange.strategy === "mexc") {
    const effectiveMarginRate = marginBalance / notional;
    liquidationPrice =
      position.side === "long"
        ? position.entryPrice * (1 - effectiveMarginRate + maintenanceMarginRate)
        : position.entryPrice * (1 + effectiveMarginRate - maintenanceMarginRate);
  } else {
    liquidationPrice =
      position.entryPrice -
      sideSign * ((marginBalance - maintenanceMarginAmount) / position.positionSizeInCoin);
  }

  liquidationPrice = Math.max(liquidationPrice, 0);

  const distanceToLiquidation =
    position.side === "long"
      ? Math.max(((position.entryPrice - liquidationPrice) / position.entryPrice) * 100, 0)
      : Math.max(((liquidationPrice - position.entryPrice) / position.entryPrice) * 100, 0);

  return {
    name: exchange.name,
    liquidationPrice,
    distanceToLiquidation,
    maintenanceMarginRate,
    maintenanceMarginAmount,
    marginBalance,
    notional,
  };
}

function getMaintenanceMarginRate(
  tiers: readonly [threshold: number, rate: number][],
  notional: number
): number {
  for (const [threshold, rate] of tiers) {
    if (notional <= threshold) {
      return rate;
    }
  }

  return tiers[tiers.length - 1]?.[1] ?? 0;
}

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}