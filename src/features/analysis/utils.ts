import type { Exchange } from "./types";

export const formatNumber = (value: number, maxFractionDigits = 6) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);

export const getCoinsLimitLabel = (exchange: Exchange) =>
  exchange === "mexc" ? "first 2000" : "first 1000";
