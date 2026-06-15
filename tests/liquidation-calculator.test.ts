import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "./utils/render";
import {
  calculateExchangeResults,
  findSafestExchange,
  validatePositionInput,
  type PositionInput,
} from "@/lib/liquidation-calculator";
import { LiquidationCalculatorClient } from "../src/app/liquidation-calculator/liquidation-calculator-client";

vi.mock("@/components/Navigation", () => ({
  Navigation: () => null,
}));

const basePosition: PositionInput = {
  entryPrice: 50000,
  leverage: 10,
  positionSizeInCoin: 0.2,
  walletBalance: 1000,
  isIsolated: false,
  side: "long",
};

describe("liquidation calculator", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          coins: [
            {
              symbol: "BTCUSDT",
              displaySymbol: "BTC/USDT",
              lastPrice: 60000,
            },
          ],
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calculates exchange-specific liquidation prices", () => {
    const results = calculateExchangeResults(basePosition);

    expect(results).toHaveLength(3);
    expect(results[0]?.name).toBe("Binance");
    expect(results[1]?.name).toBe("Bitget");
    expect(results[2]?.name).toBe("MEXC");
    expect(results.every((result) => result.liquidationPrice > 0)).toBe(true);
  });

  it("identifies the safest exchange by distance to liquidation", () => {
    const results = calculateExchangeResults(basePosition);
    const safest = findSafestExchange(results);

    expect(safest).not.toBeNull();
    expect(safest?.distanceToLiquidation).toBe(
      Math.max(...results.map((result) => result.distanceToLiquidation))
    );
  });

  it("supports short positions with valid input", () => {
    const results = calculateExchangeResults({
      ...basePosition,
      side: "short",
    });

    expect(results.every((result) => result.liquidationPrice > basePosition.entryPrice)).toBe(true);
  });

  it("uses the entered entry price when calculating liquidation levels", () => {
    const baseResults = calculateExchangeResults(basePosition);
    const higherEntryPriceResults = calculateExchangeResults({
      ...basePosition,
      entryPrice: 60000,
    });

    expect(higherEntryPriceResults[0]?.notional).toBe(12000);
    expect(higherEntryPriceResults[0]?.liquidationPrice).not.toBe(baseResults[0]?.liquidationPrice);
  });

  it("returns validation errors for invalid inputs", () => {
    const errors = validatePositionInput({
      ...basePosition,
      entryPrice: 0,
      walletBalance: -1,
    });

    expect(errors).toContain("Entry price must be greater than zero.");
    expect(errors).toContain("Wallet balance cannot be negative.");
  });

  it("uses a manual entry price instead of the live coin price", async () => {
    const user = userEvent.setup();

    render(React.createElement(LiquidationCalculatorClient));

    const entryPriceInput = await screen.findByLabelText(/entry price/i);
    await waitFor(() => expect(entryPriceInput).toHaveValue(60000));
    await waitFor(() => expect(screen.getAllByRole("cell")).toHaveLength(12));

    const currentPriceCard = screen.getByText(/60,000\.00 USDT/);
    const initialLiquidationPrice = screen.getAllByRole("cell")[1]?.textContent;

    await user.clear(entryPriceInput);
    await user.type(entryPriceInput, "50000");

    await waitFor(() => expect(entryPriceInput).toHaveValue(50000));

    expect(currentPriceCard).toHaveTextContent("60,000.00 USDT");
    expect(screen.queryByText(/Fix the inputs below/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("cell")[1]?.textContent).not.toBe(initialLiquidationPrice);
  });
});