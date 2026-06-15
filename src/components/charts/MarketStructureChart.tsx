"use client";

import { memo, useEffect, useRef } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  LineSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import styles from "@/app/page.module.css";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type MarketStructureChartProps = {
  candles: Candle[];
  symbol: string;
  support: number | null;
  resistance: number | null;
  entryZoneLow: number | null;
  entryZoneHigh: number | null;
};

function MarketStructureChartComponent({
  candles,
  symbol,
  support,
  resistance,
  entryZoneLow,
  entryZoneHigh,
}: MarketStructureChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {
        // Ignore disposed chart.
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
      height: 380,
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f97316",
      borderUpColor: "#22c55e",
      borderDownColor: "#f97316",
      wickUpColor: "#22c55e",
      wickDownColor: "#f97316",
    });
    candleSeries.setData(candles as CandlestickData<Time>[]);

    const startTime = candles[0].time;
    const endTime = candles[candles.length - 1].time;

    if (support !== null) {
      const supportSeries = chart.addSeries(LineSeries, { color: "#22c55e", lineWidth: 2, title: "Support" });
      supportSeries.setData([{ time: startTime, value: support }, { time: endTime, value: support }] as LineData<Time>[]);
    }

    if (resistance !== null) {
      const resistanceSeries = chart.addSeries(LineSeries, { color: "#f87171", lineWidth: 2, title: "Resistance" });
      resistanceSeries.setData([{ time: startTime, value: resistance }, { time: endTime, value: resistance }] as LineData<Time>[]);
    }

    if (entryZoneLow !== null && entryZoneHigh !== null) {
      const zoneMid = (entryZoneLow + entryZoneHigh) / 2;
      const entryZoneSeries = chart.addSeries(
        AreaSeries,
        {
          topColor: "rgba(59, 130, 246, 0.25)",
          bottomColor: "rgba(59, 130, 246, 0.05)",
          lineColor: "#3b82f6",
          lineWidth: 2,
          title: "Entry Zone",
        }
      );
      entryZoneSeries.setData([{ time: startTime, value: zoneMid }, { time: endTime, value: zoneMid }] as LineData<Time>[]);

      const lowBoundary = chart.addSeries(LineSeries, { color: "rgba(59,130,246,0.6)", lineWidth: 1 });
      lowBoundary.setData([{ time: startTime, value: entryZoneLow }, { time: endTime, value: entryZoneLow }] as LineData<Time>[]);

      const highBoundary = chart.addSeries(LineSeries, { color: "rgba(59,130,246,0.6)", lineWidth: 1 });
      highBoundary.setData([{ time: startTime, value: entryZoneHigh }, { time: endTime, value: entryZoneHigh }] as LineData<Time>[]);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const onResize = () => {
      if (!chartContainerRef.current) return;
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      try {
        chart.remove();
      } catch {
        // Ignore disposed chart.
      }
      chartRef.current = null;
    };
  }, [candles, support, resistance, entryZoneLow, entryZoneHigh]);

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{symbol} Market Structure</h3>
      <div ref={chartContainerRef} className={styles.chart} />
      <div className={styles.chartLegend}>
        <span><span className={styles.legendGreen} /> Support</span>
        <span><span className={styles.legendRed} /> Resistance</span>
        <span><span className={styles.legendBlue} /> Entry Zone</span>
      </div>
    </div>
  );
}

export const MarketStructureChart = memo(MarketStructureChartComponent);
