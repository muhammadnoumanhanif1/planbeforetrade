"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import {
  calculateExchangeResults,
  findSafestExchange,
  type ExchangeResult,
  validatePositionInput,
  type PositionInput,
  type PositionSide,
} from "@/lib/liquidation-calculator";
import styles from "./page.module.css";

type Exchange = "binance" | "bitget" | "mexc";
type MarginMode = "isolated" | "cross" | "hedge";

type CoinOption = {
  symbol: string;
  displaySymbol: string;
  lastPrice: number;
};

type HoldingState = {
  exchange: Exchange;
  coins: CoinOption[];
  selectedSymbol: string;
  quantity: string;
  entryPrice: string;
  loadingCoins: boolean;
  coinError: string | null;
};

type SlotSummary = {
  position: PositionInput | null;
  validationErrors: string[];
  results: ExchangeResult[];
  safestExchange: ExchangeResult | null;
  selectedCoin: CoinOption | null;
  holdingQuantity: number;
  entryPrice: number;
  walletShare: number;
  currentPrice: number | null;
  totalNotional: number;
  effectiveMargin: number;
};

function resolveTypedSymbol(coins: CoinOption[], value: string): CoinOption | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;

  return coins.find((coin) => coin.symbol === normalized || coin.displaySymbol.toUpperCase() === normalized) ?? null;
}

const EXCHANGE_OPTIONS: Array<{ value: Exchange; label: string }> = [
  { value: "bitget", label: "Bitget" },
  { value: "binance", label: "Binance" },
  { value: "mexc", label: "MEXC" },
];

const INITIAL_POSITION: PositionInput = {
  entryPrice: 62000,
  leverage: 10,
  positionSizeInCoin: 0.25,
  walletBalance: 1200,
  isIsolated: false,
  side: "long",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function parseInput(value: string): number {
  if (value.trim() === "") {
    return Number.NaN;
  }

  return Number(value);
}

function formatCoinPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value);
}

