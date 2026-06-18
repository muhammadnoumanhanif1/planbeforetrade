"use client";

import { memo, useEffect, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  IChartApi,
  LineSeries,
} from "lightweight-charts";
import styles from "../../app/page.module.css";
import type { CandleData, OrderBlockData, SmaData } from "../../features/analysis/types";

function calculateEMA(candles: CandleData[], period: number): { time: number; value: number }[] {
  if (candles.length < period) return [];

  const emaValues: { time: number; value: number }[] = [];
  const k = 2 / (period + 1);

  // Initialize with Simple Moving Average (SMA) of first 'period' candles
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let currentEma = sum / period;
  emaValues.push({ time: candles[period - 1].time, value: currentEma });

  // Calculate subsequent EMA values
  for (let i = period; i < candles.length; i++) {
    currentEma = candles[i].close * k + currentEma * (1 - k);
    emaValues.push({ time: candles[i].time, value: currentEma });
  }

  return emaValues;
}

type CandleChartProps = {
  candles: CandleData[];
  smaLine: SmaData[];
  symbol: string;
  support: number;
  resistance: number;
  targetPrice: number;
  stopLoss: number;
  orderBlocks: OrderBlockData[];
};

function CandleChartComponent({
  candles,
  smaLine,
  symbol,
  support,
  resistance,
  targetPrice,
  stopLoss,
  orderBlocks,
}: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // Chart already disposed
      }
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.1)" },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f97316",
      borderUpColor: "#22c55e",
      borderDownColor: "#f97316",
      wickUpColor: "#22c55e",
      wickDownColor: "#f97316",
    });

    const smaSeries = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      title: "SMA (30)",
    });

    const ema50Data = calculateEMA(candles, 50);
    const ema200Data = calculateEMA(candles, 200);

    const ema50Series = chart.addSeries(LineSeries, {
      color: "#ec4899",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "EMA (50)",
    });

    const ema200Series = chart.addSeries(LineSeries, {
      color: "#10b981",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "EMA (200)",
    });

    candleSeries.setData(candles as unknown as never);
    smaSeries.setData(smaLine as unknown as never);
    ema50Series.setData(ema50Data as unknown as never);
    ema200Series.setData(ema200Data as unknown as never);

    const lastTime = candles[candles.length - 1].time;
    const firstTime = candles[0].time;

    const supportArea = chart.addSeries(
      AreaSeries,
      {
        topColor: "rgba(34, 197, 94, 0.3)",
        bottomColor: "rgba(34, 197, 94, 0.05)",
        lineColor: "#22c55e",
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        title: "Support",
      } as unknown as never
    );

    supportArea.setData(
      [
        { time: firstTime, value: support },
        { time: lastTime, value: support },
      ] as unknown as never
    );

    const resistanceArea = chart.addSeries(
      AreaSeries,
      {
        topColor: "rgba(248, 113, 113, 0.3)",
        bottomColor: "rgba(248, 113, 113, 0.05)",
        lineColor: "#f87171",
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        title: "Resistance",
      } as unknown as never
    );

    resistanceArea.setData(
      [
        { time: firstTime, value: resistance },
        { time: lastTime, value: resistance },
      ] as unknown as never
    );

    orderBlocks.forEach((ob, index) => {
      const candleDuration = candles[1]?.time - candles[0].time || 3600;
      const zoneWidth = candleDuration * 5;

      const orderBlockTopSeries = chart.addSeries(
        LineSeries,
        {
          color: "#a855f7",
          lineWidth: 2,
          priceLineVisible: index === 0,
          lastValueVisible: index === 0,
          title: index === 0 ? "Order Block" : "",
        } as unknown as never
      );

      orderBlockTopSeries.setData(
        [
          { time: ob.time, value: ob.top },
          { time: ob.time + zoneWidth, value: ob.top },
        ] as unknown as never
      );

      const orderBlockBottomSeries = chart.addSeries(
        LineSeries,
        {
          color: "#a855f7",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        } as unknown as never
      );

      orderBlockBottomSeries.setData(
        [
          { time: ob.time, value: ob.bottom },
          { time: ob.time + zoneWidth, value: ob.bottom },
        ] as unknown as never
      );
    });

    const targetSeries = chart.addSeries(
      LineSeries,
      {
        color: "#3b82f6",
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        title: "Target Price",
      } as unknown as never
    );

    targetSeries.setData(
      [
        { time: candles[0].time, value: targetPrice },
        { time: lastTime, value: targetPrice },
      ] as unknown as never
    );

    const stopLossSeries = chart.addSeries(
      LineSeries,
      {
        color: "#fbbf24",
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        title: "Stop Loss",
      } as unknown as never
    );

    stopLossSeries.setData(
      [
        { time: candles[0].time, value: stopLoss },
        { time: lastTime, value: stopLoss },
      ] as unknown as never
    );

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        chart.remove();
      } catch {
        // Chart already disposed
      }
      chartRef.current = null;
    };
  }, [candles, smaLine, support, resistance, targetPrice, stopLoss, orderBlocks]);

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{symbol} Price Chart</h3>
      <div ref={chartContainerRef} className={styles.chart} />
      <div className={styles.chartLegend}>
        <span><span className={styles.legendGreen} /> Support</span>
        <span><span className={styles.legendRed} /> Resistance</span>
        <span><span className={styles.legendBlue} /> Target</span>
        <span><span className={styles.legendYellow} /> Stop Loss</span>
        <span><span className={styles.legendLightBlue} /> SMA</span>
        <span><span style={{ display: "inline-block", width: 20, height: 3, backgroundColor: "#ec4899" }} /> EMA (50)</span>
        <span><span style={{ display: "inline-block", width: 20, height: 3, backgroundColor: "#10b981" }} /> EMA (200)</span>
        <span><span className={styles.legendPurple} /> Order Block</span>
      </div>
    </div>
  );
}

export const CandleChart = memo(CandleChartComponent);
