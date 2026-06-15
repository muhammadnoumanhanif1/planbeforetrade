"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "@/lib/supabase-client";
import { Navigation } from "@/components/Navigation";
import styles from "../../app/page.module.css";
import { EXCHANGE_OPTIONS, TIMEFRAME_OPTIONS } from "./config";
import type { AnalysisData, CoinOption, Exchange } from "./types";
import { formatNumber, getCoinsLimitLabel } from "./utils";

const CandleChart = dynamic(
  () => import("../../components/charts/CandleChart").then((module) => module.CandleChart),
  {
    ssr: false,
    loading: () => <p className={styles.placeholder}>Loading chart...</p>,      
  }
);

interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  tier: "free" | "premium";
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}

interface AnalysisDashboardProps {
  user?: UserInfo;
  usageInfo?: UsageInfo;
}

const ENTRY_ZONE_BUFFER = 0.01;
const ANALYSIS_REFRESH_INTERVAL_MS = 15000;

export type EntryGuidance = {
  entryLow: number;
  entryHigh: number;
  inZone: boolean;
  direction: "above" | "below" | "inside";
  distancePercent: number;
  referenceLevel: number;
};

export function getEntryGuidance(
  analysis: AnalysisData | null,
  marketPrice: number | null
): EntryGuidance | null {
  if (!analysis || !marketPrice) return null;
  const rawReference =
    analysis.recommendation === "LONG" ? analysis.support : analysis.resistance;
  if (!Number.isFinite(rawReference) || rawReference <= 0) return null;

  // If the raw support/resistance is more than 2% away from the current price,
  // we use a reference level that is closer (1% away) so the entry zone is realistic.
  let referenceLevel = rawReference;
  const maxDistancePercent = 0.02; // 2%

  if (analysis.recommendation === "LONG") {
    const distance = (marketPrice - rawReference) / marketPrice;
    if (distance > maxDistancePercent) {
      referenceLevel = marketPrice * 0.99;
    }
  } else {
    const distance = (rawReference - marketPrice) / marketPrice;
    if (distance > maxDistancePercent) {
      referenceLevel = marketPrice * 1.01;
    }
  }

  const entryLow =
    analysis.recommendation === "LONG"
      ? referenceLevel
      : referenceLevel * (1 - ENTRY_ZONE_BUFFER);
  const entryHigh =
    analysis.recommendation === "LONG"
      ? referenceLevel * (1 + ENTRY_ZONE_BUFFER)
      : referenceLevel;
  const inZone = marketPrice >= entryLow && marketPrice <= entryHigh;
  let distancePercent = 0;
  let direction: "above" | "below" | "inside" = "inside";

  if (!inZone) {
    if (marketPrice > entryHigh) {
      direction = "above";
      distancePercent = ((marketPrice - entryHigh) / marketPrice) * 100;
    } else {
      direction = "below";
      distancePercent = ((entryLow - marketPrice) / marketPrice) * 100;
    }
  }

  return {
    entryLow,
    entryHigh,
    inZone,
    direction,
    distancePercent,
    referenceLevel,
  };
}