function parseHoldingSymbols(value: string): string[] {
  return value
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildSlotSummary(
  holding: HoldingState,
  leverageValue: number,
  walletShare: number,
  marginMode: MarginMode,
  side: PositionSide
): SlotSummary {
  const selectedCoin = holding.coins.find((coin) => coin.symbol === holding.selectedSymbol) ?? null;
  const holdingQuantity = parseInput(holding.quantity);
  const entryPrice = parseInput(holding.entryPrice);

  if (!selectedCoin || !Number.isFinite(selectedCoin.lastPrice)) {
    return {
      position: null,
      validationErrors: ["Select a coin for this symbol slot."],
      results: [],
      safestExchange: null,
      selectedCoin,
      holdingQuantity,
      entryPrice,
      walletShare,
      currentPrice: selectedCoin?.lastPrice ?? null,
      totalNotional: 0,
      effectiveMargin: walletShare,
    };
  }

  const position: PositionInput = {
    entryPrice,
    leverage: leverageValue,
    positionSizeInCoin: holdingQuantity,
    walletBalance: walletShare,
    isIsolated: marginMode === "isolated",
    side,
  };

  const validationErrors = validatePositionInput(position);
  const results = validationErrors.length === 0 ? calculateExchangeResults(position) : [];
  const safestExchange = findSafestExchange(results);
  const totalNotional = position.entryPrice * position.positionSizeInCoin;
  const effectiveMargin = position.isIsolated
    ? Math.max(totalNotional / position.leverage, position.walletBalance)
    : position.walletBalance;

  return {
    position,
    validationErrors,
    results,
    safestExchange,
    selectedCoin,
    holdingQuantity,
    entryPrice,
    walletShare,
    currentPrice: selectedCoin.lastPrice,
    totalNotional,
    effectiveMargin,
  };
}

export function LiquidationCalculatorClient() {
  const [tradeCount, setTradeCount] = useState<1 | 2>(1);
  const [holdings, setHoldings] = useState<HoldingState[]>([
    {
      exchange: "bitget",
      coins: [],
      selectedSymbol: "",
      quantity: "1",
      entryPrice: "",
      loadingCoins: false,
      coinError: null,
    },
    {
      exchange: "binance",
      coins: [],
      selectedSymbol: "",
      quantity: "1",
      entryPrice: "",
      loadingCoins: false,
      coinError: null,
    },
    {
      exchange: "mexc",
      coins: [],
      selectedSymbol: "",
      quantity: "1",
      entryPrice: "",
      loadingCoins: false,
      coinError: null,
    },
  ]);
  const [leverage, setLeverage] = useState(String(INITIAL_POSITION.leverage));
  const [walletBalance, setWalletBalance] = useState(String(INITIAL_POSITION.walletBalance));
  const [lossAmount, setLossAmount] = useState("0");
  const [usedBalance, setUsedBalance] = useState("0");
  const [pnlAmount, setPnlAmount] = useState("0");
  const [side, setSide] = useState<PositionSide>(INITIAL_POSITION.side);
  const [marginMode, setMarginMode] = useState<MarginMode>(INITIAL_POSITION.isIsolated ? "isolated" : "cross");

  const activeSymbolCount = tradeCount;

  const updateHolding = (index: number, updater: (holding: HoldingState) => HoldingState) => {
    setHoldings((previous) => previous.map((holding, currentIndex) => (currentIndex === index ? updater(holding) : holding)));
  };

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadCoins = async () => {
      const activeHoldings = holdings.slice(0, activeSymbolCount);

      setHoldings((previous) =>
        previous.map((holding, index) =>
          index < activeSymbolCount ? { ...holding, loadingCoins: true, coinError: null } : holding
        )
      );

      const loadedHoldings = await Promise.all(
        activeHoldings.map(async (holding, index) => {
          try {
            const response = await fetch(`/api/coins?exchange=${encodeURIComponent(holding.exchange)}`, {
              signal: controller.signal,
            });
            const payload = (await response.json()) as {
              error?: string;
              coins?: CoinOption[];
            };

            if (!response.ok) {
              throw new Error(payload?.error ?? "Unable to load coins.");
            }

            const coinList = Array.isArray(payload?.coins) ? payload.coins : [];
            const nextSelectedSymbol = coinList.some((coin) => coin.symbol === holding.selectedSymbol)
              ? holding.selectedSymbol
              : coinList[0]?.symbol ?? "";
            const nextEntryPrice = coinList.find((coin) => coin.symbol === nextSelectedSymbol)?.lastPrice;

            return {
              index,
              coins: coinList,
              selectedSymbol: nextSelectedSymbol,
              entryPrice: holding.entryPrice || (Number.isFinite(nextEntryPrice) ? String(nextEntryPrice) : ''),
              coinError: null,
            };
          } catch (error) {
            if ((error as Error).name === "AbortError") {
              return null;
            }

            return {
              index,
              coins: [],
              selectedSymbol: "",
              entryPrice: holding.entryPrice,
              coinError: (error as Error).message ?? `Unable to load ${holding.exchange.toUpperCase()} coins.`,
            };
          }
        })
      );

      if (!isMounted) {
        return;
      }

      setHoldings((previous) =>
        previous.map((holding, index) => {
          if (index >= activeSymbolCount) {
            return holding;
          }

          const loadedHolding = loadedHoldings.find((item) => item?.index === index);

          if (!loadedHolding) {
            return { ...holding, loadingCoins: false };
          }

          return {
            ...holding,
            loadingCoins: false,
            coins: loadedHolding.coins,
            selectedSymbol: loadedHolding.selectedSymbol,
            entryPrice: loadedHolding.entryPrice,
            coinError: loadedHolding.coinError,
          };
        })
      );
    };

    void loadCoins();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeSymbolCount, holdings[0].exchange, holdings[1].exchange, holdings[2].exchange]);

  const slotSummaries = useMemo(() => {
    const leverageValue = parseInput(leverage);
    const walletValue = parseInput(walletBalance);
    const availableWallet = Math.max(
      walletValue - parseInput(lossAmount) - parseInput(usedBalance) - parseInput(pnlAmount),
      0
    );
    const slotInputs = holdings.slice(0, activeSymbolCount).map((holding) => {
      const selectedCoin = holding.coins.find((coin) => coin.symbol === holding.selectedSymbol) ?? null;
      const holdingQuantity = parseInput(holding.quantity);
      const entryPrice = parseInput(holding.entryPrice);
      const totalNotional =
        selectedCoin && Number.isFinite(selectedCoin.lastPrice) && Number.isFinite(holdingQuantity) && Number.isFinite(entryPrice)
          ? entryPrice * holdingQuantity
          : 0;

      return {
        holding,
        totalNotional,
      };
    });

    const totalNotionalAcrossTrades = slotInputs.reduce((total, slot) => total + slot.totalNotional, 0);
    let remainingWallet = availableWallet;
    let remainingNotional = totalNotionalAcrossTrades;

    return slotInputs.map((slotInput, index) => {
      const remainingSlots = Math.max(slotInputs.length - index, 1);
      const walletShare =
        index === slotInputs.length - 1
          ? remainingWallet
          : remainingNotional > 0 && slotInput.totalNotional > 0
            ? (remainingWallet * slotInput.totalNotional) / remainingNotional
            : remainingWallet / remainingSlots;

      remainingWallet = Math.max(remainingWallet - walletShare, 0);
      remainingNotional = Math.max(remainingNotional - slotInput.totalNotional, 0);

      return buildSlotSummary(slotInput.holding, leverageValue, walletShare, marginMode, side);
    });
  }, [holdings, activeSymbolCount, leverage, walletBalance, lossAmount, usedBalance, pnlAmount, marginMode, side]);

  const allResults = slotSummaries.flatMap((slot) => slot.results);
  const safestExchange = findSafestExchange(allResults);
  const portfolioNotional = slotSummaries.reduce((total, slot) => total + slot.totalNotional, 0);
  const portfolioMargin = Math.max(
    parseInput(walletBalance) - parseInput(lossAmount) - parseInput(usedBalance) - parseInput(pnlAmount),
    0
  );

  const recommendation = safestExchange
    ? `${safestExchange.name} currently gives the widest liquidation buffer across the active symbols. Wallet is split to ${formatCurrency(
        portfolioMargin / Math.max(activeSymbolCount, 1)
      )} USDT per symbol.`
    : "Choose the coins for each symbol slot to get a portfolio recommendation.";

  const renderHoldingCard = (slot: SlotSummary, index: number) => {
    const holding = holdings[index];

    if (!holding) {
      return null;
    }

    const symbolLabel = `Trade ${index + 1}`;

    return (
      <article key={index} className={styles.holdingCard}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelKicker}>{symbolLabel}</p>
            <h3>{slot.selectedCoin?.displaySymbol ?? "Choose coin"}</h3>
          </div>
          <span className={styles.panelBadge}>{holding.exchange.toUpperCase()}</span>
        </div>

        <div className={styles.selectorGrid}>
          <label className={styles.field}>
            <span>Exchange</span>
            <select
              className={styles.input}
              value={holding.exchange}
              onChange={(event) =>
                updateHolding(index, (current) => ({
                  ...current,
                  exchange: event.target.value as Exchange,
                  selectedSymbol: "",
                  coins: [],
                  entryPrice: "",
                  coinError: null,
                  loadingCoins: true,
                }))
              }
            >
              {EXCHANGE_OPTIONS.map((exchange) => (
                <option key={exchange.value} value={exchange.value}>
                  {exchange.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Coin</span>
            <select
              className={styles.input}
              value={holding.selectedSymbol}
              onChange={(event) =>
                updateHolding(index, (current) => {
                  const selectedCoin = current.coins.find((coin) => coin.symbol === event.target.value);

                  return {
                    ...current,
                    selectedSymbol: event.target.value,
                    entryPrice: selectedCoin ? String(selectedCoin.lastPrice) : current.entryPrice,
                  };
                })
              }
              disabled={holding.loadingCoins || holding.coins.length === 0}
            >
              <option value="">{holding.loadingCoins ? "Loading coins..." : "Choose a coin"}</option>
              {holding.coins.map((coin) => (
                <option key={coin.symbol} value={coin.symbol}>
                  {coin.displaySymbol}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Manual symbol</span>
            <input
              className={styles.input}
              value={holding.selectedSymbol}
              onChange={(event) =>
                updateHolding(index, (current) => {
                  const symbol = event.target.value.trim().toUpperCase();
                  const selectedCoin = resolveTypedSymbol(current.coins, symbol);

                  return {
                    ...current,
                    selectedSymbol: symbol,
                    entryPrice: selectedCoin ? String(selectedCoin.lastPrice) : current.entryPrice,
                  };
                })
              }
              placeholder="Type coin symbol, e.g. BTCUSDT"
              autoCapitalize="characters"
            />
          </label>

          <label className={styles.field}>
            <span>Entry price</span>
            <input
              className={styles.input}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.0001"
              value={holding.entryPrice}
              onChange={(event) =>
                updateHolding(index, (current) => ({
                  ...current,
                  entryPrice: event.target.value,
                }))
              }
            />
            <span className={styles.fieldNote}>Use your actual fill price here so liquidation reflects the trade you took.</span>
          </label>

          <label className={styles.field}>
            <span>Holding qty</span>
            <input
              className={styles.input}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.0001"
              value={holding.quantity}
              onChange={(event) =>
                updateHolding(index, (current) => ({
                  ...current,
                  quantity: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className={styles.priceRow}>
          <div className={styles.priceCard}>
            <p className={styles.labelText}>Current price</p>
            <p className={styles.priceValue}>{slot.currentPrice ? `${formatCoinPrice(slot.currentPrice)} USDT` : "-"}</p>
          </div>
          <div className={styles.priceCard}>
            <p className={styles.labelText}>Wallet share</p>
            <p className={styles.priceValue}>${formatCurrency(slot.walletShare)}</p>
          </div>
        </div>

        {holding.coinError && (
          <div className={styles.errorBox}>
            <p className={styles.errorTitle}>Coin data unavailable</p>
            <p className={styles.helperText}>{holding.coinError}</p>
          </div>
        )}

        {slot.validationErrors.length > 0 && (
          <div className={styles.errorBox}>
            <p className={styles.errorTitle}>Fix the inputs below</p>
            <ul className={styles.errorList}>
              {slot.validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Exchange</th>
                <th>Liq. price</th>
                <th>Distance</th>
                <th>Maint. rate</th>
              </tr>
            </thead>
            <tbody>
              {slot.results.map((result) => {
                const isSafest = slot.safestExchange?.name === result.name;

                return (
                  <tr key={result.name} className={isSafest ? styles.safeRow : undefined}>
                    <td>
                      <div className={styles.exchangeCell}>
                        <strong>{result.name}</strong>
                        {isSafest && <span className={styles.safeBadge}>Safest</span>}
                      </div>
                    </td>
                    <td>${formatCurrency(result.liquidationPrice)}</td>
                    <td>{formatPercent(result.distanceToLiquidation)}</td>
                    <td>{(result.maintenanceMarginRate * 100).toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </article>
    );
  };

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <header className={styles.header}>
<div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>LIQUIDATION CALCULATOR</h1>
            </div>
          </div>
        </header>

        <Navigation />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.subtitle}>Compare liquidation for each held symbol across Binance, Bitget, and MEXC.</p>

            <div className={styles.tagRow}>
              <span className={styles.tag}>Binance</span>
              <span className={styles.tag}>Bitget</span>
              <span className={styles.tag}>MEXC</span>
              <span className={styles.tagMuted}>USDT-M perpetuals</span>
            </div>
          </div>
        </section>

        <section className={styles.contentGrid}>
          <form className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelKicker}>Inputs</p>
                <h2>Trade setup</h2>
              </div>
              <span className={styles.panelBadge}>{activeSymbolCount} symbols</span>
            </div>

            <div className={styles.selectorGrid}>
              <label className={styles.field}>
                <span>Trades</span>
                <select
                  className={styles.input}
                  value={tradeCount}
                  onChange={(event) => setTradeCount(Number(event.target.value) as 1 | 2)}
                >
                  <option value={1}>1 trade</option>
                  <option value={2}>2 trades</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Leverage</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.1"
                  value={leverage}
                  onChange={(event) => setLeverage(event.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Wallet balance</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={walletBalance}
                  onChange={(event) => setWalletBalance(event.target.value)}
                />
                <span className={styles.fieldNote}>Available balance: ${formatCurrency(portfolioMargin)}</span>
              </label>

              <label className={styles.field}>
                <span>Loss</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lossAmount}
                  onChange={(event) => setLossAmount(event.target.value)}
                />
                <span className={styles.fieldNote}>Deducted from wallet balance before liquidation is calculated.</span>
              </label>

              <label className={styles.field}>
                <span>Used balance</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={usedBalance}
                  onChange={(event) => setUsedBalance(event.target.value)}
                />
                <span className={styles.fieldNote}>Also deducted before available balance is calculated.</span>
              </label>

              <label className={styles.field}>
                <span>P&amp;L</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pnlAmount}
                  onChange={(event) => setPnlAmount(event.target.value)}
                />
                <span className={styles.fieldNote}>Profit or loss deducted before calculation.</span>
              </label>
            </div>

            <div className={styles.toggleRow}>
              <div>
                <p className={styles.toggleLabel}>Side</p>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${side === "long" ? styles.toggleActive : ""}`.trim()}
                    onClick={() => setSide("long")}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${side === "short" ? styles.toggleActive : ""}`.trim()}
                    onClick={() => setSide("short")}
                  >
                    Short
                  </button>
                </div>
              </div>

              <div>
                <p className={styles.toggleLabel}>Position mode</p>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${marginMode === "isolated" ? styles.toggleActive : ""}`.trim()}
                    onClick={() => setMarginMode("isolated")}
                  >
                    Isolated
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${marginMode === "cross" ? styles.toggleActive : ""}`.trim()}
                    onClick={() => setMarginMode("cross")}
                  >
                    Cross
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${marginMode === "hedge" ? styles.toggleActive : ""}`.trim()}
                    onClick={() => setMarginMode("hedge")}
                  >
                    Hedge
                  </button>
                </div>
              </div>
            </div>

            <p className={styles.note}>Choose one trade or two trades before picking the coins.</p>
            <p className={styles.note}>In two-trade mode, Trade 2 uses the remaining wallet after Trade 1 allocation so liquidation updates per coin.</p>
          </form>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelKicker}>Results</p>
                <h2>Symbol comparison</h2>
              </div>
              <span className={styles.panelBadge}>{side.toUpperCase()}</span>
            </div>

            <div className={styles.symbolStack}>{slotSummaries.map((slot, index) => renderHoldingCard(slot, index))}</div>

          </section>
        </section>
      </main>
    </div>
  );
}