export function AnalysisDashboard({ user, usageInfo }: AnalysisDashboardProps) {  const [coins, setCoins] = useState<CoinOption[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<Exchange>("bitget"); 
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [timeframe, setTimeframe] = useState("1h");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coinsUpdatedAt, setCoinsUpdatedAt] = useState("");
  const [currentUsage, setCurrentUsage] = useState(usageInfo?.used || 0);
  const [riskRatio, setRiskRatio] = useState<"1:3" | "1:2">("1:3");
  const [activeAnalysisRequest, setActiveAnalysisRequest] = useState<{
    exchange: Exchange;
    symbol: string;
    timeframe: string;
  } | null>(null);
  const [refreshElapsedMs, setRefreshElapsedMs] = useState(0);
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadCoins = async () => {
      try {
        setLoadingCoins(true);
        const response = await fetch(
          `/api/coins?exchange=${encodeURIComponent(selectedExchange)}`,
          { signal: controller.signal }
        );
        const payload = await response.json();

        if (!response.ok) throw new Error(payload?.error ?? "Unable to load coins.");

        const coinList = Array.isArray(payload?.coins) ? payload.coins : [];
        setCoins(coinList);
        setCoinsUpdatedAt(payload?.updatedAt ?? "");

        if (coinList.length) {
          setSelectedSymbol((current) =>
            current && coinList.some((coin: CoinOption) => coin.symbol === current)
              ? current
              : coinList[0].symbol
          );
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError(`Unable to load coins from ${selectedExchange.toUpperCase()}.`);
        }
      } finally {
        setLoadingCoins(false);
      }
    };

    loadCoins();
    return () => controller.abort();
  }, [selectedExchange]);

  const selectedCoin = useMemo(
    () => coins.find((coin) => coin.symbol === selectedSymbol) ?? null,
    [coins, selectedSymbol]
  );

  const marketPrice = analysis?.lastPrice ?? selectedCoin?.lastPrice ?? null;

  const estimatedNotional = useMemo(() => {
    const qty = Number(quantity);
    if (!marketPrice || !Number.isFinite(qty) || qty <= 0) return 0;
    return qty * marketPrice;
  }, [quantity, marketPrice]);

  const riskManagementValues = useMemo(() => {
    if (!analysis) return null;

    const entryPrice = analysis.lastPrice;
    const baseSL = analysis.stopLosses[0];
    const riskAmount = entryPrice - baseSL;

    if (riskRatio === "1:3") {
      return {
        stopLoss: baseSL,
        tp1: analysis.takeProfits[0],
        tp2: analysis.takeProfits[1],
        tp3: analysis.takeProfits[2],
        targetPrice: analysis.takeProfits[0],
      };
    } else {
      // 1:2 ratio - calculate new TPs with 2x risk instead of 3x
      const tp1 = entryPrice + (1 * riskAmount);
      const tp2 = entryPrice + (2 * riskAmount);
      return {
        stopLoss: baseSL,
        tp1: tp1,
        tp2: tp2,
        targetPrice: tp2, // Target is at 2x risk for 1:2 ratio
      };
    }
  }, [analysis, riskRatio]);

  const entryGuidance = useMemo(
    () => getEntryGuidance(analysis, marketPrice),
    [analysis, marketPrice]
  );

  const canAnalyze = useMemo(() => {
    if (!usageInfo) return true; // No usage tracking
    if (usageInfo.isPremium) return true;
    return currentUsage < usageInfo.limit;
  }, [usageInfo, currentUsage]);

  const remainingAnalyses = useMemo(() => {
    if (!usageInfo) return Infinity;
    if (usageInfo.isPremium) return Infinity;
    return Math.max(0, usageInfo.limit - currentUsage);
  }, [usageInfo, currentUsage]);

  const formattedSignalGeneratedTime = useMemo(() => {
    if (!analysis?.signalGeneratedAt) return null;
    const date = new Date(analysis.signalGeneratedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [analysis?.signalGeneratedAt]);

  const formattedAnalysisUpdatedTime = useMemo(() => {
    if (!analysisUpdatedAt) return null;
    return analysisUpdatedAt.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [analysisUpdatedAt]);

  const runAnalysis = useCallback(
    async ({
      isAutoRefresh = false,
      request,
    }: {
      isAutoRefresh?: boolean;
      request?: { exchange: Exchange; symbol: string; timeframe: string };
    } = {}) => {
      const analysisRequest = request ?? {
        exchange: selectedExchange,
        symbol: selectedSymbol,
        timeframe,
      };

      if (!analysisRequest.symbol) {
        if (!isAutoRefresh) setError("Select a coin to analyze.");
        return;
      }

      if (!isAutoRefresh && !canAnalyze) {
        setError("You've reached your daily analysis limit. Upgrade to Premium for unlimited analyses!");
        return;
      }

      if (!isAutoRefresh) {
        setError(null);
        setLoadingAnalysis(true);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const query = new URLSearchParams({
          exchange: analysisRequest.exchange,
          symbol: analysisRequest.symbol,
          timeframe: analysisRequest.timeframe,
        });

        if (isAutoRefresh) query.set("autoRefresh", "1");

        const response = await fetch(`/api/analysis?${query.toString()}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const payload = await response.json();

        if (!response.ok) throw new Error(payload?.error ?? "Unable to analyze coin.");

        const parsedAnalysis = payload as AnalysisData & { cached?: boolean };
        setAnalysis(parsedAnalysis);
        setAnalysisUpdatedAt(new Date());

        if (!isAutoRefresh) {
          setActiveAnalysisRequest(analysisRequest);
        }

        if (!isAutoRefresh && usageInfo && !usageInfo.isPremium && !parsedAnalysis.cached) {
          setCurrentUsage((prev) => prev + 1);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError((fetchError as Error).message ?? "Analysis failed.");
        }
        if (!isAutoRefresh) {
          setAnalysis(null);
          setAnalysisUpdatedAt(null);
          setActiveAnalysisRequest(null);
        }
      } finally {
        if (!isAutoRefresh) {
          setLoadingAnalysis(false);
        }
      }
    },
    [selectedExchange, selectedSymbol, timeframe, canAnalyze, usageInfo]
  );

  const handleAnalyze = useCallback(async () => {
    await runAnalysis();
  }, [runAnalysis]);

  useEffect(() => {
    if (!activeAnalysisRequest) return;

    let elapsedMs = 0;
    const tickerId = window.setInterval(() => {
      elapsedMs += 200;
      setRefreshElapsedMs(Math.min(elapsedMs, ANALYSIS_REFRESH_INTERVAL_MS));
    }, 200);

    const intervalId = window.setInterval(() => {
      elapsedMs = 0;
      setRefreshElapsedMs(0);
      void runAnalysis({
        isAutoRefresh: true,
        request: activeAnalysisRequest,
      });
    }, ANALYSIS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(tickerId);
      window.clearInterval(intervalId);
    };
  }, [activeAnalysisRequest, runAnalysis]);

  useEffect(() => {
    if (!activeAnalysisRequest) setRefreshElapsedMs(0);
  }, [activeAnalysisRequest]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}>Plan Before Trade</p>
              <h1>CRYPTO COINS ANALYSIS PLATFORM</h1>
            </div>
          </div>
          <div className={styles.headerBar}>
            <div className={styles.statusGroup}>
              <span>Coins loaded: {loadingCoins ? "Loading..." : coins.length}</span>
              <span>
                Updated:{" "}
                {coinsUpdatedAt
                  ? new Date(coinsUpdatedAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "-"}
              </span>
              {user && (
                <span className={`${styles.tierBadge} ${usageInfo?.isPremium ? styles.premium : styles.free}`}>
                  {usageInfo?.isPremium ? "⭐ Premium" : "Free"}
                </span>
              )}
            </div>
            <div className={styles.headerActions}>
              {user && <span style={{ color: "#94a3b8", fontSize: "14px" }}>{user.email}</span>}
            </div>
          </div>
        </header>

        <Navigation />

        {/* Usage Banner for Free Users */}
        {usageInfo && !usageInfo.isPremium && (
          <div className={`${styles.usageBanner} ${remainingAnalyses <= 1 ? styles.warning : ""}`}>
            <span className={styles.usageText}>
              {remainingAnalyses === 0
                ? "You've used all 3 free analyses today!"
                : `${remainingAnalyses} of 3 free analyses remaining today`}
            </span>
            <Link href="/pricing" className={styles.upgradeButton}>
              Upgrade to Premium
            </Link>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Select coin</h2>

            <label className={styles.label}>
              Exchange
              <select
                className={styles.input}
                value={selectedExchange}
                onChange={(event) => {
                  setSelectedExchange(event.target.value as Exchange);
                  setCoins([]);
                  setSelectedSymbol("");
                  setAnalysis(null);
                  setAnalysisUpdatedAt(null);
                  setActiveAnalysisRequest(null);
                  setError(null);
                }}
              >
                {EXCHANGE_OPTIONS.map((exchange) => (
                  <option key={exchange.value} value={exchange.value}>
                    {exchange.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              {selectedExchange.toUpperCase()} spot coins ({getCoinsLimitLabel(selectedExchange)} USDT pairs)
              <select
                className={styles.input}
                value={selectedSymbol}
                onChange={(event) => {
                  setSelectedSymbol(event.target.value);
                  setAnalysis(null);
                  setAnalysisUpdatedAt(null);
                  setActiveAnalysisRequest(null);
                }}
                disabled={loadingCoins}
              >
                <option value="">Choose a coin</option>
                {coins.map((coin) => (
                  <option key={coin.symbol} value={coin.symbol}>
                    {coin.displaySymbol}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Manual symbol
              <input
                className={styles.input}
                value={selectedSymbol}
                onChange={(event) => {
                  setSelectedSymbol(event.target.value.trim().toUpperCase());
                  setAnalysis(null);
                  setAnalysisUpdatedAt(null);
                  setActiveAnalysisRequest(null);
                }}
                placeholder="Type coin symbol, e.g. BTCUSDT"
                autoCapitalize="characters"
              />
            </label>

            <div className={styles.priceRow}>
              <div>
                <p className={styles.labelText}>Current price</p>
                <p className={styles.priceValue}>
                  {marketPrice ? `${formatNumber(marketPrice, 6)} USDT` : "-"}
                </p>
              </div>
              <div>
                <p className={styles.labelText}>Pair</p>
                <p className={styles.priceValue}>{selectedCoin?.displaySymbol ?? selectedSymbol ?? "-"}</p>
              </div>
            </div>

            <label className={styles.label}>
              Risk Management Ratio
              <select
                className={styles.input}
                value={riskRatio}
                onChange={(event) => setRiskRatio(event.target.value as "1:3" | "1:2")}
              >
                <option value="1:3">1:3 (Conservative)</option>
                <option value="1:2">1:2 (Aggressive)</option>
              </select>
            </label>

            <label className={styles.label}>
              Quantity to buy
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.0001"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Enter quantity"
              />
            </label>

            <div className={styles.helperRow}>
              <span>
                Estimated notional: {estimatedNotional > 0 ? formatNumber(estimatedNotional, 2) : "-"} USDT
              </span>
            </div>

            <label className={styles.label}>
              Timeframe
              <select
                className={styles.input}
                value={timeframe}
                onChange={(event) => {
                  const nextTimeframe = event.target.value;
                  setTimeframe(nextTimeframe);
                  if (selectedSymbol) {
                    void runAnalysis({
                      request: {
                        exchange: selectedExchange,
                        symbol: selectedSymbol,
                        timeframe: nextTimeframe,
                      },
                    });
                  } else {
                    setAnalysis(null);
                    setAnalysisUpdatedAt(null);
                    setActiveAnalysisRequest(null);
                  }
                }}
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={styles.button}
              onClick={handleAnalyze}
              disabled={!selectedSymbol || loadingAnalysis || !canAnalyze}
            >
              {loadingAnalysis 
                ? "Analyzing..." 
                : !canAnalyze 
                  ? "Limit reached - Upgrade" 
                  : "Analyze coin"}
            </button>

            <div className={styles.confidenceLegend}>
              <p className={styles.legendTitle}>Confidence Level Guide</p>
              <table className={styles.legendTable}>
                <tbody>
                  <tr>
                    <td className={styles.weak}>10-30%</td>
                    <td>Weak signals - conflicting indicators, high volatility, or unclear trend</td>
                  </tr>
                  <tr>
                    <td className={styles.moderate}>31-60%</td>
                    <td>Moderate confidence - some indicators align but not strongly</td>
                  </tr>
                  <tr>
                    <td className={styles.strong}>61-95%</td>
                    <td>Strong confidence - most/all indicators agree, stable price action</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {analysis && Number(quantity) > 0 && (
              <div className={styles.riskManagement}>
                <p className={styles.riskTitle}>Risk Management ({riskRatio} R:R)</p>
                <table className={styles.riskTable}>
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Price</th>
                      <th>P/L (USDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Entry</td>
                      <td>{formatNumber(analysis.lastPrice, 6)}</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td>Stop Loss</td>
                      <td>{formatNumber(riskManagementValues?.stopLoss ?? 0, 6)}</td>
                      <td className={styles.loss}>
                        -
                        {formatNumber(
                          Math.abs(analysis.lastPrice - (riskManagementValues?.stopLoss ?? 0)) * Number(quantity),
                          2
                        )}
                      </td>
                    </tr>
                    {riskManagementValues?.tp1 && (
                      <tr>
                        <td>TP1</td>
                        <td>{formatNumber(riskManagementValues.tp1, 6)}</td>
                        <td className={styles.profit}>
                          +
                          {formatNumber(
                            Math.abs((riskManagementValues.tp1 - analysis.lastPrice) * Number(quantity)),
                            2
                          )}
                        </td>
                      </tr>
                    )}
                    {riskManagementValues?.tp2 && (
                      <tr>
                        <td>TP2</td>
                        <td>{formatNumber(riskManagementValues.tp2, 6)}</td>
                        <td className={styles.profit}>
                          +
                          {formatNumber(
                            Math.abs((riskManagementValues.tp2 - analysis.lastPrice) * Number(quantity)),
                            2
                          )}
                        </td>
                      </tr>
                    )}
                    {riskManagementValues?.tp3 && (
                      <tr>
                        <td>TP3</td>
                        <td>{formatNumber(riskManagementValues.tp3, 6)}</td>
                        <td className={styles.profit}>
                          +
                          {formatNumber(
                            Math.abs((riskManagementValues.tp3 - analysis.lastPrice) * Number(quantity)),
                            2
                          )}
                        </td>
                      </tr>
                    )}
                    <tr className={styles.riskRow}>
                      <td>Risk:Reward</td>
                      <td colSpan={2}>{riskRatio}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {analysis && entryGuidance && (
              <div className={styles.aiRecommendation} style={{ marginBottom: 16 }}>
                <p className={styles.aiTitle}>Entry Check</p>
                <p className={styles.aiText}>
                  {entryGuidance.inZone
                    ? "Current price is inside the preferred entry zone based on recent support/resistance."
                    : `Current price is ${formatNumber(entryGuidance.distancePercent, 2)}% ${entryGuidance.direction} the preferred entry zone. Consider waiting for price closer to that range for a cleaner entry.`}
                </p>
                <div className={styles.priceRow} style={{ marginTop: 12, marginBottom: 0 }}>
                  <div>
                    <p className={styles.labelText}>Preferred entry zone</p>
                    <p className={styles.priceValue}>
                      {formatNumber(entryGuidance.entryLow, 6)} - {formatNumber(entryGuidance.entryHigh, 6)}
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>
                      Reference {analysis.recommendation === "LONG" ? "support" : "resistance"}
                    </p>
                    <p className={styles.priceValue}>{formatNumber(entryGuidance.referenceLevel, 6)}</p>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className={styles.aiRecommendation}>
                <p className={styles.aiTitle}>AI Recommendation</p>
                <p className={styles.aiText}>
                  {analysis.recommendation === "LONG" ? (
                    <>
                      <strong>LONG</strong> - The analysis shows a{" "}
                      {analysis.confidence >= 60
                        ? "strong"
                        : analysis.confidence >= 30
                          ? "moderate"
                          : "weak"}{" "}
                      bullish trend. {analysis.indicators.smaShort > analysis.indicators.smaLong
                        ? "Short-term SMA is above long-term SMA indicating upward momentum."
                        : "Short-term SMA is below long-term SMA, suggesting caution."}{" "}
                      RSI at {formatNumber(analysis.indicators.rsi, 1)} suggests{" "}
                      {analysis.indicators.rsi < 30
                        ? "oversold conditions (potential buying opportunity)"
                        : analysis.indicators.rsi > 70
                          ? "overbought conditions (caution advised)"
                          : "neutral conditions"}
                      .{" "}
                      {analysis.indicators.momentum > 0
                        ? "Positive momentum supports the bullish case."
                        : "Negative momentum may indicate potential pullbacks."}
                    </>
                  ) : (
                    <>
                      <strong>SHORT</strong> - The analysis shows a{" "}
                      {analysis.confidence >= 60
                        ? "strong"
                        : analysis.confidence >= 30
                          ? "moderate"
                          : "weak"}{" "}
                      bearish trend. {analysis.indicators.smaShort < analysis.indicators.smaLong
                        ? "Short-term SMA is below long-term SMA indicating downward momentum."
                        : "Short-term SMA is above long-term SMA, suggesting caution."}{" "}
                      RSI at {formatNumber(analysis.indicators.rsi, 1)} suggests{" "}
                      {analysis.indicators.rsi > 70
                        ? "overbought conditions (potential selling opportunity)"
                        : analysis.indicators.rsi < 30
                          ? "oversold conditions (caution advised)"
                          : "neutral conditions"}
                      .{" "}
                      {analysis.indicators.momentum < 0
                        ? "Negative momentum supports the bearish case."
                        : "Positive momentum may indicate potential rallies."}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2>Analysis output</h2>
            {analysis ? (
              <div className={styles.analysis}>
                <div className={styles.analysisHeader}>
                  <div>
                    <p className={styles.labelText}>Recommendation</p>
                    <p className={`${styles.badge} ${analysis.recommendation === "LONG" ? styles.long : styles.short}`}>
                      {analysis.recommendation}
                    </p>
                    {formattedSignalGeneratedTime ? (
                      <p className={styles.helperRow}>Signal generated: {formattedSignalGeneratedTime}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className={styles.labelText}>Current Price</p>
                    <p className={styles.priceValue}>
                      {formatNumber(analysis.lastPrice, 6)} USDT
                    </p>
                    <div className={styles.refreshProgressTrack}>
                      <div
                        className={styles.refreshProgressFill}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, (refreshElapsedMs / ANALYSIS_REFRESH_INTERVAL_MS) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className={styles.labelText}>Entry Price</p>
                    <p className={styles.priceValue}>
                      {entryGuidance
                        ? `${formatNumber((entryGuidance.entryLow + entryGuidance.entryHigh) / 2, 6)} USDT`
                        : `${formatNumber(analysis.lastPrice, 6)} USDT`}
                    </p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Predicted price</p>
                    <p className={styles.priceValue}>{formatNumber(analysis.predictedPrice, 6)} USDT</p>
                    {formattedAnalysisUpdatedTime ? (
                      <p className={styles.helperRow}>Updated at: {formattedAnalysisUpdatedTime}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className={styles.labelText}>Confidence</p>
                    <p className={styles.priceValue}>{Math.min(100, Math.max(0, analysis.confidence))}%</p>
                  </div>
                </div>

                <div className={styles.levels}>
                  <div>
                    <h3>Take profit levels</h3>
                    <ul>
                      {(riskRatio === "1:2"
                        ? [riskManagementValues?.tp1, riskManagementValues?.tp2]
                        : [riskManagementValues?.tp1, riskManagementValues?.tp2, riskManagementValues?.tp3]
                      )
                        .filter((price): price is number => typeof price === "number")
                        .map((price, index) => (
                        <li key={`tp-${index}`}>
                          TP {index + 1}: {formatNumber(price, 6)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Stop loss ({riskRatio} R/R)</h3>
                    <p className={styles.priceValue}>
                      {formatNumber(riskManagementValues?.stopLoss ?? analysis.stopLosses[0], 6)}
                    </p>
                  </div>
                </div>

                {analysis && usageInfo?.isPremium && (
                  <button
                    type="button"
                    className={styles.button}
                    onClick={async () => {
                      if (!selectedSymbol || !analysis) {
                        setError("Please complete an analysis first");
                        return;
                      }
                      try {
                        setError(null);
                        const response = await fetch("/api/watchlists/add", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            exchange: selectedExchange,
                            symbol: selectedSymbol,
                            entryPrice: marketPrice,
                            targetPrice: riskManagementValues?.targetPrice,
                            stopLoss: riskManagementValues?.stopLoss,
                            tp1: riskManagementValues?.tp1,
                            tp2: riskManagementValues?.tp2,
                            tp3: riskManagementValues?.tp3,
                            confidence: analysis.confidence,
                            recommendation: analysis.recommendation,
                            timeframe: timeframe,
                            riskRatio: riskRatio,
                          }),
                        });

                        if (!response.ok) {
                          const errorPayload = await response.json().catch(() => ({}));
                          throw new Error(errorPayload?.error ?? "Failed to add to watchlist");
                        }

                        const payload = await response.json();
                        setError(null);
                        alert(payload?.message ?? `${selectedSymbol} added to watchlist!`);
                      } catch (err) {
                        const errorMsg = err instanceof Error ? err.message : "Failed to add to watchlist";
                        setError(errorMsg);
                      }
                    }}
                  >
                    Add to Watchlist
                  </button>
                )}

                <div className={styles.supportBox}>
                  <div>
                    <p className={styles.labelText}>Support</p>
                    <p className={styles.priceValue}>{formatNumber(analysis.support, 6)}</p>
                  </div>
                  <div>
                    <p className={styles.labelText}>Resistance</p>
                    <p className={styles.priceValue}>{formatNumber(analysis.resistance, 6)}</p>
                  </div>
                </div>

                <div className={styles.indicators}>
                  <h3>Indicator snapshot</h3>
                  <div className={styles.indicatorGrid}>
                    <div>
                      <span>RSI</span>
                      <strong>{formatNumber(analysis.indicators.rsi, 2)}</strong>
                    </div>
                    <div>
                      <span>SMA (10)</span>
                      <strong>{formatNumber(analysis.indicators.smaShort, 6)}</strong>
                    </div>
                    <div>
                      <span>SMA (30)</span>
                      <strong>{formatNumber(analysis.indicators.smaLong, 6)}</strong>
                    </div>
                    <div>
                      <span>Momentum</span>
                      <strong>{formatNumber(analysis.indicators.momentum * 100, 2)}%</strong>
                    </div>
                    <div>
                      <span>Volatility</span>
                      <strong>{formatNumber(analysis.indicators.volatility, 6)}</strong>
                    </div>
                  </div>
                </div>

                <CandleChart
                  candles={analysis.candles}
                  smaLine={analysis.smaLine}
                  symbol={analysis.symbol}
                  support={analysis.support}
                  resistance={analysis.resistance}
                  targetPrice={analysis.predictedPrice}
                  stopLoss={riskManagementValues?.stopLoss ?? analysis.stopLosses[0]}
                  orderBlocks={analysis.orderBlocks}
                />

                <div className={styles.notes}>
                  {analysis.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.placeholder}>Run the analysis to view outlook, levels, and chart.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
